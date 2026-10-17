export interface PriceRange { min: number; max: number }

/** Zero-based controls use only comparable complete-party amounts for their maximum. */
export function priceRangeBounds(amountsRials: readonly number[]): PriceRange | null {
  let max = -Infinity;
  for (const amount of amountsRials) {
    if (!Number.isSafeInteger(amount) || amount < 0) continue;
    max = Math.max(max, amount);
  }
  return Number.isFinite(max) ? { min: 0, max } : null;
}

/** A native handle can reach the other handle but cannot cross it. Values stay integer rials. */
export function movePriceHandle(range: PriceRange, bounds: PriceRange, handle: "min" | "max", value: number): PriceRange {
  if (!Number.isSafeInteger(value) || value < 0) return range;
  const clamped = Math.min(bounds.max, Math.max(bounds.min, value));
  return handle === "min" ? { min: Math.min(clamped, range.max), max: range.max }
    : { min: range.min, max: Math.max(clamped, range.min) };
}

/** Full bounds mean no price constraint, so unknown prices are not silently filtered out. */
export function priceRangeFilters(range: PriceRange, bounds: PriceRange): { minPriceRials?: number; maxPriceRials?: number } {
  return {
    ...(range.min > bounds.min ? { minPriceRials: range.min } : {}),
    ...(range.max < bounds.max ? { maxPriceRials: range.max } : {}),
  };
}
