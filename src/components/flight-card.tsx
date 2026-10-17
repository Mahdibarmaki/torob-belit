"use client";

import { useRef, useState } from "react";
import { BaggageClaim, CircleHelp, GitCompareArrows, Trash2, Undo2 } from "lucide-react";
import type { DisplayFlightResult, DisplaySellerOffer } from "@/application/reference-search";

import { formatJalaliDate } from "@/domain/jalali";
import { localDateAt, parseLocalDate } from "@/domain/time";
import { AIRPORTS } from "@/data/airports";
import { OfferPrice } from "./offer-price";
import { AirportRoute } from "./airport-route";
import { Button, Icon } from "./ui";
import { historyPercent, RiskDetails, RISK_LABELS } from "./risk-details";
import { FlightDetails } from "./flight-details";
import { AirlineIdentity } from "./airline-identity";
import styles from "./flight-card.module.css";

const numbers = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });

function airport(code: string) {
  const found = AIRPORTS.find((item) => item.code === code);
  if (!found) throw new Error("Unknown airport reference.");
  return found;
}

function localTime(instant: string, code: string) {
  return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: airport(code).timeZone }).format(new Date(instant));
}

function calendarDate(instant: string, code: string) {
  return localDateAt(instant, airport(code).timeZone);
}

function duration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [hours ? `${numbers.format(hours)} ساعت` : "", remainder ? `${numbers.format(remainder)} دقیقه` : ""].filter(Boolean).join(" و ");
}

/** This short label supplements the full per-adult, per-segment scope in details. */
function baggageSummary(offer: DisplaySellerOffer) {
  if (offer.baggage.length === 0 || offer.baggage.some((item) => item.checkedKg === null)) return "بار نامشخص";
  const minimum = Math.min(...offer.baggage.map((item) => item.checkedKg!));
  return minimum === 0 ? "بدون بار تحویلی" : `${numbers.format(minimum)} کیلو مجاز`;
}

function refundLabel(offer: DisplaySellerOffer) {
  return offer.refundability === "refundable" ? "قابل استرداد طبق شرایط پیشنهاد" : offer.refundability === "non-refundable" ? "غیرقابل استرداد" : "استرداد نامشخص";
}

export interface FlightCardProps {
  result: DisplayFlightResult;
  selectedForComparison: boolean;
  /** Exact selected seller fare, so its action communicates removal rather than addition. */
  comparisonOfferId?: string;
  comparisonDisabled?: boolean;
  onCompare: (offerId?: string) => void;
  /** Optional round-trip planning; external purchases never change the current search. */
  onSelectJourney?: (offer: DisplaySellerOffer) => void;
}

export function FlightCard({ result, selectedForComparison, comparisonOfferId, comparisonDisabled = false, onCompare, onSelectJourney }: FlightCardProps) {
  const detailsTriggerRef = useRef<HTMLButtonElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { flight, selectedOffer } = result;
  const first = flight.segments[0];
  const last = flight.segments[flight.segments.length - 1];
  const firstDate = calendarDate(first.departureAt, first.origin);
  const lastDate = calendarDate(last.arrivalAt, last.destination);
  const dayDifference = parseLocalDate(firstDate).until(parseLocalDate(lastDate)).days;
  const airlineNames = [...new Set(flight.segments.map((segment) => segment.airlineName))].join(" / ");
  // Preserve the actual airline/model pairing, including different connection aircraft.
  const airlineModels = flight.segments.filter((segment, index, segments) => segments.findIndex((candidate) =>
    candidate.airlineId === segment.airlineId && candidate.aircraftModel === segment.aircraftModel) === index);
  const stopLabel = flight.stops === 0 ? "بدون توقف" : `${numbers.format(flight.stops)} توقف`;
  const accessibleRates = flight.segments.map((_, index) => `بخش ${numbers.format(index + 1)}: ${RISK_LABELS[flight.history?.[index]?.category ?? "unknown"]}، ${historyPercent(flight.history?.[index]?.cancellationRate ?? null)}`).join("؛ ");

  function openDetails() {
    // A native sibling button supplies keyboard activation without nesting other actions.
    detailsTriggerRef.current?.focus({ preventScroll: true });
    setDetailsOpen(true);
  }

  return (
    <article
      className="flight-card ticket-card"
      aria-label={`پرواز ${first.airlineName} ${first.flightNumber}`}
    >
      <button
        ref={detailsTriggerRef}
        type="button"
        className="ticket-card-open"
        onClick={openDetails}
        aria-haspopup="dialog"
        aria-label={`جزئیات پرواز ${first.flightNumber}؛ ${airlineNames}، ${airport(first.origin).city} به ${airport(last.destination).city}`}
      ><span className="visually-hidden">جزئیات پرواز {first.flightNumber}</span></button>
      <div className="flight-header ticket-header">
        <div className="airline-identity">
          <div>
            <h3 className={`airline-name-model ${styles.airlineHeading}`}>{airlineModels.map((segment) => <span key={`${segment.airlineId}-${segment.aircraftModel ?? "unknown"}`} className={styles.identityPair}>
              <AirlineIdentity airlineId={segment.airlineId} name={segment.airlineName} size={32} />
              {segment.aircraftModel && <span className={styles.modelGroup}><span className="aircraft-caption" aria-hidden="true">·</span><bdi className="aircraft-caption" lang="en" dir="ltr">{segment.aircraftModel}</bdi></span>}
            </span>)}</h3>
            <p className="airline-caption">پرواز <bdi>{flight.segments.map((segment) => segment.flightNumber).join(" / ")}</bdi> · اقتصادی</p>
          </div>
        </div>
        <button
          className={`risk-indicator risk-compact risk-${result.historyCategory}`}
          type="button"
          onClick={() => setHistoryOpen(true)}
          aria-haspopup="dialog"
          aria-label={`جزئیات سابقهٔ لغو؛ ${RISK_LABELS[result.historyCategory]}؛ ${accessibleRates}`}
        >
          <span className="risk-dot" aria-hidden="true" />
          <span className="risk-card-text">
            {flight.segments.length === 1 ? <>سابقه لغو: {RISK_LABELS[result.historyCategory]} · {historyPercent(flight.history?.[0]?.cancellationRate ?? null)}</> : flight.segments.map((segment, index) => (
              <span key={segment.id}>{numbers.format(index + 1)}: {RISK_LABELS[flight.history?.[index]?.category ?? "unknown"]} {historyPercent(flight.history?.[index]?.cancellationRate ?? null)}{index === flight.segments.length - 1 ? "" : " · "}</span>
            ))}
          </span>
          <Icon icon={CircleHelp} size={14} />
        </button>
      </div>

      <AirportRoute origin={airport(first.origin)} destination={airport(last.destination)} schedule={{
        departureTime: localTime(first.departureAt, first.origin),
        arrivalTime: localTime(last.arrivalAt, last.destination),
        departureDate: formatJalaliDate(firstDate),
        arrivalDate: formatJalaliDate(lastDate),
        arrivalNote: dayDifference !== 0 ? `${numbers.format(Math.abs(dayDifference))} روز ${dayDifference > 0 ? "بعد" : "قبل"}` : undefined,
        duration: duration(flight.durationMinutes),
        stops: stopLabel,
      }} />

      <div className="ticket-price-region">
        <div className={styles.mobilePriceSummary}>
          <OfferPrice price={selectedOffer.totalPrice} className="price" />
          <span className="price-caption">مجموع {numbers.format(selectedOffer.adults)} بزرگسال · {selectedOffer.sellerName}</span>
        </div>
      </div>

      <div className="flight-meta ticket-meta">
        <div className="ticket-meta-details">
          <span><Icon icon={BaggageClaim} size={16} />{baggageSummary(selectedOffer)}</span>
          <span><Icon icon={Undo2} size={16} />{refundLabel(selectedOffer)}</span>
        </div>
        <Button
          variant="text"
          className="text-action compare-text-action"
          aria-pressed={selectedForComparison}
          disabled={comparisonDisabled && !selectedForComparison}
          onClick={() => onCompare(selectedForComparison ? undefined : selectedOffer.id)}
        >
          <Icon icon={selectedForComparison ? Trash2 : GitCompareArrows} size={16} />
          {selectedForComparison ? "حذف از مقایسه" : "افزودن به مقایسه"}
        </Button>
      </div>

      <FlightDetails result={result} open={detailsOpen} onClose={() => setDetailsOpen(false)} returnFocusRef={detailsTriggerRef} selectedForComparison={selectedForComparison} comparisonOfferId={comparisonOfferId} comparisonDisabled={comparisonDisabled} onCompare={onCompare} onSelectJourney={onSelectJourney} />
      <RiskDetails open={historyOpen} onClose={() => setHistoryOpen(false)} flight={flight} />
    </article>
  );
}
