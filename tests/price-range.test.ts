import { describe, expect, it } from "vitest";
import { movePriceHandle, priceRangeBounds, priceRangeFilters } from "../src/domain/price-range";
import { formatToman } from "../src/domain/money";

describe("canonical price-range controls", () => {
  it("derives stable numeric bounds, including zero and a remaining rial", () => {
    expect(priceRangeBounds([20_000_001, 0, 9_000_000, 1_000_001])).toEqual({ min: 0, max: 20_000_001 });
    expect(formatToman({ currency: "IRR", unit: "rial", amountRials: 20_000_001 })).toBe("۲٬۰۰۰٬۰۰۰٫۱ تومان");
  });
  it("starts at zero even when every flight has a positive price", () => {
    expect(priceRangeBounds([20_000_001, 9_000_000, 1_000_001])).toEqual({ min: 0, max: 20_000_001 });
    expect(priceRangeBounds([1_000_001, 9_000_000, 20_000_001])).toEqual({ min: 0, max: 20_000_001 });
  });
  it("keeps missing prices missing and handles empty, single and equal-price searches", () => {
    expect(priceRangeBounds([])).toBeNull();
    expect(priceRangeBounds([NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])).toBeNull();
    expect(priceRangeBounds([10_000_000])).toEqual({ min: 0, max: 10_000_000 });
    expect(priceRangeBounds([10_000_000, 10_000_000])).toEqual({ min: 0, max: 10_000_000 });
    expect(priceRangeBounds([0, 0])).toEqual({ min: 0, max: 0 });
    expect(priceRangeBounds([NaN, -1, 10_000_001, Infinity])).toEqual({ min: 0, max: 10_000_001 });
  });
  it("keeps identical positive prices adjustable and permits the lower handle to return to zero", () => {
    const bounds = priceRangeBounds([10_000_001, 10_000_001])!;
    expect(bounds.max).toBeGreaterThan(bounds.min);
    const narrower = movePriceHandle(bounds, bounds, "min", 8_000_001);
    expect(narrower).toEqual({ min: 8_000_001, max: 10_000_001 });
    expect(movePriceHandle(narrower, bounds, "min", 0)).toEqual(bounds);
    expect(priceRangeFilters(bounds, bounds)).toEqual({});
  });
  it("retains exact canonical integer rials across the supported safe range", () => {
    expect(priceRangeBounds([0, Number.MAX_SAFE_INTEGER])).toEqual({ min: 0, max: Number.MAX_SAFE_INTEGER });
    expect(formatToman({ currency: "IRR", unit: "rial", amountRials: Number.MAX_SAFE_INTEGER })).toBe("۹۰۰٬۷۱۹٬۹۲۵٬۴۷۴٬۰۹۹٫۱ تومان");
  });
  it("allows an inclusive equal boundary without letting either handle cross", () => {
    const bounds = { min: 10, max: 100 };
    const range = { min: 20, max: 80 };
    expect(movePriceHandle(range, bounds, "min", 99)).toEqual({ min: 80, max: 80 });
    expect(movePriceHandle(range, bounds, "max", 11)).toEqual({ min: 20, max: 20 });
    expect(movePriceHandle(range, bounds, "min", 0)).toEqual({ min: 10, max: 80 });
    expect(movePriceHandle(range, bounds, "max", 101)).toEqual({ min: 20, max: 100 });
    expect(movePriceHandle(range, bounds, "min", 30.5)).toEqual(range);
  });
  it("omits full-range constraints so reset includes unknown-price records", () => {
    const bounds = { min: 0, max: 500 };
    expect(priceRangeFilters(bounds, bounds)).toEqual({});
    expect(priceRangeFilters({ min: 101, max: 499 }, bounds)).toEqual({ minPriceRials: 101, maxPriceRials: 499 });
    expect(priceRangeFilters({ min: 0, max: 499 }, bounds)).toEqual({ maxPriceRials: 499 });
    expect(priceRangeFilters({ min: 101, max: 500 }, bounds)).toEqual({ minPriceRials: 101 });
    expect(priceRangeFilters({ min: 0, max: 0 }, { min: 0, max: 0 })).toEqual({});
  });
});
