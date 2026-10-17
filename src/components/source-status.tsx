import type { ProviderStatus } from "@/domain/provider";
import { formatJalaliInstant } from "@/domain/jalali";
import { Badge, Card } from "./ui";

const labels: Record<ProviderStatus["status"], string> = {
  live: "دریافت مستقیم", cached: "ذخیره‌شده", fixture: "پاسخ مرجع دمو", timeout: "پایان مهلت", error: "خطای دریافت",
  "rate-limited": "محدودیت منبع", "awaiting-agreement": "در انتظار توافق", "awaiting-credentials": "در انتظار اعتبارنامه", unverified: "دسترسی تأیید نشده",
};

export function SourceStatus({ providers }: { providers: ProviderStatus[] }) {
  return <section className="source-status stack" aria-label="وضعیت منابع داده">
    <h2 className="filter-title">وضعیت منابع داده</h2>
    <p className="small-text muted">فقط اتصال مجاز می‌تواند نتیجهٔ مستقیم ارائه کند؛ فایل محلی و حافظهٔ ذخیره‌شده، داده زنده نیستند.</p>
    <div className="source-status-grid">{providers.map((provider) => <Card key={provider.id} data-source-state={provider.sourceState}>
      <div className="stack"><div className="row spread"><strong>{provider.name}</strong><Badge>{labels[provider.status]}</Badge></div>
      <p className="small-text muted">{provider.message}</p>
      <p className="small-text">{provider.sourceState === "FIXTURE" ? <>ثبت اولیه نامعلوم · ورود به دموی محلی: {provider.fetchedAt ? formatJalaliInstant(provider.fetchedAt, "Asia/Tehran") : "نامشخص"} به وقت تهران · {provider.cache === "hit" ? "حافظه محلی" : "فایل محلی"}</> : <>آخرین دریافت موفق: {provider.lastSuccessfulAt ? formatJalaliInstant(provider.lastSuccessfulAt, "Asia/Tehran") + " به وقت تهران" : "هنوز دریافت موفقی ثبت نشده"}</>}</p>
      {provider.missingRequirements.length > 0 && <details className="flight-disclosure"><summary>نیازمندی‌های اتصال</summary><ul>{provider.missingRequirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul></details>}</div>
    </Card>)}</div>
  </section>;
}
