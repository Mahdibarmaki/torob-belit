import type { Money } from "./models";
import { formatToman } from "./money";

/** Unknown units stay unpriced; never invent zero, assume rials or apply a guessed conversion. */
export function formatOfferPrice(price: Money | null): string {
  return price === null ? "واحد مبلغ تأیید نشده" : formatToman(price);
}
