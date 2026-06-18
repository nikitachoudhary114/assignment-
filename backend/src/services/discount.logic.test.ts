import { describe, expect, it } from "vitest";
import {
  calculateDiscount,
  shouldEarnDiscount,
} from "./discount.logic.js";

describe("shouldEarnDiscount", () => {
  it("returns true when order count is a multiple of nth", () => {
    expect(shouldEarnDiscount(3, 3)).toBe(true);
    expect(shouldEarnDiscount(6, 3)).toBe(true);
  });

  it("returns false when order count is not a multiple of nth", () => {
    expect(shouldEarnDiscount(1, 3)).toBe(false);
    expect(shouldEarnDiscount(2, 3)).toBe(false);
    expect(shouldEarnDiscount(4, 3)).toBe(false);
  });

  it("returns false for zero orders or invalid nth", () => {
    expect(shouldEarnDiscount(0, 3)).toBe(false);
    expect(shouldEarnDiscount(3, 0)).toBe(false);
    expect(shouldEarnDiscount(3, -1)).toBe(false);
  });
});

describe("calculateDiscount", () => {
  it("applies percentage discount correctly", () => {
    expect(calculateDiscount(10000, 10)).toEqual({
      discountCents: 1000,
      totalCents: 9000,
    });
  });

  it("rounds discount to nearest cent", () => {
    expect(calculateDiscount(999, 10)).toEqual({
      discountCents: 100,
      totalCents: 899,
    });
  });

  it("caps percentage at 100%", () => {
    expect(calculateDiscount(5000, 150)).toEqual({
      discountCents: 5000,
      totalCents: 0,
    });
  });

  it("treats negative percentage as zero discount", () => {
    expect(calculateDiscount(5000, -5)).toEqual({
      discountCents: 0,
      totalCents: 5000,
    });
  });
});
