import type { Flight, SellerOffer } from "@/domain/models";
import type { UnpricedFlightOffer } from "@/domain/provider";
import type { FlightSearchResult, SearchRequest } from "./search-service";
import { itineraryKey } from "./normalize-offers";
import { calculateCancellationHistory } from "@/domain/cancellation-history";
import { elapsedMinutes, localDateAt, localMinuteAt } from "@/domain/time";
import { AIRPORTS } from "@/data/airports";

export interface UnpricedSellerOffer extends Omit<SellerOffer, "totalPrice"> {
  totalPrice: null;
  priceComplete: false;
  priceEvidence: UnpricedFlightOffer["priceEvidence"];
  baggageRaw: UnpricedFlightOffer["baggageRaw"];
  capturedAt: null;
}
export interface UnpricedFlight extends Omit<Flight, "offers"> { offers: UnpricedSellerOffer[] }
export interface UnpricedFlightSearchResult extends Omit<FlightSearchResult, "flight" | "selectedOffer" | "eligibleOffers" | "score"> {
  flight: UnpricedFlight;
  selectedOffer: UnpricedSellerOffer;
  eligibleOffers: UnpricedSellerOffer[];
  score: null;
}
export type DisplayFlightResult = FlightSearchResult | UnpricedFlightSearchResult;
export type DisplaySellerOffer = SellerOffer | UnpricedSellerOffer;

/** Unpriced reference records support schedule comparison, never comparable-price claims. */
export function searchUnpricedReferenceOffers(offers: readonly UnpricedFlightOffer[], request: SearchRequest): UnpricedFlightSearchResult[] {
  const { filters } = request;
  if (filters.minPriceRials !== undefined || filters.maxPriceRials !== undefined || filters.checkedBagOnly || (filters.riskCategories && !filters.riskCategories.includes("unknown"))) return [];
  const groups = new Map<string, UnpricedFlight>();
  for (const offer of offers) {
    if (offer.sourceState !== "FIXTURE" || offer.source.mode !== "demo") continue;
    if (offer.availability !== "available" || offer.adults !== request.query.adults) continue;
    if (filters.nonstopOnly && offer.stops !== 0) continue;
    if (filters.airlineIds && !offer.segments.every((segment) => filters.airlineIds!.includes(segment.airlineId))) continue;
    const first = offer.segments[0];
    const zone = AIRPORTS.find((airport) => airport.code === first.origin)!.timeZone;
    if (first.origin !== request.query.origin || offer.segments.at(-1)!.destination !== request.query.destination
      || localDateAt(first.departureAt, zone) !== request.query.departureDate) continue;
    const minute = localMinuteAt(first.departureAt, zone);
    if (filters.departurePeriod === "morning" && (minute < 360 || minute >= 720)) continue;
    if (filters.departurePeriod === "afternoon" && (minute < 720 || minute >= 1080)) continue;
    if (filters.departurePeriod === "evening" && minute >= 360 && minute < 1080) continue;
    const id = `FIXTURE:reference:${itineraryKey(offer)}`;
    let flight = groups.get(id);
    if (!flight) {
      const segments = offer.segments.map((leg, index) => ({ ...leg, id: `${id}:leg:${index}` }));
      flight = { id, source: { ...offer.source }, segments, stops: segments.length - 1,
        durationMinutes: elapsedMinutes(first.departureAt, offer.segments.at(-1)!.arrivalAt), offers: [],
        history: segments.map((segment) => {
          const history = calculateCancellationHistory({ identity: segment, segmentId: segment.id, asOf: offer.fetchedAt,
            originTimeZone: AIRPORTS.find((airport) => airport.code === segment.origin)!.timeZone,
            roster: null, operations: [], source: { mode: "unavailable", id: "operational-history-unavailable", label: "در پاسخ مرجع سوابق عملیاتی وجود ندارد" } });
          return { ...history, reasons: [...history.reasons, "history-unavailable" as const] };
        }),
      };
      groups.set(id, flight);
    }
    const normalized: UnpricedSellerOffer = { ...offer, id: `fixture:alibaba:${offer.providerOfferId}`, flightId: id,
      baggage: offer.baggage.map((bag, index) => ({ ...bag, segmentId: flight!.segments[index].id })),
      sourceState: "FIXTURE", freshness: "fixture" };
    if (!flight.offers.some((existing) => existing.id === normalized.id)) flight.offers.push(normalized);
  }
  return [...groups.values()].map((flight): UnpricedFlightSearchResult => ({
    flight, selectedOffer: flight.offers[0], eligibleOffers: flight.offers, historyCategory: "unknown", historySortRate: null, score: null,
    reasons: ["این رکورد از پاسخ ذخیره‌شده مرجع است؛ موجودی زنده یا امکان خرید را تأیید نمی‌کند.",
      "واحد مبلغ و کامل بودن هزینه‌ها تأیید نشده؛ تبدیل به تومان و امتیازدهی قیمتی انجام نشده است.",
      "سوابق عملیاتی وجود ندارد؛ وضعیت پاسخ فروش بلیت، سابقه لغو پرواز نیست."],
  })).sort((a, b) => request.sort === "duration" ? a.flight.durationMinutes - b.flight.durationMinutes || a.flight.id.localeCompare(b.flight.id)
    : a.flight.segments[0].departureAt.localeCompare(b.flight.segments[0].departureAt) || a.flight.id.localeCompare(b.flight.id));
}
