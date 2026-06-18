/**
 * Pure discount calculations — kept separate from DB for easy unit testing.
 */

export function shouldEarnDiscount(
  completedOrderCount: number,
  everyNthOrder: number
): boolean {
  if (everyNthOrder <= 0) return false;
  return completedOrderCount > 0 && completedOrderCount % everyNthOrder === 0;
}

export function calculateDiscount(
  subtotalCents: number,
  percentage: number
): { discountCents: number; totalCents: number } {
  const safePercentage = Math.min(100, Math.max(0, percentage));
  const discountCents = Math.round((subtotalCents * safePercentage) / 100);
  const totalCents = Math.max(0, subtotalCents - discountCents);
  return { discountCents, totalCents };
}

export function generateDiscountCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "SAVE";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
