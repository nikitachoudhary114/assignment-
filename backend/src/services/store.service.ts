import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import {
  calculateDiscount,
  generateDiscountCode,
  shouldEarnDiscount,
} from "./discount.logic.js";

export class CartError extends Error {
  constructor(
    message: string,
    public statusCode = 400
  ) {
    super(message);
    this.name = "CartError";
  }
}

export class CheckoutError extends Error {
  constructor(
    message: string,
    public statusCode = 400
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

async function getOrCreateCart(sessionId: string) {
  return prisma.cart.upsert({
    where: { sessionId },
    create: { sessionId },
    update: {},
    include: {
      items: {
        include: { product: true },
        orderBy: { product: { name: "asc" } },
      },
    },
  });
}

export async function getCart(sessionId: string) {
  const cart = await getOrCreateCart(sessionId);
  const subtotalCents = cart.items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0
  );

  return {
    id: cart.id,
    sessionId: cart.sessionId,
    items: cart.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      priceCents: item.product.priceCents,
      quantity: item.quantity,
      lineTotalCents: item.product.priceCents * item.quantity,
    })),
    itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalCents,
  };
}

export async function addToCart(
  sessionId: string,
  productId: string,
  quantity: number
) {
  if (quantity <= 0) {
    throw new CartError("Quantity must be greater than zero.");
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new CartError("Product not found.", 404);
  }

  const cart = await getOrCreateCart(sessionId);
  const existing = cart.items.find((item) => item.productId === productId);
  const newQuantity = (existing?.quantity ?? 0) + quantity;

  if (newQuantity > product.stock) {
    throw new CartError(`Only ${product.stock} units available in stock.`);
  }

  await prisma.cartItem.upsert({
    where: {
      cartId_productId: { cartId: cart.id, productId },
    },
    create: { cartId: cart.id, productId, quantity },
    update: { quantity: newQuantity },
  });

  return getCart(sessionId);
}

export async function updateCartItem(
  sessionId: string,
  productId: string,
  quantity: number
) {
  const cart = await getOrCreateCart(sessionId);
  const existing = cart.items.find((item) => item.productId === productId);

  if (!existing) {
    throw new CartError("Item not in cart.", 404);
  }

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: existing.id } });
    return getCart(sessionId);
  }

  if (quantity > existing.product.stock) {
    throw new CartError(
      `Only ${existing.product.stock} units available in stock.`
    );
  }

  await prisma.cartItem.update({
    where: { id: existing.id },
    data: { quantity },
  });

  return getCart(sessionId);
}

export async function removeFromCart(sessionId: string, productId: string) {
  const cart = await getOrCreateCart(sessionId);
  const existing = cart.items.find((item) => item.productId === productId);

  if (!existing) {
    throw new CartError("Item not in cart.", 404);
  }

  await prisma.cartItem.delete({ where: { id: existing.id } });
  return getCart(sessionId);
}

export async function checkout(
  sessionId: string,
  discountCode?: string
) {
  const cart = await getOrCreateCart(sessionId);

  if (cart.items.length === 0) {
    throw new CheckoutError("Cart is empty.");
  }

  for (const item of cart.items) {
    if (item.quantity > item.product.stock) {
      throw new CheckoutError(
        `Insufficient stock for ${item.product.name}. Available: ${item.product.stock}.`
      );
    }
  }

  const subtotalCents = cart.items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0
  );

  let discountRecord = null;
  let discountCents = 0;

  if (discountCode) {
    discountRecord = await prisma.discountCode.findUnique({
      where: { code: discountCode.toUpperCase() },
    });

    if (!discountRecord) {
      throw new CheckoutError("Invalid discount code.");
    }
    if (discountRecord.isUsed) {
      throw new CheckoutError("Discount code has already been used.");
    }

    const result = calculateDiscount(
      subtotalCents,
      discountRecord.percentage
    );
    discountCents = result.discountCents;
  }

  const totalCents = subtotalCents - discountCents;
  const itemsPurchased = cart.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const order = await prisma.$transaction(async (tx) => {
    for (const item of cart.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    const createdOrder = await tx.order.create({
      data: {
        subtotalCents,
        discountCents,
        totalCents,
        discountCodeId: discountRecord?.id,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            priceCents: item.product.priceCents,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    if (discountRecord) {
      await tx.discountCode.update({
        where: { id: discountRecord.id },
        data: { isUsed: true, usedAt: new Date() },
      });
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    await tx.storeStats.update({
      where: { id: 1 },
      data: {
        totalItemsPurchased: { increment: itemsPurchased },
        totalRevenueCents: { increment: totalCents },
        totalDiscountCents: { increment: discountCents },
      },
    });

    return createdOrder;
  });

  let earnedDiscountCode: string | null = null;

  if (
    shouldEarnDiscount(order.orderNumber, config.DISCOUNT_EVERY_NTH_ORDER)
  ) {
    earnedDiscountCode = await createDiscountForOrder(order.id);
  }

  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      subtotalCents: order.subtotalCents,
      discountCents: order.discountCents,
      totalCents: order.totalCents,
      items: order.items.map((item) => ({
        productId: item.productId,
        name: item.product.name,
        quantity: item.quantity,
        priceCents: item.priceCents,
      })),
      createdAt: order.createdAt,
    },
    earnedDiscountCode,
  };
}

async function createDiscountForOrder(orderId: string): Promise<string> {
  let code = generateDiscountCode();
  let attempts = 0;

  while (attempts < 5) {
    const existing = await prisma.discountCode.findUnique({ where: { code } });
    if (!existing) break;
    code = generateDiscountCode();
    attempts++;
  }

  const discount = await prisma.discountCode.create({
    data: {
      code,
      percentage: config.DISCOUNT_PERCENTAGE,
      earnedByOrderId: orderId,
    },
  });

  return discount.code;
}

export async function listProducts() {
  return prisma.product.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      stock: true,
    },
  });
}

export async function generateDiscountIfEligible() {
  const orderCount = await prisma.order.count();

  if (!shouldEarnDiscount(orderCount, config.DISCOUNT_EVERY_NTH_ORDER)) {
    return {
      generated: false,
      message: `No discount earned yet. Discounts are issued every ${config.DISCOUNT_EVERY_NTH_ORDER} orders. Current count: ${orderCount}.`,
      orderCount,
    };
  }

  const latestOrder = await prisma.order.findFirst({
    orderBy: { orderNumber: "desc" },
  });

  if (!latestOrder) {
    return {
      generated: false,
      message: "No orders exist yet.",
      orderCount: 0,
    };
  }

  const existing = await prisma.discountCode.findUnique({
    where: { earnedByOrderId: latestOrder.id },
  });

  if (existing) {
    return {
      generated: false,
      message: "Discount code already generated for the latest qualifying order.",
      orderCount,
      code: existing.code,
    };
  }

  const code = await createDiscountForOrder(latestOrder.id);

  return {
    generated: true,
    message: `Discount code generated for order #${latestOrder.orderNumber}.`,
    orderCount,
    code,
    percentage: config.DISCOUNT_PERCENTAGE,
  };
}

export async function getAdminStats() {
  const [stats, discountCodes, orderCount] = await Promise.all([
    prisma.storeStats.findUnique({ where: { id: 1 } }),
    prisma.discountCode.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        earnedByOrder: { select: { orderNumber: true } },
      },
    }),
    prisma.order.count(),
  ]);

  return {
    totalItemsPurchased: stats?.totalItemsPurchased ?? 0,
    totalRevenueCents: stats?.totalRevenueCents ?? 0,
    totalDiscountCents: stats?.totalDiscountCents ?? 0,
    totalOrders: orderCount,
    discountEveryNthOrder: config.DISCOUNT_EVERY_NTH_ORDER,
    discountPercentage: config.DISCOUNT_PERCENTAGE,
    discountCodes: discountCodes.map((dc) => ({
      code: dc.code,
      percentage: dc.percentage,
      isUsed: dc.isUsed,
      usedAt: dc.usedAt,
      earnedByOrderNumber: dc.earnedByOrder?.orderNumber ?? null,
      createdAt: dc.createdAt,
    })),
  };
}

export async function validateDiscountCode(code: string) {
  const discount = await prisma.discountCode.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!discount) {
    return { valid: false, message: "Invalid discount code." };
  }
  if (discount.isUsed) {
    return { valid: false, message: "Discount code has already been used." };
  }

  return {
    valid: true,
    code: discount.code,
    percentage: discount.percentage,
  };
}
