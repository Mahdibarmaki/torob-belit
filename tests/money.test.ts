import { describe, expect, it } from "vitest";
import type { Money } from "../src/domain/models";
import { formatToman, parseTomanInput, rialsToToman, tomanToRials, toRialMoney } from "../src/domain/money";

describe("explicit Iranian monetary units", () => {
  it("normalizes separately tagged rial and toman provider amounts to the same value", () => {
    const fromRials = toRialMoney({ unit: "rial", amount: 58_250_000 });
    const fromToman = toRialMoney({ unit: "toman", amount: 5_825_000 });
    expect(fromRials).toEqual({ currency: "IRR", unit: "rial", amountRials: 58_250_000 });
    expect(fromToman).toEqual(fromRials);
    expect(formatToman(fromToman)).toBe("۵٬۸۲۵٬۰۰۰ تومان");
    expect(formatToman(fromRials)).toBe(formatToman(fromToman));
    // Formatting is a pure presentation operation, not an in-place second conversion.
    expect(fromRials.amountRials).toBe(58_250_000);
    expect(formatToman(fromRials)).toBe("۵٬۸۲۵٬۰۰۰ تومان");
  });

  it("rejects an untagged, unsupported, or already normalized amount at the adapter boundary", () => {
    const canonical = toRialMoney({ unit: "toman", amount: 1_000 });
    const invalid: unknown[] = [canonical, { amount: 1_000 }, { unit: "USD", amount: 1_000 }, null];
    for (const amount of invalid) {
      expect(() => toRialMoney(amount as Parameters<typeof toRialMoney>[0])).toThrow();
    }
  });

  it.each([0, 1, 9, 10, 58_250_001, Number.MAX_SAFE_INTEGER])("leaves canonical %s rials unchanged", (rials) => {
    expect(toRialMoney({ unit: "rial", amount: rials }).amountRials).toBe(rials);
    expect(rialsToToman(rials)).toBe(rials / 10);
  });

  it.each([-1, 0.1, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])("rejects invalid canonical rial amount %s", (amount) => {
    expect(() => toRialMoney({ unit: "rial", amount })).toThrow(RangeError);
    expect(() => rialsToToman(amount)).toThrow(RangeError);
    expect(() => formatToman({ currency: "IRR", unit: "rial", amountRials: amount })).toThrow(RangeError);
  });

  it.each([
    [0, 0], [0.1, 1], [1.1, 11], [5_825_000, 58_250_000], [900_719_925_474_099.1, Number.MAX_SAFE_INTEGER],
  ])("converts %s toman to %s integer rials without multiplication drift", (toman, rials) => {
    expect(tomanToRials(toman)).toBe(rials);
  });

  it.each([-1, 0.01, 0.30000000000000004, 1e-7, Number.NaN, Number.POSITIVE_INFINITY, 900_719_925_474_099.2])("rejects unsafe or fractional-rial toman input %s", (amount) => {
    expect(() => tomanToRials(amount)).toThrow(RangeError);
  });
});

describe("Persian toman formatting", () => {
  it.each([
    [0, "۰ تومان"],
    [1, "۰٫۱ تومان"],
    [9, "۰٫۹ تومان"],
    [10, "۱ تومان"],
    [12_345, "۱٬۲۳۴٫۵ تومان"],
    [58_250_000, "۵٬۸۲۵٬۰۰۰ تومان"],
    [Number.MAX_SAFE_INTEGER, "۹۰۰٬۷۱۹٬۹۲۵٬۴۷۴٬۰۹۹٫۱ تومان"],
  ])("displays %s rials without rounding away a remainder", (amountRials, expected) => {
    expect(formatToman({ currency: "IRR", unit: "rial", amountRials })).toBe(expected);
  });

  it("rejects foreign currencies and incorrectly tagged toman values rather than guessing", () => {
    const invalid: unknown[] = [
      { currency: "USD", unit: "rial", amountRials: 1_000 },
      { currency: "IRR", unit: "toman", amountRials: 1_000 },
      { currency: "IRR", amountRials: 1_000 },
    ];
    invalid.forEach((money) => expect(() => formatToman(money as Money)).toThrow(TypeError));
  });
});

describe("toman budget input", () => {
  it("keeps an oversized user budget error in Persian toman terminology", () => {
    expect(() => parseTomanInput("۹۰۰٬۷۱۹٬۹۲۵٬۴۷۴٬۰۹۹٫۲"))
      .toThrow("سقف قیمت به تومان از محدوده مجاز بزرگ‌تر است.");
  });
  it.each([
    ["۵٬۸۲۵٬۰۰۰", 58_250_000],
    ["٥٬٨٢٥٬٠٠٠", 58_250_000],
    ["5,825,000", 58_250_000],
    ["5 825 000", 58_250_000],
    ["  ۵۸۲۵۰۰۰  ", 58_250_000],
    ["۰٫۱", 1],
    ["1,234.5", 12_345],
    ["۹۰۰٬۷۱۹٬۹۲۵٬۴۷۴٬۰۹۹٫۱", Number.MAX_SAFE_INTEGER],
  ])("parses %s into %s numeric rials exactly once", (input, expected) => {
    expect(parseTomanInput(input)).toBe(expected);
  });

  it.each(["", " ", "\t\n"])("treats blank %j as no budget", (input) => {
    expect(parseTomanInput(input)).toBeUndefined();
  });

  it.each(["-1", "۱٫۲۳", "NaN", "Infinity", "1e6", "1,23", "1,,000", "۱ تومان", ".1", "1.", "۹۰۰٬۷۱۹٬۹۲۵٬۴۷۴٬۰۹۹٫۲"])("rejects invalid or unsafe budget %s", (input) => {
    expect(() => parseTomanInput(input)).toThrow(RangeError);
  });
});
