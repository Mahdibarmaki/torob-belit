import type { IntentConflict } from "@/domain/assistant-intent";
import { AIRPORTS } from "@/data/airports";
import { IRANIAN_AIRLINES } from "@/data/airlines";
import { formatJalaliDate } from "@/domain/jalali";
import { formatToman } from "@/domain/money";
import { toPersianDigits } from "@/domain/numerals";
import { Button } from "../ui";
import styles from "./assistant.module.css";

const labels: Record<string, string> = { origin: "مبدأ", destination: "مقصد", departureDate: "تاریخ رفت", returnDate: "تاریخ برگشت", tripType: "نوع سفر", "passengers.adults": "بزرگسالان", "passengers.children": "کودکان", "passengers.infants": "نوزادان", "hard.maxTotalPriceRials": "بودجه کل", "hard.minimumCheckedKg": "حداقل بار", "hard.nonstopOnly": "الزام بدون توقف", "hard.refundableOnly": "الزام استرداد", "hard.airlineIds": "ایرلاین الزامی", "hard.departurePeriod": "ساعت الزامی", "hard.riskCategories": "سابقه لغو الزامی", "soft.priorities": "اولویت‌ها", "soft.departurePeriod": "ساعت ترجیحی", "soft.preferredAirlineIds": "ایرلاین ترجیحی" };
const values: Record<string, string> = { "one-way": "یک‌طرفه", "round-trip": "رفت‌وبرگشت", any: "بدون ترجیح", morning: "صبح", afternoon: "بعدازظهر", evening: "عصر و شب", low: "کم", medium: "متوسط", high: "زیاد", price: "قیمت کمتر", history: "سابقه لغو کمتر", departure: "ساعت مناسب", duration: "مدت کوتاه‌تر", stops: "توقف کمتر", baggage: "بار بیشتر", refundability: "استرداد", airline: "ایرلاین ترجیحی" };
function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return "تعیین نشده";
  if (field === "hard.maxTotalPriceRials" && typeof value === "number") return formatToman({ amountRials: value, currency: "IRR", unit: "rial" });
  if ((field === "departureDate" || field === "returnDate") && typeof value === "string") return formatJalaliDate(value);
  if ((field === "origin" || field === "destination") && typeof value === "string") return AIRPORTS.find((airport) => airport.code === value)?.city ?? value;
  if (Array.isArray(value)) return value.length ? value.map((item) => IRANIAN_AIRLINES.find((airline) => airline.id === item)?.name ?? values[String(item)] ?? String(item)).join("، ") : "بدون محدودیت";
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  return values[String(value)] ?? toPersianDigits(String(value));
}

export function IntentChanges({ conflicts, onConfirm, onReject }: { conflicts: IntentConflict[]; onConfirm: () => void; onReject: () => void }) {
  return <section className={styles.notice} aria-label="تأیید تغییر انتخاب‌های قبلی"><p>این موارد قبلاً به‌صورت صریح انتخاب شده‌اند. تغییرشان را تأیید می‌کنید؟</p><ul className={styles.reasonList}>{conflicts.map((conflict) => <li key={conflict.field}><strong>{labels[conflict.field] ?? "انتخاب سفر"}:</strong> {formatValue(conflict.field, conflict.current)} ← {formatValue(conflict.field, conflict.proposed)}</li>)}</ul><div className="row"><Button variant="outline" onClick={onConfirm}>تأیید تغییرات پیشنهادی</Button><Button variant="text" onClick={onReject}>حفظ انتخاب‌های قبلی</Button></div></section>;
}
