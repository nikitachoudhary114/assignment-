import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const products = [
  {
    name: "Wireless Headphones",
    description: "Noise-cancelling over-ear headphones with 30h battery.",
    priceCents: 7999,
    stock: 50,
  },
  {
    name: "Mechanical Keyboard",
    description: "Compact 75% layout with hot-swappable switches.",
    priceCents: 12999,
    stock: 40,
  },
  {
    name: "USB-C Hub",
    description: "7-in-1 adapter with HDMI, SD card, and 100W PD.",
    priceCents: 4999,
    stock: 80,
  },
  {
    name: "Ergonomic Mouse",
    description: "Vertical mouse designed to reduce wrist strain.",
    priceCents: 3499,
    stock: 60,
  },
  {
    name: "Monitor Stand",
    description: "Aluminum stand with cable management and adjustable height.",
    priceCents: 5999,
    stock: 35,
  },
];

async function main() {
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.discountCode.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.storeStats.deleteMany();

  await prisma.product.createMany({ data: products });
  await prisma.storeStats.create({ data: {} });

  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
