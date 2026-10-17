import type { CancellationHistory, DataSource, Flight, FlightSearchInput, FlightSegment, HistoricalRiskCategory, SellerOffer, SourceState, UnknownHistoryReason } from "../domain/models";
import type { UnpricedFlightSearchResult } from "./reference-search";
import { flightIdentityKey, historyRiskUtility, summarizeHistoricalRisk } from "../domain/cancellation-history";
import { localDateAt, localMinuteAt, parseUtcInstant, previousCompletedDaysWindow } from "../domain/time";
import { CANCELLATION_HISTORY_POLICY, RANKING_POLICY } from "../domain/policies";
import { formatToman } from "../domain/money";
import { AIRPORTS } from "../data/airports";
import type { ProviderStatus } from "../domain/provider";
import { DEMO_METADATA, loadDemoFlights } from "../fixtures/demo";

export interface SearchFilters {
  riskCategories?: HistoricalRiskCategory[];
  /** Inclusive complete-party price floor in canonical integer Iranian rials. */
  minPriceRials?: number;
  /** Complete party budget in canonical integer Iranian rials; UI input is toman. */
  maxPriceRials?: number;
  nonstopOnly?: boolean;
  checkedBagOnly?: boolean;
  airlineIds?: string[];
  departurePeriod?: "all" | "morning" | "afternoon" | "evening";
}

export type SearchSort = "recommended" | "price" | "duration" | "departure" | "history";
export type SearchMode = "live" | "demo" | "fixture";

export interface SearchRequest {
  query: FlightSearchInput;
  filters: SearchFilters;
  sort: SearchSort;
  mode?: SearchMode;
}

export interface FlightSearchResult {
  flight: Flight;
  selectedOffer: SellerOffer;
  eligibleOffers: SellerOffer[];
  historyCategory: HistoricalRiskCategory;
  /** Sufficient worst-leg observed fraction for ordering; never a journey probability. */
  historySortRate: number | null;
  score: number;
  reasons: string[];
}

export interface SearchResponse {
  mode: SearchMode;
  sourceState: SourceState;
  query: FlightSearchInput;
  filters: SearchFilters;
  sort: SearchSort;
  flights: FlightSearchResult[];
  totalBeforeFilters: number;
  asOf: string;
  source: DataSource;
  supportedDates: string[];
  providers?: ProviderStatus[];
  freshness?: "live" | "cached" | "mixed" | "unavailable" | "demo";
  dateBounds?: { min: string; max: string };
  lastSuccessfulAt?: string | null;
  unpricedFlights?: UnpricedFlightSearchResult[];
  warnings?: string[];
}

export interface SearchContext {
  source: DataSource;
  asOf: string;
  supportedDates: string[];
}

function compareId(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareOffers(left: SellerOffer, right: SellerOffer): number {
  return left.totalPrice.amountRials - right.totalPrice.amountRials || compareId(left.id, right.id);
}

function baseOfferEligible(offer: SellerOffer, flight: Flight, query: FlightSearchInput): boolean {
  return offer.flightId === flight.id
    && offer.source.mode === flight.source.mode
    && offer.adults === query.adults
    && offer.availability === "available"
    && offer.ticketing === "single-ticket"
    && offer.priceComplete
    && offer.totalPrice.currency === query.currency
    && offer.totalPrice.unit === "rial"
    && Number.isSafeInteger(offer.totalPrice.amountRials)
    && offer.totalPrice.amountRials >= 0;
}

function includesCheckedBag(offer: SellerOffer, flight: Flight): boolean {
  return flight.segments.every((segment) => {
    const allowances = offer.baggage.filter((bag) => bag.segmentId === segment.id);
    const kilograms = allowances[0]?.checkedKg;
    return allowances.length === 1 && typeof kilograms === "number" && Number.isFinite(kilograms) && kilograms > 0;
  });
}

function sameIdentity(history: CancellationHistory, segment: FlightSegment): boolean {
  try {
    return flightIdentityKey(history.identity) === flightIdentityKey(segment);
  } catch {
    return false;
  }
}

function unavailableHistory(flight: Flight, segment: FlightSegment, invalid: boolean, context: SearchContext): CancellationHistory {
  const zone = AIRPORTS.find((airport) => airport.code === segment.origin)?.timeZone;
  if (!zone) throw new RangeError("A history leg must have a normalized origin time zone.");
  return {
    segmentId: segment.id,
    identity: { airlineId: segment.airlineId, flightNumber: segment.flightNumber, origin: segment.origin, destination: segment.destination },
    asOf: context.asOf,
    source: context.source.mode === "demo" ? { ...flight.source } : { mode: "unavailable", id: "operational-history-unavailable", label: "منبع تأییدشده سوابق عملیاتی متصل نیست" },
    window: previousCompletedDaysWindow(context.asOf, zone),
    expectedCount: null, cancelledCount: 0, operatedCount: 0, knownCount: 0,
    unknownCount: 0, missingCount: null, conflictingCount: 0, coverage: null,
    cancellationRate: null, observedRate: null, category: "unknown",
    // Count placeholders are suppressed by the UI whenever history-unavailable is present.
    reasons: invalid ? ["invalid-matching-data", "history-unavailable"] : ["history-unavailable"],
    warnings: invalid ? ["سوابق ارسالی با هویت، بازه یا قرارداد معتبر این بخش سازگار نبود و نمایش داده نشد."] : [],
    policyVersion: CANCELLATION_HISTORY_POLICY.version,
  };
}

function countIsValid(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function equalFraction(actual: number | null, expected: number | null): boolean {
  return actual === expected || (typeof actual === "number" && typeof expected === "number"
    && Number.isFinite(actual) && actual >= 0 && actual <= 1
    && Math.abs(actual - expected) <= Number.EPSILON * 4);
}

function normalizeHistory(flight: Flight, context: SearchContext): CancellationHistory[] {
  // Ticket inventory is never operational evidence. A separately verified history adapter is required.
  if (context.source.mode !== "demo") return flight.segments.map((segment) => unavailableHistory(flight, segment, false, context));
  const rows = Array.isArray(flight.history)
    ? flight.history.filter((row) => typeof row === "object" && row !== null)
    : [];
  return flight.segments.map((segment) => {
    const fallback = unavailableHistory(flight, segment, rows.length > 0, context);
    const matches = rows.filter((row) => row.segmentId === segment.id
      || (row.segmentId === undefined && sameIdentity(row, segment)));
    if (matches.length !== 1 || !sameIdentity(matches[0], segment)) return fallback;
    const row = matches[0];
    let coherentCohort = false;
    try {
      const window = fallback.window;
      coherentCohort = parseUtcInstant(row.asOf).epochNanoseconds === parseUtcInstant(context.asOf).epochNanoseconds
        && row.source.mode === flight.source.mode && row.source.id === flight.source.id
        && row.window.originTimeZone === window.originTimeZone
        && row.window.startLocalDate === window.startLocalDate && row.window.endLocalDate === window.endLocalDate
        && parseUtcInstant(row.window.startAt).epochNanoseconds === parseUtcInstant(window.startAt).epochNanoseconds
        && parseUtcInstant(row.window.endAt).epochNanoseconds === parseUtcInstant(window.endAt).epochNanoseconds;
    } catch {
      coherentCohort = false;
    }
    const validCounts = [row.cancelledCount, row.operatedCount, row.knownCount, row.unknownCount, row.conflictingCount].every(countIsValid)
      && row.cancelledCount + row.operatedCount === row.knownCount && row.conflictingCount <= row.unknownCount
      && (row.expectedCount === null ? row.missingCount === null
        : countIsValid(row.expectedCount) && countIsValid(row.missingCount)
          && row.knownCount + row.unknownCount + row.missingCount === row.expectedCount);
    if (!coherentCohort || !validCounts) return unavailableHistory(flight, segment, true, context);

    // Only identity/window/source-bound, reconciled counts may produce diagnostics.
    const observedRate = row.knownCount > 0 ? row.cancelledCount / row.knownCount : null;
    const coverage = row.expectedCount !== null && row.expectedCount > 0 ? row.knownCount / row.expectedCount : null;
    const allowedReasons: readonly UnknownHistoryReason[] = ["unverified-roster", "no-expected-operations", "no-known-outcomes", "insufficient-sample", "low-coverage", "invalid-matching-data", "history-unavailable"];
    const reasons = new Set<UnknownHistoryReason>(Array.isArray(row.reasons) ? row.reasons.filter((reason) => allowedReasons.includes(reason)) : []);
    if (row.expectedCount === null) reasons.add("unverified-roster");
    if (row.expectedCount === 0) reasons.add("no-expected-operations");
    if (row.knownCount === 0) reasons.add("no-known-outcomes");
    if (row.knownCount < CANCELLATION_HISTORY_POLICY.minimumKnownOperations) reasons.add("insufficient-sample");
    if (row.expectedCount !== null && row.expectedCount > 0
      && BigInt(row.knownCount) * 100n < BigInt(row.expectedCount) * BigInt(CANCELLATION_HISTORY_POLICY.minimumCoveragePercent)) {
      reasons.add("low-coverage");
    }
    const expectedCategory: HistoricalRiskCategory = observedRate === null ? "unknown"
      : BigInt(row.cancelledCount) * 100n < BigInt(row.knownCount) * BigInt(CANCELLATION_HISTORY_POLICY.lowUpperPercent) ? "low"
        : BigInt(row.cancelledCount) * 100n < BigInt(row.knownCount) * BigInt(CANCELLATION_HISTORY_POLICY.mediumUpperPercent) ? "medium" : "high";
    const ratesCoherent = equalFraction(row.observedRate, observedRate) && equalFraction(row.coverage, coverage)
      && (row.category === "unknown" ? row.cancellationRate === null : equalFraction(row.cancellationRate, observedRate));
    if (!ratesCoherent || row.policyVersion !== CANCELLATION_HISTORY_POLICY.version
      || (row.category !== "unknown" && (row.category !== expectedCategory || reasons.size > 0))
      || (row.category === "unknown" && reasons.size === 0)) reasons.add("invalid-matching-data");
    const sufficient = reasons.size === 0 && row.category !== "unknown" && observedRate !== null;
    return {
      ...row, segmentId: segment.id, identity: fallback.identity, asOf: context.asOf,
      source: { ...row.source }, window: fallback.window, coverage,
      category: sufficient ? expectedCategory : "unknown",
      cancellationRate: sufficient ? observedRate : null,
      observedRate: reasons.has("history-unavailable") ? null : observedRate,
      reasons: [...reasons].sort(),
      warnings: Array.isArray(row.warnings) ? row.warnings.filter((warning) => typeof warning === "string") : [],
      policyVersion: CANCELLATION_HISTORY_POLICY.version,
    };
  });
}

function historySummary(flight: Flight) {
  const legs = flight.history ?? [];
  const sufficientLeg = (leg: CancellationHistory | undefined): boolean => leg !== undefined
    && leg.category !== "unknown" && leg.cancellationRate !== null
    && Number.isFinite(leg.cancellationRate) && leg.cancellationRate >= 0 && leg.cancellationRate <= 1;
  const sufficient = legs.length > 0 && legs.every(sufficientLeg);
  const category: HistoricalRiskCategory = sufficient
    ? summarizeHistoricalRisk(legs.filter((leg) => leg !== undefined))
    : "unknown";
  return {
    category,
    sortRate: sufficient ? Math.max(...legs.map((leg) => leg!.cancellationRate!)) : null,
    utility: legs.length === 0 ? 0.5 : Math.min(...legs.map((leg) => historyRiskUtility(sufficientLeg(leg) ? leg!.category : "unknown"))),
  };
}

function scoreOffer(flight: Flight, offer: SellerOffer, adults: number, historyUtility: number): number {
  const { weights } = RANKING_POLICY;
  // No soft departure/baggage preference is requested in this compact search contract.
  // Inactive dimensions are excluded for every candidate, including when baggage is a hard filter.
  const activeWeight = weights.price + weights.duration + weights.stops + weights.history;
  const priceUtility = 1 / (1 + offer.totalPrice.amountRials / (RANKING_POLICY.priceReferenceRialsPerAdult * adults));
  const durationUtility = 1 / (1 + flight.durationMinutes / RANKING_POLICY.durationReferenceMinutes);
  const stopsUtility = flight.stops === 0 ? 1 : 0.4;
  return 100 * (
    weights.price * priceUtility
    + weights.duration * durationUtility
    + weights.stops * stopsUtility
    + weights.history * historyUtility
  ) / activeWeight;
}

function matchesPeriod(minute: number, period: SearchFilters["departurePeriod"]): boolean {
  if (period === "morning") return minute >= 360 && minute < 720;
  if (period === "afternoon") return minute >= 720 && minute < 1080;
  if (period === "evening") return minute >= 1080 || minute < 360;
  return true;
}

function explain(flight: Flight, offer: SellerOffer, category: HistoricalRiskCategory): string[] {
  const price = formatToman(offer.totalPrice);
  const adults = new Intl.NumberFormat("fa-IR").format(offer.adults);
  const minutes = new Intl.NumberFormat("fa-IR").format(flight.durationMinutes);
  const labels = { low: "کم", medium: "متوسط", high: "زیاد", unknown: "داده ناکافی / نامشخص" };
  return [
    offer.source.mode === "demo" ? `قیمت کل برای ${adults} بزرگسال: ${price}؛ شامل هزینه‌های اجباری نمونه.` : `قیمت کل برای ${adults} بزرگسال از ${offer.providerName ?? offer.source.label}: ${price}؛ شامل هزینه‌های اجباری اعلام‌شده.`,
    flight.stops === 0 ? `بدون توقف؛ مدت کل ${minutes} دقیقه.` : `یک توقف؛ مدت کل سفر با اتصال ${minutes} دقیقه.`,
    category === "unknown"
      ? "سابقه کامل نیست؛ هر بخش نامشخص سهم خنثی در امتیاز ترجیحی دارد."
      : `رده سابقه لغو ۳۰ روز گذشته: ${labels[category]}${flight.stops ? "؛ خلاصه بر اساس بدترین بخش با داده کافی" : ""}.`,
    offer.source.mode === "demo" ? "امتیاز بر پایه قیمت، مدت، توقف و سابقه است؛ احتمال لغو آینده نیست." : "امتیاز تناسب بر پایه پیشنهاد دریافتی است؛ سابقه ناموجود خنثی است و احتمال لغو آینده نیست.",
  ];
}

function compareResults(left: FlightSearchResult, right: FlightSearchResult, sort: SearchSort): number {
  const scoreDifference = right.score - left.score;
  const priceDifference = left.selectedOffer.totalPrice.amountRials - right.selectedOffer.totalPrice.amountRials;
  const durationDifference = left.flight.durationMinutes - right.flight.durationMinutes;
  if (sort === "price" && priceDifference) return priceDifference;
  if (sort === "duration" && durationDifference) return durationDifference;
  if (sort === "departure") {
    const departureDifference = parseUtcInstant(left.flight.segments[0].departureAt).epochMilliseconds
      - parseUtcInstant(right.flight.segments[0].departureAt).epochMilliseconds;
    if (departureDifference) return departureDifference;
  }
  if (sort === "history") {
    if (left.historySortRate === null && right.historySortRate !== null) return 1;
    if (left.historySortRate !== null && right.historySortRate === null) return -1;
    if (left.historySortRate !== null && right.historySortRate !== null) {
      const historyDifference = left.historySortRate - right.historySortRate;
      if (historyDifference) return historyDifference;
    }
  }
  return scoreDifference || priceDifference || durationDifference
    || left.flight.stops - right.flight.stops || compareId(left.flight.id, right.flight.id);
}

/** Shared deterministic filtering/ranking. Live callers MUST pass explicit inventory and context. */
export function searchFlights(request: SearchRequest, inventory?: readonly Flight[], context: SearchContext = { source: DEMO_METADATA.source, asOf: DEMO_METADATA.asOf, supportedDates: DEMO_METADATA.supportedDates }): SearchResponse {
  if (request.mode === "live" && context.source.mode !== "live") throw new RangeError("Live searches require an explicit provider context.");
  if (context.source.mode !== "demo" && inventory === undefined) throw new RangeError("Explicit live inventory is required.");
  const { query, filters, sort } = request;
  const origin = AIRPORTS.find((airport) => airport.code === query.origin);
  if (!origin) throw new RangeError("Search origin is not in the normalized airport inventory.");
  const candidates = (inventory ?? loadDemoFlights(query)).filter((flight) => {
    const first = flight.segments[0];
    const last = flight.segments.at(-1);
    return flight.source.mode === context.source.mode && first !== undefined && last !== undefined && first.origin === query.origin
      && last.destination === query.destination
      && localDateAt(first.departureAt, origin.timeZone) === query.departureDate
      && flight.offers.some((offer) => baseOfferEligible(offer, flight, query));
  });
  const flights: FlightSearchResult[] = [];
  for (const flight of candidates) {
    const normalizedFlight = {
      ...flight,
      offers: [...flight.offers].sort((left, right) => compareId(left.id, right.id)),
      history: normalizeHistory(flight, context),
    };
    const history = historySummary(normalizedFlight);
    if (filters.nonstopOnly && flight.stops !== 0) continue;
    if (filters.riskCategories && !filters.riskCategories.includes(history.category)) continue;
    if (filters.airlineIds && !flight.segments.every((segment) => filters.airlineIds!.includes(segment.airlineId))) continue;
    if (!matchesPeriod(localMinuteAt(flight.segments[0].departureAt, origin.timeZone), filters.departurePeriod)) continue;
    const eligibleOffers = flight.offers.filter((offer) => (
      baseOfferEligible(offer, flight, query)
      && (filters.minPriceRials === undefined || offer.totalPrice.amountRials >= filters.minPriceRials)
      && (filters.maxPriceRials === undefined || offer.totalPrice.amountRials <= filters.maxPriceRials)
      && (!filters.checkedBagOnly || includesCheckedBag(offer, flight))
    )).sort(compareOffers);
    if (eligibleOffers.length === 0) continue;
    // Every active offer score differs only by complete party price, so lowest eligible
    // price also maximizes the documented compact default preference score.
    const selectedOffer = eligibleOffers[0];
    flights.push({
      flight: normalizedFlight,
      selectedOffer,
      eligibleOffers,
      historyCategory: history.category,
      historySortRate: history.sortRate,
      score: scoreOffer(flight, selectedOffer, query.adults, history.utility),
      reasons: explain(flight, selectedOffer, history.category),
    });
  }
  flights.sort((left, right) => compareResults(left, right, sort));
  return {
    mode: request.mode ?? "demo",
    sourceState: context.source.mode === "demo" ? "FIXTURE" : context.source.mode === "live" ? "LIVE" : "UNAVAILABLE",
    query: { ...query },
    filters: { ...filters },
    sort,
    flights,
    totalBeforeFilters: candidates.length,
    asOf: context.asOf,
    source: context.source,
    supportedDates: [...context.supportedDates],
  };
}
