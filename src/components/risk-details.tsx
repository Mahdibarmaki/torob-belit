"use client";

import type { CancellationHistory, Flight, HistoricalRiskCategory, UnknownHistoryReason } from "@/domain/models";
import { formatJalaliDate, formatJalaliInstant } from "@/domain/jalali";
import { CalendarDays, Info } from "lucide-react";
import { Dialog, Icon } from "./ui";

const numbers = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });

export const RISK_LABELS: Record<HistoricalRiskCategory, string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
  unknown: "داده ناکافی",
};

const REASON_LABELS: Record<UnknownHistoryReason, string> = {
  "unverified-roster": "فهرست کامل پروازهای برنامه‌ریزی‌شده تأیید نشده است.",
  "no-expected-operations": "پرواز برنامه‌ریزی‌شده‌ای در بازه ثبت نشده است.",
  "no-known-outcomes": "نتیجهٔ معتبر و قطعی ثبت نشده است.",
  "insufficient-sample": "کمتر از ۱۰ مشاهدهٔ معتبر وجود دارد.",
  "low-coverage": "پوشش نتایج معتبر کمتر از ۸۰٪ است.",
  "invalid-matching-data": "تطبیق یا سازگاری سوابق تأیید نشده است.",
  "history-unavailable": "سوابق در دسترس نیست.",
};

function count(value: number | null) {
  return value === null ? "نامشخص" : numbers.format(value);
}

export function historyPercent(value: number | null) {
  return value === null ? "—" : `${numbers.format(value * 100)}٪`;
}

function HistoryEvidence({ history, leg }: { history: CancellationHistory; leg: number }) {
  const unavailable = history.reasons.includes("history-unavailable");
  return (
    <section className="history-evidence stack" aria-label={`سوابق بخش ${numbers.format(leg)}`}>
      <div className="row spread">
        <h3>بخش {numbers.format(leg)}: <bdi>{history.identity.origin} → {history.identity.destination}</bdi></h3>
        <span className={`risk-indicator risk-${history.category}`}>
          <span className="risk-dot" aria-hidden="true" />
          {RISK_LABELS[history.category]} · {historyPercent(history.cancellationRate)}
        </span>
      </div>
      <p className="small-text muted">پرواز <bdi>{history.identity.flightNumber}</bdi> · تطبیق دقیق ایرلاین، شماره، مبدأ و مقصد</p>
      <dl className="definition-list">
        <dt>پروازهای برنامه‌ریزی‌شده</dt><dd>{count(history.expectedCount)}</dd>
        <dt>مشاهدات معتبر</dt><dd>{unavailable ? "نامشخص" : count(history.knownCount)}</dd>
        <dt>پروازهای لغوشده</dt><dd>{unavailable ? "نامشخص" : count(history.cancelledCount)}</dd>
        <dt>پروازهای انجام‌شده</dt><dd>{unavailable ? "نامشخص" : count(history.operatedCount)}</dd>
        <dt>پوشش سوابق معتبر</dt><dd>{historyPercent(history.coverage)}</dd>
        <dt>نرخ تاریخی لغو</dt><dd>{historyPercent(history.cancellationRate)}</dd>
      </dl>
      <details className="source-disclosure small-text muted">
        <summary><Icon icon={Info} size={14} />جزئیات کیفیت سوابق</summary>
        <dl className="definition-list">
          <dt>حل‌نشده؛ خارج از مخرج</dt><dd>{unavailable ? "نامشخص" : count(history.unknownCount)}</dd>
          <dt>مفقود؛ خارج از مخرج</dt><dd>{count(history.missingCount)}</dd>
          <dt>متناقض؛ زیرمجموعهٔ حل‌نشده</dt><dd>{unavailable ? "نامشخص" : count(history.conflictingCount)}</dd>
        </dl>
      </details>
      {history.category === "unknown" && (
        <div className="stack">
          <p>برای نمایش دستهٔ تاریخی به حداقل ۱۰ مشاهدهٔ معتبر، فهرست برنامهٔ تأییدشده و پوشش ۸۰٪ نیاز است.</p>
          <ul className="history-reasons">
            {history.reasons.map((reason) => <li key={reason}>{REASON_LABELS[reason]}</li>)}
          </ul>
          {history.observedRate !== null && <p className="small-text muted">فقط در نتایج معتبرِ موجود، {historyPercent(history.observedRate)} لغو ثبت شده است. این کسر به دلیل ناکافی‌بودن شواهد، نرخ نمایندهٔ بازهٔ ۳۰روزه نیست.</p>}
        </div>
      )}
      <div className="history-source stack">
        <p className="row"><Icon icon={CalendarDays} size={16} />از {formatJalaliDate(history.window.startLocalDate)} تا پیش از {formatJalaliDate(history.window.endLocalDate)}</p>
        <p className="small-text muted">۳۰ روز کامل گذشته · <bdi>{history.window.originTimeZone}</bdi></p>
        <p>منبع: {history.source.mode === "demo" ? "مجموعهٔ محلی ترب بلیط" : history.source.label}</p>
        <p>{unavailable ? "آخرین به‌روزرسانی: دریافت موفقی ثبت نشده؛ این بازه فقط پنجره مورد نیاز محاسبه است." : <>{history.source.mode === "demo" ? "زمان مرجع مجموعه" : "آخرین به‌روزرسانی سوابق عملیاتی"}: {formatJalaliInstant(history.asOf, history.window.originTimeZone)} <bdi>{history.window.originTimeZone}</bdi></>}</p>
      </div>
      {history.warnings.length > 0 && <ul className="history-reasons small-text muted">{history.warnings.map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}</ul>}
    </section>
  );
}

export function RiskDetails({ open, onClose, flight }: { open: boolean; onClose: () => void; flight: Pick<Flight, "source" | "segments" | "history"> }) {
  const syntheticHistory = flight.history?.some((history) => history.source.mode === "demo") ?? false;
  return (
    <Dialog open={open} onClose={onClose} title="جزئیات سابقهٔ لغو پرواز" className="history-modal">
      <div className="stack">
        <p>{!syntheticHistory && <strong>اطلاعات کافی موجود نیست؛ منبع تأییدشده متصل نیست. </strong>}نرخ تاریخی، سهم لغوها از مجموع پروازهای انجام‌شده و لغوشده است؛ احتمال پیش‌بینی‌شده یا کالیبره‌شدهٔ لغو پرواز آینده نیست.</p>
        <p className="small-text muted">رده‌بندی سابقه: کم، کمتر از ۱۰٪؛ متوسط، از ۱۰٪ تا کمتر از ۲۵٪؛ زیاد، ۲۵٪ و بیشتر. طبقه‌بندی پیش از گردکردن درصد انجام می‌شود.</p>
        {flight.history?.length ? flight.history.map((history, index) => (
          <HistoryEvidence key={history.segmentId ?? `${history.identity.flightNumber}-${index}`} history={history} leg={index + 1} />
        )) : <p className="error-message">سوابق در دسترس نیست؛ نرخ و نتیجه نامشخص است.</p>}
        {flight.segments.length > 1 && <p className="small-text muted">هر بخش جداگانه محاسبه می‌شود. خلاصهٔ سفر در صورت کفایت تمام بخش‌ها، بدترین دسته را نشان می‌دهد؛ با هر بخش ناکافی، خلاصه نامشخص است. درصدهای بخش‌ها جمع یا میانگین نمی‌شوند.</p>}
      </div>
    </Dialog>
  );
}
