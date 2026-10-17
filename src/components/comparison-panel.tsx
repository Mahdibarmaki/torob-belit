"use client";

import { useState } from "react";
import { Check, Clock3, Hash, Plane, PlaneLanding, PlaneTakeoff, Store, Trash2, Waypoints } from "lucide-react";
import type { DisplayFlightResult } from "@/application/reference-search";
import { AIRPORTS } from "@/data/airports";
import { formatJalaliDate } from "@/domain/jalali";
import { localDateAt } from "@/domain/time";
import { AirlineIdentity } from "./airline-identity";
import { BadgeGroup, MetadataBadge } from "./metadata-badge";
import { OfferAttribution } from "./offer-attribution";
import { OfferPrice } from "./offer-price";
import { historyPercent, RISK_LABELS } from "./risk-details";
import { SellerOfferMetadata } from "./seller-offer-metadata";
import { FlightDetails } from "./flight-details";
import { Button, Card, Icon } from "./ui";
import styles from "./comparison-panel.module.css";

const numbers = new Intl.NumberFormat("fa-IR");

export interface ComparisonSelection { result: DisplayFlightResult; offerId: string }
export interface ComparisonPanelProps {
  selections: readonly ComparisonSelection[];
  onRemove: (flightId: string) => void;
  onDone: () => void;
  onCompareOffer: (flightId: string, offerId: string) => void;
}

function airport(code: string) {
  const item = AIRPORTS.find((candidate) => candidate.code === code);
  if (!item) throw new RangeError("Unknown comparison airport.");
  return item;
}
function time(instant: string, zone: string) {
  return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: zone }).format(new Date(instant));
}

/** Presentation of exact selected seller snapshots; eligibility and comparison state stay with the parent. */
export function ComparisonPanel({ selections, onRemove, onDone, onCompareOffer }: ComparisonPanelProps) {
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const details = selections.find(({ result }) => result.flight.id === detailsId);
  const authoredDemo = selections.some(({ result }) => result.flight.source.mode === "demo" && !("priceEvidence" in result.selectedOffer));
  return <>
    {authoredDemo && <p className={styles.disclosure}>اطلاعات آزمایشی؛ قیمت‌ها و سوابق، داده بازار یا عملکرد واقعی ایرلاین نیستند.</p>}
    <div className={`comparison-grid ${selections.length === 2 ? "two-columns" : ""}`}>
      {selections.map(({ result, offerId }) => {
        const { flight } = result;
        const first = flight.segments[0];
        const offer = result.eligibleOffers.find((item) => item.id === offerId);
        const insufficientHistory = !flight.history?.length || flight.history.every((history) => history.category === "unknown");
        const airlines = flight.segments.filter((segment, index, segments) => segments.findIndex((item) => item.airlineId === segment.airlineId) === index);
        return <Card className={`${styles.card} comparison-card`} key={flight.id} role="group" aria-label={`مقایسه پرواز ${first.flightNumber}`}>
          <div className={styles.header}>
            <h3 className={styles.airlines}>{airlines.map((segment) => <AirlineIdentity key={segment.airlineId} airlineId={segment.airlineId} name={segment.airlineName} size={28} />)}</h3>
            <Button variant="text" className={styles.remove} aria-label={`حذف پرواز ${first.flightNumber} از مقایسه`} onClick={() => onRemove(flight.id)}><Icon icon={Trash2} size={18} /></Button>
          </div>
          {!offer ? <p role="alert" className="small-text muted">پیشنهاد انتخاب‌شده دیگر در این مقایسه معتبر نیست؛ آن را حذف و دوباره انتخاب کنید.</p> : <>
            <section className={styles.seller} aria-label="فروشنده و قیمت">
              <div className={styles.priceRow}><MetadataBadge icon={Store}>{offer.sellerName}</MetadataBadge><OfferPrice price={offer.totalPrice} className="price" /></div>
              <p className={styles.note}>مجموع {numbers.format(offer.adults)} بزرگسال{offer.totalPrice === null ? " · بدون مبلغ تأییدشده" : ""}</p>
              <OfferAttribution offer={offer} />
            </section>
            {flight.segments.map((segment, index) => {
              const origin = airport(segment.origin);
              const destination = airport(segment.destination);
              return <section className={styles.segment} key={segment.id} aria-label={`برنامه بخش ${numbers.format(index + 1)}`}>
                {flight.segments.length > 1 && <h4 className={styles.groupTitle}>بخش {numbers.format(index + 1)}</h4>}
                <div className={styles.schedule}>
                  <div className={styles.endpoint} aria-label={`حرکت بخش ${numbers.format(index + 1)}`}>
                    <span className={styles.endpointLabel}><Icon icon={PlaneTakeoff} size={16} />حرکت</span>
                    <time dateTime={segment.departureAt}><bdi dir="ltr">{time(segment.departureAt, origin.timeZone)}</bdi></time>
                    <bdi dir="ltr">{segment.origin}</bdi><span>{origin.city}</span>
                    <span>{formatJalaliDate(localDateAt(segment.departureAt, origin.timeZone))}</span>
                    <small>زمان محلی · <bdi dir="ltr">{origin.timeZone}</bdi></small>
                  </div>
                  <div className={styles.endpoint} aria-label={`ورود بخش ${numbers.format(index + 1)}`}>
                    <span className={styles.endpointLabel}><Icon icon={PlaneLanding} size={16} />ورود</span>
                    <time dateTime={segment.arrivalAt}><bdi dir="ltr">{time(segment.arrivalAt, destination.timeZone)}</bdi></time>
                    <bdi dir="ltr">{segment.destination}</bdi><span>{destination.city}</span>
                    <span>{formatJalaliDate(localDateAt(segment.arrivalAt, destination.timeZone))}</span>
                    <small>زمان محلی · <bdi dir="ltr">{destination.timeZone}</bdi></small>
                  </div>
                </div>
                <BadgeGroup label={`جزئیات پرواز بخش ${numbers.format(index + 1)}`}>
                  <MetadataBadge icon={Hash}>پرواز <bdi dir="ltr">{segment.flightNumber}</bdi></MetadataBadge>
                  {segment.aircraftModel && <MetadataBadge icon={Plane}><bdi dir="ltr" lang="en">{segment.aircraftModel}</bdi></MetadataBadge>}
                </BadgeGroup>
              </section>;
            })}
            <BadgeGroup label="مدت و توقف‌ها"><MetadataBadge icon={Clock3}>{numbers.format(flight.durationMinutes)} دقیقه</MetadataBadge><MetadataBadge icon={Waypoints}>{flight.stops === 0 ? "بدون توقف" : `${numbers.format(flight.stops)} توقف`}</MetadataBadge></BadgeGroup>
            <section className={styles.conditions} aria-label="بار و شرایط پیشنهاد"><h4 className={styles.groupTitle}>بار و شرایط بلیط</h4><SellerOfferMetadata offer={offer} presentation="badges" />{offer.refundability === "unknown" && !offer.fareConditions?.refunds && <p className={styles.note}>استرداد نامشخص است.</p>}</section>
            <section className={styles.history} aria-label="سابقه لغو"><h4 className={styles.groupTitle}>سابقه لغو</h4>
              {insufficientHistory && <p className={styles.note}>اطلاعات کافی موجود نیست.</p>}
              {flight.segments.map((segment, index) => {
                const history = flight.history?.[index];
                const category = history?.category ?? "unknown";
                return <div className={styles.historyLeg} key={segment.id}>{flight.segments.length > 1 && <span>بخش {numbers.format(index + 1)}</span>}<span className={`risk-indicator risk-${category}`}><span className="risk-dot" aria-hidden="true" />{RISK_LABELS[category]} · {historyPercent(history?.cancellationRate ?? null)}</span></div>;
              })}
              {flight.segments.length > 1 && <p className={styles.note}>خلاصه سابقه: {RISK_LABELS[result.historyCategory]}؛ درصد بخش‌ها جمع نمی‌شود.</p>}
              <p className={styles.note}>سابقه گذشته، احتمال لغو آینده نیست.</p>
            </section>
            <div className="row"><Button variant="text" onClick={() => setDetailsId(flight.id)}>جزئیات و فروشندگان</Button><Button variant="text" onClick={onDone}><Icon icon={Check} size={16} />بررسی انجام شد</Button></div>
          </>}
        </Card>;
      })}
    </div>
    {details && <FlightDetails result={details.result} open onClose={() => setDetailsId(null)} selectedForComparison comparisonOfferId={details.offerId} onCompare={(offerId) => onCompareOffer(details.result.flight.id, offerId)} />}
  </>;
}
