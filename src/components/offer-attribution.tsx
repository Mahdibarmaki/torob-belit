import { Info } from "lucide-react";
import type { DisplaySellerOffer } from "@/application/reference-search";
import { formatJalaliInstant } from "@/domain/jalali";
import { Icon } from "./ui";

export function OfferAttribution({ offer }: { offer: DisplaySellerOffer }) {
  if ("priceEvidence" in offer) return <details className="source-disclosure small-text muted">
    <summary><Icon icon={Info} size={14} />پاسخ مرجع آفلاین</summary>
    <div className="stack">
      <p>منبع: {offer.source.label}؛ داده زنده نیست.</p>
      <p>مقدار خام priceAdult برای هر بزرگسال: {new Intl.NumberFormat("fa-IR").format(offer.priceEvidence.rawAmount)}؛ واحد تأیید نشده و قیمت قابل مقایسه نیست.</p>
      <p>بار خام: {offer.baggageRaw === null ? "نامشخص" : typeof offer.baggageRaw === "number" ? new Intl.NumberFormat("fa-IR").format(offer.baggageRaw) : offer.baggageRaw}؛ واحد بار تأیید نشده.</p>
      <p>ثبت اولیه: نامعلوم. ورود به دموی محلی: {offer.fetchedAt ? formatJalaliInstant(offer.fetchedAt, "Asia/Tehran") : "نامشخص"} به وقت تهران.</p>
    </div>
  </details>;
  // Authored demo offers share the results' visible demo label and purchase/history disclosures.
  // Imported reference and future live/cache offers retain individual attribution.
  if (offer.source.mode === "demo") return null;
  return <details className="source-disclosure small-text muted">
    <summary><Icon icon={Info} size={14} />{offer.providerName ?? offer.source.label} · {offer.freshness === "cached" ? "ذخیره‌شده" : "دریافت مستقیم"}</summary>
    <div className="stack">
      <p>{offer.freshness === "cached" ? "پاسخ ذخیره‌شده؛ داده زنده نیست." : "دریافت مستقیم از منبع مجاز."}</p>
      <p>زمان دریافت: {offer.fetchedAt ? `${formatJalaliInstant(offer.fetchedAt, "Asia/Tehran")} به وقت تهران` : "نامشخص"}</p>
      <p>قیمت و ظرفیت نهایی نزد فروشنده بررسی می‌شود.</p>
    </div>
  </details>;
}
