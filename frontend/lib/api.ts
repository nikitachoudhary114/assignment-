import { getSessionHeaders } from "./session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type Product = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  stock: number;
};

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
  lineTotalCents: number;
};

export type Cart = {
  id: string;
  sessionId: string;
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
};

export type AdminStats = {
  totalItemsPurchased: number;
  totalRevenueCents: number;
  totalDiscountCents: number;
  totalOrders: number;
  discountEveryNthOrder: number;
  discountPercentage: number;
  discountCodes: Array<{
    code: string;
    percentage: number;
    isUsed: boolean;
    usedAt: string | null;
    earnedByOrderNumber: number | null;
    createdAt: string;
  }>;
};

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const sessionHeaders = getSessionHeaders();
  Object.entries(sessionHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? data.message ?? "Request failed");
  }

  return data;
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export async function fetchProducts(): Promise<Product[]> {
  const data = await request<{ products: Product[] }>("/api/products");
  return data.products;
}

export async function fetchCart(): Promise<Cart> {
  const data = await request<{ cart: Cart }>("/api/cart");
  return data.cart;
}

export async function addToCart(productId: string, quantity = 1): Promise<Cart> {
  const data = await request<{ cart: Cart }>("/api/cart/items", {
    method: "POST",
    body: JSON.stringify({ productId, quantity }),
  });
  return data.cart;
}

export async function updateCartItem(
  productId: string,
  quantity: number
): Promise<Cart> {
  const data = await request<{ cart: Cart }>(
    `/api/cart/items/${productId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    }
  );
  return data.cart;
}

export async function removeFromCart(productId: string): Promise<Cart> {
  const data = await request<{ cart: Cart }>(
    `/api/cart/items/${productId}`,
    { method: "DELETE" }
  );
  return data.cart;
}

export async function validateDiscount(code: string) {
  return request<{ valid: boolean; code?: string; percentage?: number; message?: string }>(
    "/api/discount/validate",
    {
      method: "POST",
      body: JSON.stringify({ code }),
    }
  );
}

export async function checkout(discountCode?: string) {
  return request<{
    order: {
      id: string;
      orderNumber: number;
      subtotalCents: number;
      discountCents: number;
      totalCents: number;
      items: Array<{
        productId: string;
        name: string;
        quantity: number;
        priceCents: number;
      }>;
      createdAt: string;
    };
    earnedDiscountCode: string | null;
  }>("/api/checkout", {
    method: "POST",
    body: JSON.stringify({ discountCode: discountCode || undefined }),
  });
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const data = await request<{ stats: AdminStats }>("/api/admin/stats");
  return data.stats;
}

export async function generateDiscount() {
  return request<{
    generated: boolean;
    message: string;
    orderCount: number;
    code?: string;
    percentage?: number;
  }>("/api/admin/discount/generate", { method: "POST" });
}
