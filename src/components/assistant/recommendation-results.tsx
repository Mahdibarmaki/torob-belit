"use client";

import { useState } from "react";
import type { AssistantRecommendation, AssistantRecommendationResponse } from "@/application/assistant-recommendations";
import type { FlightSearchResult } from "@/application/search-service";
import type { SellerOffer } from "@/domain/models";
import { journeyTotal } from "@/domain/journey-selection";
import { formatToman } from "@/domain/money";
import { FlightCard } from "../flight-card";
import { SourceStatus } from "../source-status";
import { Button, Dialog } from "../ui";
import styles from "./assistant.module.css";

const number = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const labels = { price: "قیمت", history: "سابقه لغو گذشته", departure: "ساعت حرکت", duration: "مدت سفر", stops: "توقف", baggage: "بار", refundability: "استرداد", airline: "ایرلاین" };

export function RecommendationResults({ response, mode, direction = "outbound", compareIds = [], comparisonOfferIds = {}, onCompare, onSelectJourney, onRefine }: {
  response: AssistantRecommendationResponse;
  mode: "demo" | "live" | "fixture";
  direction?: "outbound" | "inbound";
  compareIds?: string[];
  comparisonOfferIds?: Readonly<Record<string, string>>;
  onCompare: (result: FlightSearchResult, offerId?: string) => void;
  onSelectJourney?: (result: FlightSearchResult, offer: SellerOffer, recommendation: AssistantRecommendation) => void;
  onRefine: () => void;
}) {
  const [explained, setExplained] = useState<AssistantRecommendation | null>(null);
  const source = direction === "inbound" ? response.inbound : response.outbound;
  const unavailable = mode === "live" && source?.sourceState === "UNAVAILABLE";
  return <section className={styles.recommendations} aria-label="پروازهای پیشنهادی برای تو">
    <div><h2>پروازهای پیشنهادی برای تو</h2><p className={styles.caption}>{mode === "live" ? "منبع: موجودی واقعی تأمین‌کنندگان مجاز؛ اتصال و زمان هر پیشنهاد جداگانه مشخص است." : mode === "fixture" ? "پاسخ مرجع ذخیره‌شده؛ واحد مبلغ و تاریخ دریافت اصلی تأیید نشده است." : "اطلاعات آزمایشی؛ قیمت‌ها و سابقه لغو، داده بازار یا عملکرد واقعی ایرلاین نیستند."}</p></div>
    {source?.providers && <SourceStatus providers={source.providers} />}
    {response.recommendations.length === 0 ? <div className={styles.notice}><p>{unavailable ? "منابع واقعی متصل نیستند؛ نتیجه خالی به معنی نبود پرواز در بازار نیست." : response.question ?? "پروازی مطابق تمام شرایطت پیدا نکردیم."}</p>{response.issues.filter((issue) => issue.message !== response.question).map((issue, index) => <p key={`${issue.field}-${index}`}>{issue.message}</p>)}<Button variant="text" onClick={onRefine}>ویرایش شرایط و اولویت‌ها</Button></div> : response.recommendations.map((recommendation, index) => {
      const result = recommendation.legs[direction === "inbound" ? 1 : 0];
      if (!result) return null;
      return <section key={recommendation.id} className={styles.recommendation} aria-label={`پیشنهاد ${number.format(index + 1)}`}>
        <div className={styles.recommendationHeader}><h3>پیشنهاد {number.format(index + 1)}</h3>{recommendation.selection.tripType === "round-trip" && <span className={styles.status}>مجموع رفت و برگشت: <bdi>{formatToman(journeyTotal(recommendation.selection))}</bdi></span>}</div>
        <div className={styles.cardGrid}><FlightCard result={result} selectedForComparison={compareIds.includes(result.flight.id)} comparisonOfferId={comparisonOfferIds[result.flight.id]} comparisonDisabled={compareIds.length >= 3 && !compareIds.includes(result.flight.id)} onCompare={(offerId) => onCompare(result, offerId)} onSelectJourney={onSelectJourney ? (offer) => { if (!("priceEvidence" in offer)) onSelectJourney(result, offer, recommendation); } : undefined} /></div>
        <Button variant="text" onClick={() => setExplained(recommendation)}>چرا این پرواز پیشنهاد شده؟</Button>
      </section>;
    })}
    <Dialog open={explained !== null} onClose={() => setExplained(null)} title="دلیل پیشنهاد پرواز">
      {explained && <div className="stack"><p className={styles.status}>رتبه‌بندی محاسبه‌شده بر پایه ترجیحات شماست؛ امتیاز، احتمال لغو یا تضمین سفر نیست.</p><ul className={styles.reasonList}>{explained.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul><div className={styles.scoreTable}><table><caption>عامل‌های فعال در امتیاز ترجیحی</caption><thead><tr><th scope="col">عامل</th><th scope="col">درصد وزن نسبی</th><th scope="col">وضعیت داده</th></tr></thead><tbody>{explained.dimensions.filter((row) => row.weight > 0).map((row) => <tr key={row.dimension}><th scope="row">{labels[row.dimension]}</th><td>{number.format(row.weight * 100)}</td><td>{row.known ? "موجود در پیشنهاد" : "نامشخص؛ سهم خنثی"}</td></tr>)}</tbody></table></div></div>}
    </Dialog>
  </section>;
}
