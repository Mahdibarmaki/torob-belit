import type { Money } from "./models";
import { toLatinDigits, toPersianDigits } from "./numerals";

const MAX_RIALS = BigInt(Number.MAX_SAFE_INTEGER);
const integerFormatter = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });

function validRials(amountRials: number): void {
  if (!Number.isSafeInteger(amountRials) || amountRials < 0) {
    throw new RangeError("Rial amounts must be nonnegative safe integers.");
  }
}

/** Parse a decimal string without floating-point multiplication or silent rounding. */
function decimalTomanToRials(decimal: string): number {
  if (!/^\d+(?:\.\d)?$/.test(decimal)) {
    throw new RangeError("Toman amounts must be nonnegative with at most one decimal digit.");
  }
  const [whole, fraction = "0"] = decimal.split(".");
  const rials = BigInt(whole) * 10n + BigInt(fraction);
  if (rials > MAX_RIALS) throw new RangeError("The toman amount exceeds the safe rial range.");
  return Number(rials);
}

/** Provider/form boundary conversion. Rejects fractional rials rather than rounding them. */
export function tomanToRials(amount: number): number {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
    throw new RangeError("Toman amounts must be finite and nonnegative.");
  }
  return decimalTomanToRials(String(amount));
}

/** Numeric convenience only; use formatToman for lossless display across the full safe range. */
export function rialsToToman(amountRials: number): number {
  validRials(amountRials);
  return amountRials / 10;
}

/** Normalize an explicitly tagged external amount once; canonical Money is never reinterpreted. */
export function toRialMoney(input: { unit: "rial" | "toman"; amount: number }): Money {
  if (typeof input !== "object" || input === null) throw new TypeError("A tagged monetary amount is required.");
  let amountRials: number;
  if (input.unit === "rial") {
    validRials(input.amount);
    amountRials = input.amount;
  } else if (input.unit === "toman") {
    amountRials = tomanToRials(input.amount);
  } else {
    throw new TypeError("A supported monetary unit is required.");
  }
  return { currency: "IRR", unit: "rial", amountRials };
}

/** Persian grouped toman display, retaining a single rial as one tenth of a toman. */
export function formatToman(money: Money): string {
  if (money.currency !== "IRR" || money.unit !== "rial") {
    throw new TypeError("Only normalized Iranian rial Money can be formatted as toman.");
  }
  validRials(money.amountRials);
  const rials = BigInt(money.amountRials);
  const remainder = rials % 10n;
  const whole = integerFormatter.format(rials / 10n);
  const fraction = remainder === 0n ? "" : `٫${toPersianDigits(remainder.toString())}`;
  return `${whole}${fraction} تومان`;
}

/** A user-entered toman budget becomes integer rials once, before API submission. */
export function parseTomanInput(text: string): number | undefined {
  const normalized = toLatinDigits(text).trim();
  if (normalized === "") return undefined;
  // Thousands separators must delimit complete groups; fractional precision is one rial.
  if (!/^(?:\d+|\d{1,3}(?:[٬,\s]\d{3})+)(?:[.٫]\d)?$/u.test(normalized)) {
    throw new RangeError("سقف قیمت را به تومان، با حداکثر یک رقم اعشار وارد کنید.");
  }
  try {
    return decimalTomanToRials(normalized.replace(/[٬,\s]/gu, "").replace("٫", "."));
  } catch {
    throw new RangeError("سقف قیمت به تومان از محدوده مجاز بزرگ‌تر است.");
  }
}
