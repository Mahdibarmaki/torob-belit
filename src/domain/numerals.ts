const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Presentation only: numeric comparisons continue to use the original numbers. */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

/** Normalize both Persian and Arabic-Indic keyboard input at the input boundary. */
export function toLatinDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => String(
    digit >= "۰" ? digit.charCodeAt(0) - "۰".charCodeAt(0) : digit.charCodeAt(0) - "٠".charCodeAt(0),
  ));
}
