import type { JourneySelection } from "../domain/journey-selection";
import { journeyTotal } from "../domain/journey-selection";
import { ASSISTANT_DIMENSIONS, parseTravelIntent, validateAssistantIntent, type AssistantDateContext, type AssistantDimension, type TravelIntent } from "../domain/assistant-intent";
import { journeyLegQuery } from "../domain/journey-search";
import { localMinuteAt, parseUtcInstant } from "../domain/time";
import { RANKING_POLICY } from "../domain/policies";
import { formatToman } from "../domain/money";
import { AIRPORTS } from "../data/airports";
import type { SellerOffer } from "../domain/models";
import type { FlightSearchResult, SearchRequest, SearchResponse } from "./search-service";

export interface AssistantScoreDimension { dimension: AssistantDimension; utility: number; weight: number; known: boolean; contribution: number }
export interface AssistantRecommendation {
  id: string;
  selection: JourneySelection;
  /** Same leg order as selection; exact chosen seller is retained in each selectedOffer. */
  legs: FlightSearchResult[];
  score: number;
  dimensions: AssistantScoreDimension[];
  reasons: string[];
}
export interface AssistantRecommendationResponse {
  /** Best compatible whole journey per distinct active-leg flight (outbound, then pinned inbound). */
  recommendations: AssistantRecommendation[];
  /** All eligible physical journeys, before distinct active-leg presentation and the three-result limit. */
  totalCandidates: number;
  outbound: SearchResponse | null;
  inbound: SearchResponse | null;
  question: string | null;
  issues: { field: string; message: string }[];
}
export type AssistantBaseSearch = (request: SearchRequest) => Promise<SearchResponse> | SearchResponse;
export interface AssistantRecommendationOptions {
  context: AssistantDateContext;
  search: AssistantBaseSearch;
  limit?: number;
  /** IDs are resolved against searched inventory; browser-supplied offer snapshots are never accepted. */
  pinnedOutbound?: { flightId: string; offerId: string };
}

export const ASSISTANT_RANKING_POLICY = Object.freeze({
  version: "assistant-ranking-v1",
  weights: Object.freeze({ price: 30, history: 10, departure: 15, duration: 15, stops: 10, baggage: 8, refundability: 7, airline: 5 }),
  priorityMultiplier: 2,
  /** Duration includes connection time; cap its combined weight with stops to avoid overcounting. */
  combinedDurationStopsWeight: 25,
  checkedBagReferenceKg: 30,
});
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const compareId = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const numbers = new Intl.NumberFormat("fa-IR");

/** Each eligible fare independently satisfies every hard condition. Missing positive evidence never passes. */
function eligibleOffer(result: FlightSearchResult, offer: SellerOffer, intent: TravelIntent): boolean {
  const { flight } = result;
  if (offer.flightId !== flight.id || offer.adults !== intent.passengers.adults || offer.source.mode !== flight.source.mode
    || offer.availability !== "available" || offer.ticketing !== "single-ticket" || !offer.priceComplete
    || offer.totalPrice.currency !== "IRR" || offer.totalPrice.unit !== "rial" || !Number.isSafeInteger(offer.totalPrice.amountRials) || offer.totalPrice.amountRials < 0) return false;
  if (intent.hard.refundableOnly && offer.refundability !== "refundable") return false;
  if (intent.hard.minimumCheckedKg !== null && flight.segments.some((segment) => {
    const rows = offer.baggage.filter((row) => row.segmentId === segment.id);
    return rows.length !== 1 || rows[0].checkedKg === null || !Number.isFinite(rows[0].checkedKg) || rows[0].checkedKg < intent.hard.minimumCheckedKg!;
  })) return false;
  return true;
}

function eligibleResults(response: SearchResponse, intent: TravelIntent): FlightSearchResult[] {
  return response.flights.flatMap((result) => {
    if (result.flight.source.mode !== (intent.mode === "live" ? "live" : "demo")) return [];
    if (intent.hard.nonstopOnly && result.flight.stops !== 0) return [];
    if (intent.hard.departurePeriod !== "any" && !matchesDeparturePeriod(result, intent.hard.departurePeriod)) return [];
    if (intent.hard.riskCategories.length && (result.historyCategory === "unknown" || result.historySortRate === null || !intent.hard.riskCategories.includes(result.historyCategory))) return [];
    if (intent.hard.airlineIds.length && !result.flight.segments.every((segment) => intent.hard.airlineIds.includes(segment.airlineId))) return [];
    const eligibleOffers = result.eligibleOffers.filter((offer) => eligibleOffer(result, offer, intent));
    return eligibleOffers.length ? [{ ...result, eligibleOffers }] : [];
  });
}

function knownBaggage(legs: FlightSearchResult[]): number | null {
  const amounts: number[] = [];
  for (const result of legs) for (const segment of result.flight.segments) {
    const rows = result.selectedOffer.baggage.filter((row) => row.segmentId === segment.id);
    if (rows.length !== 1 || rows[0].checkedKg === null || !Number.isFinite(rows[0].checkedKg) || rows[0].checkedKg < 0) return null;
    amounts.push(rows[0].checkedKg);
  }
  return amounts.length ? Math.min(...amounts) : null;
}

function departureMinute(result: FlightSearchResult): number | null {
  const first = result.flight.segments[0];
  const zone = first.originTimeZone ?? AIRPORTS.find((airport) => airport.code === first.origin)?.timeZone;
  return zone ? localMinuteAt(first.departureAt, zone) : null;
}

function matchesDeparturePeriod(result: FlightSearchResult, period: TravelIntent["soft"]["departurePeriod"]): boolean {
  const minute = departureMinute(result);
  if (minute === null) return false;
  return period === "morning" ? minute >= 360 && minute < 720 : period === "afternoon" ? minute >= 720 && minute < 1080 : period === "evening" ? minute >= 1080 || minute < 360 : true;
}

function scheduleUtility(result: FlightSearchResult, period: TravelIntent["soft"]["departurePeriod"]): number {
  const minute = departureMinute(result);
  if (minute === null) return 0.5;
  const windows: [number, number][] = period === "morning" ? [[360, 720]] : period === "afternoon" ? [[720, 1080]] : [[0, 360], [1080, 1440]];
  if (matchesDeparturePeriod(result, period)) return 1;
  const distance = Math.min(...windows.flatMap(([start, end]) => [Math.abs(minute - start), Math.abs(minute - (end - 1)), 1440 - Math.abs(minute - start), 1440 - Math.abs(minute - (end - 1))]));
  return clamp(1 - distance / RANKING_POLICY.scheduleDistanceReferenceMinutes);
}

function weightsFor(intent: TravelIntent): Record<AssistantDimension, number> {
  const weights = { ...ASSISTANT_RANKING_POLICY.weights } as Record<AssistantDimension, number>;
  for (const key of intent.soft.priorities) weights[key] *= ASSISTANT_RANKING_POLICY.priorityMultiplier;
  if (intent.soft.departurePeriod === "any") weights.departure = 0;
  if (!intent.soft.priorities.includes("baggage")) weights.baggage = 0;
  if (!intent.soft.priorities.includes("refundability")) weights.refundability = 0;
  if (intent.soft.preferredAirlineIds.length === 0) weights.airline = 0;
  const correlatedWeight = weights.duration + weights.stops;
  if (correlatedWeight > ASSISTANT_RANKING_POLICY.combinedDurationStopsWeight) {
    const ratio = ASSISTANT_RANKING_POLICY.combinedDurationStopsWeight / correlatedWeight;
    weights.duration *= ratio; weights.stops *= ratio;
  }
  return weights;
}

/** Suitability utilities, never a factual quality, safety, confidence, or cancellation probability. */
export function scoreAssistantJourney(legs: FlightSearchResult[], intentValue: TravelIntent): { score: number; dimensions: AssistantScoreDimension[]; reasons: string[] } {
  return scoreParsedJourney(legs, parseTravelIntent(intentValue));
}

function scoreParsedJourney(legs: FlightSearchResult[], intent: TravelIntent): { score: number; dimensions: AssistantScoreDimension[]; reasons: string[] } {
  if (legs.length !== (intent.tripType === "round-trip" ? 2 : 1)) throw new TypeError("تعداد مسیرهای امتیازدهی معتبر نیست.");
  const selection: JourneySelection = { tripType: intent.tripType, adults: intent.passengers.adults,
    legs: legs.map((result, index) => ({ direction: index ? "inbound" : "outbound", flight: result.flight, offer: result.selectedOffer })) };
  const total = journeyTotal(selection);
  const baggage = knownBaggage(legs);
  const historyKnown = legs.every((result) => result.historyCategory !== "unknown" && result.historySortRate !== null && Number.isFinite(result.historySortRate) && result.historySortRate >= 0 && result.historySortRate <= 1);
  const history = historyKnown ? Math.max(...legs.map((result) => result.historySortRate!)) : null;
  const refunds = legs.map((result) => result.selectedOffer.refundability);
  const refundKnown = refunds.every((value) => value !== "unknown");
  const allAirlines = legs.flatMap((result) => result.flight.segments.map((segment) => segment.airlineId));
  const meanDuration = legs.reduce((sum, result) => sum + result.flight.durationMinutes, 0) / legs.length;
  const utilities: Record<AssistantDimension, { value: number; known: boolean }> = {
    price: { value: 1 / (1 + total.amountRials / (RANKING_POLICY.priceReferenceRialsPerAdult * intent.passengers.adults * legs.length)), known: true },
    history: { value: history === null ? 0.5 : 1 - history, known: history !== null },
    departure: { value: legs.reduce((sum, result) => sum + scheduleUtility(result, intent.soft.departurePeriod), 0) / legs.length, known: intent.soft.departurePeriod !== "any" },
    duration: { value: 1 / (1 + meanDuration / RANKING_POLICY.durationReferenceMinutes), known: true },
    stops: { value: legs.reduce((sum, result) => sum + 1 / (1 + result.flight.stops), 0) / legs.length, known: true },
    baggage: { value: baggage === null ? 0.5 : clamp(baggage / ASSISTANT_RANKING_POLICY.checkedBagReferenceKg), known: baggage !== null },
    refundability: { value: refundKnown ? refunds.filter((value) => value === "refundable").length / refunds.length : 0.5, known: refundKnown },
    airline: { value: allAirlines.filter((airline) => intent.soft.preferredAirlineIds.includes(airline)).length / allAirlines.length, known: intent.soft.preferredAirlineIds.length > 0 },
  };
  const weights = weightsFor(intent);
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const dimensions = ASSISTANT_DIMENSIONS.map((dimension) => ({ dimension, utility: clamp(utilities[dimension].value), weight: weights[dimension] / totalWeight, known: utilities[dimension].known,
    contribution: 100 * weights[dimension] * clamp(utilities[dimension].value) / totalWeight }));
  const reasons = [`قیمت کل ${legs.length === 2 ? "رفت‌وبرگشت" : "سفر"} برای ${numbers.format(intent.passengers.adults)} بزرگسال: ${formatToman(total)}.`];
  if (intent.hard.maxTotalPriceRials !== null && total.amountRials <= intent.hard.maxTotalPriceRials) reasons.push("مجموع همین پیشنهادهای فروشنده در سقف بودجهٔ تعیین‌شده قرار دارد.");
  if (weights.departure && utilities.departure.value === 1) reasons.push(`ساعت حرکت ${legs.length === 2 ? "هر دو مسیر" : "این پرواز"} در بازهٔ ${intent.soft.departurePeriod === "morning" ? "صبح" : intent.soft.departurePeriod === "afternoon" ? "بعدازظهر" : "شب"} درخواستی است.`);
  if (weights.baggage && baggage !== null) reasons.push(`حداقل بار تحویلی همین پیشنهادها برای هر بزرگسال و هر بخش ${numbers.format(baggage)} کیلوگرم است.`);
  if (weights.refundability && refundKnown && refunds.every((value) => value === "refundable")) reasons.push("همین پیشنهادهای انتخاب‌شده طبق شرایط فروشنده قابل استردادند.");
  if (weights.airline && utilities.airline.value === 1) reasons.push("ایرلاین تمام بخش‌ها با ترجیح انتخاب‌شده مطابقت دارد.");
  if (history === null) reasons.push("دادهٔ کافی سابقه لغو برای تمام بخش‌ها موجود نیست؛ سهم این عامل در امتیاز خنثی است.");
  else reasons.push("سابقهٔ لغو از داده‌های کافی ۳۰ روز گذشته در امتیاز لحاظ شده؛ پیش‌بینی احتمال لغو آینده نیست.");
  if (legs.some((result) => result.flight.source.mode === "demo")) reasons.push("پروازها، قیمت‌ها و سابقهٔ لغو در این مجموعه آزمایشی هستند.");
  return { score: dimensions.reduce((sum, dimension) => sum + dimension.contribution, 0), dimensions, reasons };
}

function chronological(outbound: FlightSearchResult, inbound: FlightSearchResult): boolean {
  const out = outbound.flight.segments, back = inbound.flight.segments;
  return out.length > 0 && back.length > 0 && out[0].origin === back.at(-1)!.destination && out.at(-1)!.destination === back[0].origin
    && parseUtcInstant(back[0].departureAt).epochMilliseconds > parseUtcInstant(out.at(-1)!.arrivalAt).epochMilliseconds;
}

/** Inventory is supplied by the existing search service. Model output can never supply flight values. */
export async function recommendAssistantFlights(intentValue: TravelIntent, options: AssistantRecommendationOptions): Promise<AssistantRecommendationResponse> {
  const intent = parseTravelIntent(intentValue);
  if (intent.mode === "fixture") return { recommendations: [], totalCandidates: 0, outbound: null, inbound: null,
    question: "واحد مبلغ پاسخ مرجع تأیید نشده؛ پیشنهاد قیمتی و خرید برای این حالت فعال نیست.", issues: [{ field: "mode", message: "دادهٔ مرجع بدون قیمت تأییدشده است؛ حالت داده را صریحاً تغییر بده." }] };
  const validation = validateAssistantIntent(intent, options.context);
  const empty: AssistantRecommendationResponse = { recommendations: [], totalCandidates: 0, outbound: null, inbound: null, question: validation.question, issues: validation.issues };
  if (!validation.query) return empty;
  const limit = options.limit ?? 3;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 3) throw new RangeError("حداکثر سه پیشنهاد پشتیبانی می‌شود.");
  const directions = intent.tripType === "round-trip" ? ["outbound", "inbound"] as const : ["outbound"] as const;
  const responses = await Promise.allSettled(directions.map(async (direction) => options.search({ query: journeyLegQuery(validation.query!, direction), filters: {}, sort: "recommended", mode: intent.mode })));
  const issues: AssistantRecommendationResponse["issues"] = [];
  const getResponse = (index: number): SearchResponse | null => {
    const response = responses[index];
    if (!response) return null;
    if (response.status === "fulfilled") {
      const expected = journeyLegQuery(validation.query!, directions[index]);
      const actual = response.value.query;
      if (response.value.mode === intent.mode && (["origin", "destination", "departureDate", "adults", "currency"] as const).every((key) => actual[key] === expected[key])) return response.value;
    }
    issues.push({ field: `search.${directions[index]}`, message: `${index ? "جست‌وجوی برگشت" : "جست‌وجوی رفت"} انجام نشد؛ بدون جایگزینی اطلاعات، دوباره تلاش کن.` });
    return null;
  };
  const outbound = getResponse(0), inbound = getResponse(1);
  if (!outbound || intent.tripType === "round-trip" && !inbound) return { ...empty, outbound, inbound, issues, question: issues[0]?.message ?? null };
  const outgoing = eligibleResults(outbound, intent).flatMap((result) => {
    if (!options.pinnedOutbound) return [result];
    if (result.flight.id !== options.pinnedOutbound.flightId) return [];
    const eligibleOffers = result.eligibleOffers.filter((offer) => offer.id === options.pinnedOutbound!.offerId);
    return eligibleOffers.length ? [{ ...result, eligibleOffers }] : [];
  });
  const returning = inbound ? eligibleResults(inbound, intent) : [];
  if (options.pinnedOutbound && outgoing.length === 0) issues.push({ field: "pinnedOutbound", message: "پیشنهاد رفت انتخاب‌شده با شرایط فعلی سازگار نیست؛ دوباره یک پیشنهاد معتبر انتخاب کن." });
  const candidates = new Map<string, AssistantRecommendation>();
  const add = (legs: FlightSearchResult[]) => {
    const selection: JourneySelection = { tripType: intent.tripType, adults: intent.passengers.adults, legs: legs.map((result, index) => ({ direction: index ? "inbound" : "outbound", flight: result.flight, offer: result.selectedOffer })) };
    let total: number;
    try { total = journeyTotal(selection).amountRials; } catch { return; }
    if (intent.hard.maxTotalPriceRials !== null && total > intent.hard.maxTotalPriceRials) return;
    const id = legs.map((result) => result.flight.id).join("::");
    const scored = scoreParsedJourney(legs, intent);
    // Existing cheapest-fare reasons must not follow a different assistant-selected seller.
    const selectedLegs = legs.map((result, index) => {
      const otherLegsTotal = BigInt(total) - BigInt(result.selectedOffer.totalPrice.amountRials);
      const ceiling = BigInt(intent.hard.maxTotalPriceRials ?? Number.MAX_SAFE_INTEGER);
      // Seller alternatives are conditional on the other exact selected leg, not a per-leg budget.
      const eligibleOffers = result.eligibleOffers.filter((offer) => otherLegsTotal + BigInt(offer.totalPrice.amountRials) <= ceiling
        && (!options.pinnedOutbound || index !== 0 || offer.id === options.pinnedOutbound.offerId));
      return { ...result, eligibleOffers, score: scored.score, reasons: [...scored.reasons] };
    });
    const candidate = { id, selection, legs: selectedLegs, ...scored };
    const previous = candidates.get(id);
    if (!previous || compareRecommendations(candidate, previous) < 0) candidates.set(id, candidate);
  };
  for (const out of outgoing) {
    if (intent.tripType === "one-way") for (const offer of out.eligibleOffers) add([{ ...out, selectedOffer: offer }]);
    else for (const back of returning) {
      if (!chronological(out, back)) continue;
      for (const offer of out.eligibleOffers) for (const backOffer of back.eligibleOffers) add([{ ...out, selectedOffer: offer }, { ...back, selectedOffer: backOffer }]);
    }
  }
  const rankedCandidates = [...candidates.values()].sort(compareRecommendations);
  const activeFlightIds = new Set<string>();
  const recommendations = rankedCandidates.filter((candidate) => {
    const activeFlightId = candidate.legs[options.pinnedOutbound && intent.tripType === "round-trip" ? 1 : 0].flight.id;
    if (activeFlightIds.has(activeFlightId)) return false;
    activeFlightIds.add(activeFlightId);
    return true;
  }).slice(0, limit);
  return { recommendations, totalCandidates: candidates.size, outbound, inbound, question: issues[0]?.message ?? null, issues };
}

function compareRecommendations(left: AssistantRecommendation, right: AssistantRecommendation): number {
  return right.score - left.score || journeyTotal(left.selection).amountRials - journeyTotal(right.selection).amountRials
    || left.legs.reduce((sum, result) => sum + result.flight.durationMinutes, 0) - right.legs.reduce((sum, result) => sum + result.flight.durationMinutes, 0)
    || compareId(left.id, right.id) || compareId(left.legs.map((result) => result.selectedOffer.id).join("::"), right.legs.map((result) => result.selectedOffer.id).join("::"));
}

export const recommendTravel = recommendAssistantFlights;
