import { describe, expect, it, vi } from "vitest";
import { Temporal } from "@js-temporal/polyfill";
import { emptyTravelIntent, type AssistantDateContext, type TravelIntent } from "../src/domain/assistant-intent";
import { recommendAssistantFlights, scoreAssistantJourney } from "../src/application/assistant-recommendations";
import { searchFlights, type FlightSearchResult, type SearchRequest, type SearchResponse } from "../src/application/search-service";
import { journeyTotal, parseJourneySelection } from "../src/domain/journey-selection";

const context: AssistantDateContext = { now: "2026-10-16T05:00:00Z", timeZone: "Asia/Tehran", dateBounds: { min: "2026-10-15", max: "2036-12-31" } };
const intent = (): TravelIntent => ({ ...emptyTravelIntent(), origin: "THR", destination: "MHD", departureDate: "2026-10-20" });
const baseRequest: SearchRequest = { query: { origin: "THR", destination: "MHD", departureDate: "2026-10-20", adults: 1, currency: "IRR" }, filters: {}, sort: "recommended", mode: "demo" };
function flight(id: string, price: number, localHour = 8): FlightSearchResult {
  const result = structuredClone(searchFlights(baseRequest).flights[0]);
  result.flight.id = id;
  result.flight.segments = [{ ...result.flight.segments[0], id: `${id}-leg`, departureAt: Temporal.ZonedDateTime.from(`2026-10-20T${String(localHour).padStart(2, "0")}:00:00[Asia/Tehran]`).toInstant().toString(), arrivalAt: Temporal.ZonedDateTime.from(`2026-10-20T${String(localHour).padStart(2, "0")}:00:00[Asia/Tehran]`).add({ minutes: 90 }).toInstant().toString() }];
  result.flight.durationMinutes = 90; result.flight.stops = 0;
  result.historyCategory = "unknown"; result.historySortRate = null;
  const offer = { ...result.selectedOffer, id: `${id}-offer`, flightId: id, totalPrice: { ...result.selectedOffer.totalPrice, amountRials: price }, baggage: [{ segmentId: `${id}-leg`, checkedKg: 20, carryOnKg: 7 }], refundability: "non-refundable" as const };
  result.flight.offers = [offer]; result.eligibleOffers = [offer]; result.selectedOffer = offer;
  return result;
}
const response = (results: FlightSearchResult[]): SearchResponse => ({ ...searchFlights(baseRequest), flights: results });

describe("assistant recommendations grounded in existing inventory", () => {
  it("searches only after required criteria are supplied and keeps previous state untouched", async () => {
    const search = vi.fn(searchFlights);
    const result = await recommendAssistantFlights(emptyTravelIntent(), { context, search });
    expect(search).not.toHaveBeenCalled(); expect(result.recommendations).toEqual([]); expect(result.question).toContain("از کدوم");
  });
  it("finds up to three unique existing demo itineraries and exact seller offers usable by shared checkout", async () => {
    const result = await recommendAssistantFlights(intent(), { context, search: searchFlights });
    expect(result.totalCandidates).toBe(16); expect(result.recommendations).toHaveLength(3);
    expect(new Set(result.recommendations.map((item) => item.id)).size).toBe(3);
    for (const recommendation of result.recommendations) {
      expect(parseJourneySelection(recommendation.selection).legs[0].offer.id).toBe(recommendation.legs[0].selectedOffer.id);
      expect(recommendation.reasons.join(" ")).toContain("آزمایشی");
    }
  });
  it("ranks numeric party prices and retains lossless rial totals without a second conversion", async () => {
    const flights = [flight("expensive", 40_000_001), flight("cheap", 20_000_001)];
    const result = await recommendAssistantFlights(intent(), { context, search: () => response(flights) });
    expect(result.recommendations[0].id).toBe("cheap");
    expect(journeyTotal(result.recommendations[0].selection).amountRials).toBe(20_000_001);
    expect(result.recommendations[0].reasons.join(" ")).toContain("۲٬۰۰۰٬۰۰۰٫۱ تومان");
  });
  it("never combines one seller's cheap fare with another seller's baggage or refundability", async () => {
    const result = flight("fare-test", 20_000_000);
    result.eligibleOffers[0].baggage[0].checkedKg = 0;
    const dearer = { ...structuredClone(result.selectedOffer), id: "heavier", totalPrice: { ...result.selectedOffer.totalPrice, amountRials: 30_000_000 }, baggage: [{ segmentId: "fare-test-leg", checkedKg: 30, carryOnKg: 7 }], refundability: "refundable" as const };
    result.eligibleOffers.push(dearer); result.flight.offers.push(dearer);
    const request = intent(); request.hard.minimumCheckedKg = 25; request.hard.refundableOnly = true;
    const found = await recommendAssistantFlights(request, { context, search: () => response([result]) });
    expect(found.recommendations[0].selection.legs[0].offer.id).toBe("heavier");
    expect(found.recommendations[0].legs[0].eligibleOffers.map((offer) => offer.id)).toEqual(["heavier"]);
    request.hard.maxTotalPriceRials = 25_000_000;
    expect((await recommendAssistantFlights(request, { context, search: () => response([result]) })).recommendations).toEqual([]);
  });
  it("exposes only one-way seller alternatives that independently satisfy the total budget", async () => {
    const result = flight("one-way-budget", 20_000_000);
    const pricey = { ...structuredClone(result.selectedOffer), id: "over-budget", totalPrice: { ...result.selectedOffer.totalPrice, amountRials: 40_000_000 } };
    result.eligibleOffers.push(pricey); result.flight.offers.push(pricey);
    const request = intent(); request.hard.maxTotalPriceRials = 30_000_000;
    const found = await recommendAssistantFlights(request, { context, search: () => response([result]) });
    const leg = found.recommendations[0].legs[0];
    expect(leg.eligibleOffers.map((offer) => offer.id)).toEqual(["one-way-budget-offer"]);
    expect(leg.eligibleOffers).toContain(leg.selectedOffer);
    expect(leg.flight.offers.map((offer) => offer.id)).toEqual(["one-way-budget-offer", "over-budget"]);
    expect(result.eligibleOffers).toHaveLength(2);
  });
  it("bounds both directions' seller alternatives by the fixed counterpart fare and complete journey budget", async () => {
    const out = flight("outbound-budget", 20_000_000), back = flight("inbound-budget", 20_000_000);
    back.flight.segments[0] = { ...back.flight.segments[0], origin: "MHD", destination: "THR", departureAt: "2026-10-21T04:30:00Z", arrivalAt: "2026-10-21T06:00:00Z" };
    for (const leg of [out, back]) {
      const atCap = { ...structuredClone(leg.selectedOffer), id: `${leg.flight.id}-at-cap`, totalPrice: { ...leg.selectedOffer.totalPrice, amountRials: 40_000_000 } };
      const overCap = { ...structuredClone(leg.selectedOffer), id: `${leg.flight.id}-over-cap`, totalPrice: { ...leg.selectedOffer.totalPrice, amountRials: 40_000_001 } };
      leg.eligibleOffers.push(atCap, overCap); leg.flight.offers.push(atCap, overCap);
    }
    const request = intent(); request.tripType = "round-trip"; request.returnDate = "2026-10-21"; request.hard.maxTotalPriceRials = 60_000_000;
    const search = (input: SearchRequest): SearchResponse => ({ ...response(input.query.origin === "THR" ? [out] : [back]), query: input.query });
    const found = await recommendAssistantFlights(request, { context, search });
    const recommendation = found.recommendations[0];
    expect(recommendation.selection.legs.map((leg) => leg.offer.totalPrice.amountRials)).toEqual([20_000_000, 20_000_000]);
    for (const [index, leg] of recommendation.legs.entries()) {
      expect(leg.eligibleOffers.map((offer) => offer.id)).toEqual([`${leg.flight.id}-offer`, `${leg.flight.id}-at-cap`]);
      expect(leg.eligibleOffers).toContain(leg.selectedOffer);
      for (const offer of leg.eligibleOffers) {
        const selected = structuredClone(recommendation.selection); selected.legs[index].offer = offer;
        expect(journeyTotal(selected).amountRials).toBeLessThanOrEqual(60_000_000);
      }
      expect(leg.flight.offers).toHaveLength(3);
    }
    const pinned = await recommendAssistantFlights(request, { context, search, pinnedOutbound: { flightId: out.flight.id, offerId: `${out.flight.id}-at-cap` } });
    expect(pinned.recommendations[0].legs[0].eligibleOffers.map((offer) => offer.id)).toEqual([`${out.flight.id}-at-cap`]);
    expect(pinned.recommendations[0].legs[1].eligibleOffers.map((offer) => offer.id)).toEqual([`${back.flight.id}-offer`]);
    expect(pinned.recommendations[0].legs.every((leg) => leg.eligibleOffers.includes(leg.selectedOffer))).toBe(true);
  });
  it("rejects unknown baggage and refundability for affirmative mandatory requirements", async () => {
    const result = flight("unknown", 20_000_000);
    result.selectedOffer.baggage[0].checkedKg = null;
    result.selectedOffer.refundability = "unknown";
    const request = intent(); request.hard.minimumCheckedKg = 0;
    expect((await recommendAssistantFlights(request, { context, search: () => response([result]) })).recommendations).toEqual([]);
    request.hard.minimumCheckedKg = null; request.hard.refundableOnly = true;
    expect((await recommendAssistantFlights(request, { context, search: () => response([result]) })).recommendations).toEqual([]);
  });
  it("applies airline and nonstop hard constraints without modifying the base search engine", async () => {
    const direct = flight("direct", 25_000_000), stopped = flight("stopped", 20_000_000);
    direct.flight.segments[0].airlineId = "IRA"; stopped.flight.stops = 1;
    const request = intent(); request.hard.airlineIds = ["IRA"]; request.hard.nonstopOnly = true;
    expect((await recommendAssistantFlights(request, { context, search: () => response([direct, stopped]) })).recommendations.map((item) => item.id)).toEqual(["direct"]);
  });
  it("prioritizes sufficient historical evidence and leaves unknown history neutral", async () => {
    const low = flight("low", 30_000_000), high = flight("high", 30_000_000), unknown = flight("unknown", 30_000_000);
    low.historyCategory = "low"; low.historySortRate = 0.03;
    high.historyCategory = "high"; high.historySortRate = 0.8;
    const request = intent(); request.soft.priorities = ["history"];
    const found = await recommendAssistantFlights(request, { context, search: () => response([high, unknown, low]) });
    expect(found.recommendations.map((item) => item.id)).toEqual(["low", "unknown", "high"]);
    const dimension = found.recommendations[1].dimensions.find((item) => item.dimension === "history")!;
    expect(dimension.utility).toBe(0.5); expect(dimension.known).toBe(false);
    expect(found.recommendations[0].reasons.join(" ")).toContain("پیش‌بینی احتمال لغو آینده نیست");
    expect(found.recommendations[1].reasons.join(" ")).toContain("خنثی");
  });
  it("ranks actual origin-local morning and evening preferences without filtering other times", async () => {
    const morning = flight("morning", 30_000_000, 8), evening = flight("evening", 30_000_000, 20);
    const request = intent(); request.soft.departurePeriod = "morning";
    expect((await recommendAssistantFlights(request, { context, search: () => response([evening, morning]) })).recommendations[0].id).toBe("morning");
    request.soft.departurePeriod = "evening";
    expect((await recommendAssistantFlights(request, { context, search: () => response([morning, evening]) })).recommendations[0].id).toBe("evening");
  });
  it("enforces mandatory departure windows, including the noon boundary", async () => {
    const request = intent(); request.hard.departurePeriod = "morning";
    const found = await recommendAssistantFlights(request, { context, search: () => response([flight("morning", 30_000_000, 8), flight("noon", 30_000_000, 12), flight("night", 30_000_000, 20)]) });
    expect(found.recommendations.map((item) => item.id)).toEqual(["morning"]);
    request.hard.departurePeriod = "any"; request.soft.departurePeriod = "morning";
    const noon = scoreAssistantJourney([flight("noon", 30_000_000, 12)], request);
    expect(noon.dimensions.find((item) => item.dimension === "departure")!.utility).toBeLessThan(1);
    expect(noon.reasons.join(" ")).not.toContain("در بازهٔ صبح");
  });
  it("excludes unknown history from affirmative low-history hard requirements", async () => {
    const low = flight("low", 30_000_000), high = flight("high", 30_000_000), unknown = flight("unknown", 30_000_000);
    low.historyCategory = "low"; low.historySortRate = 0.03;
    high.historyCategory = "high"; high.historySortRate = 0.3;
    const request = intent(); request.hard.riskCategories = ["low"];
    const found = await recommendAssistantFlights(request, { context, search: () => response([unknown, high, low]) });
    expect(found.recommendations.map((item) => item.id)).toEqual(["low"]);
  });
  it("adjusts the requested price priority instead of treating every preference as the default score", async () => {
    const cheap = flight("cheap", 10_000_000), quick = flight("quick", 60_000_000);
    cheap.flight.durationMinutes = 480; cheap.flight.stops = 1;
    const request = intent();
    expect((await recommendAssistantFlights(request, { context, search: () => response([cheap, quick]) })).recommendations[0].id).toBe("quick");
    request.soft.priorities = ["price"];
    expect((await recommendAssistantFlights(request, { context, search: () => response([cheap, quick]) })).recommendations[0].id).toBe("cheap");
  });
  it("scores all eight factors, keeps unknown evidence neutral and globally normalizes active weights", () => {
    const result = flight("all", 30_000_000);
    const request = intent(); request.soft.priorities = ["duration", "stops", "baggage", "refundability"]; request.soft.departurePeriod = "morning"; request.soft.preferredAirlineIds = ["IRA"];
    result.selectedOffer.baggage[0].checkedKg = null; result.selectedOffer.refundability = "unknown";
    const scored = scoreAssistantJourney([result], request);
    expect(scored.dimensions).toHaveLength(8);
    expect(scored.dimensions.reduce((sum, item) => sum + item.weight, 0)).toBeCloseTo(1);
    for (const dimension of scored.dimensions) expect(dimension.utility).toBeGreaterThanOrEqual(0);
    expect(scored.dimensions.find((item) => item.dimension === "baggage")).toMatchObject({ known: false, utility: 0.5 });
    expect(scored.dimensions.find((item) => item.dimension === "refundability")).toMatchObject({ known: false, utility: 0.5 });
    expect(scored.reasons.join(" ")).not.toContain("قابل استردادند");
    const ordinary = scoreAssistantJourney([result], intent());
    expect(ordinary.dimensions.find((item) => item.dimension === "baggage")?.weight).toBe(0);
  });
  it("breaks equal scores deterministically by stable identities rather than input order", async () => {
    const a = flight("a", 30_000_000), b = flight("b", 30_000_000);
    expect((await recommendAssistantFlights(intent(), { context, search: () => response([b, a]) })).recommendations.map((item) => item.id)).toEqual(["a", "b"]);
  });
  it("treats round-trip budget as the combined party total and validates actual chronology", async () => {
    const request = intent(); request.tripType = "round-trip"; request.returnDate = "2026-10-21"; request.passengers.adults = 2;
    request.hard.maxTotalPriceRials = 110_000_000;
    const found = await recommendAssistantFlights(request, { context, search: searchFlights });
    expect(found.recommendations.length).toBeGreaterThan(0);
    for (const recommendation of found.recommendations) {
      expect(journeyTotal(recommendation.selection).amountRials).toBeLessThanOrEqual(110_000_000);
      expect(recommendation.selection.legs).toHaveLength(2);
      expect(parseJourneySelection(recommendation.selection).adults).toBe(2);
    }
    request.hard.maxTotalPriceRials = 1;
    expect((await recommendAssistantFlights(request, { context, search: searchFlights })).recommendations).toEqual([]);
  });
  it("resolves a pinned outbound flight and seller only from eligible inventory", async () => {
    const request = intent(); request.tripType = "round-trip"; request.returnDate = "2026-10-21";
    const initial = await recommendAssistantFlights(request, { context, search: searchFlights });
    const leg = initial.recommendations[0].selection.legs[0];
    const found = await recommendAssistantFlights(request, { context, search: searchFlights, pinnedOutbound: { flightId: leg.flight.id, offerId: leg.offer.id } });
    expect(found.recommendations.length).toBeGreaterThan(0);
    expect(found.recommendations.every((item) => item.selection.legs[0].offer.id === leg.offer.id)).toBe(true);
    expect((await recommendAssistantFlights(request, { context, search: searchFlights, pinnedOutbound: { flightId: leg.flight.id, offerId: "invented" } })).recommendations).toEqual([]);
  });
  it("presents distinct outbound choices, then distinct inbound choices without losing compatible journey ranking", async () => {
    const request = intent(); request.tripType = "round-trip"; request.returnDate = "2026-10-21";
    const unpinned = await recommendAssistantFlights(request, { context, search: searchFlights });
    expect(unpinned.recommendations).toHaveLength(3);
    expect(new Set(unpinned.recommendations.map((item) => item.legs[0].flight.id)).size).toBe(3);
    // A late outbound can arrive after the following day's earliest return; it is not a valid pair.
    const chronologicalPairCount = unpinned.outbound!.flights.reduce((count, out) => count + unpinned.inbound!.flights.filter((back) => Date.parse(back.flight.segments[0].departureAt) > Date.parse(out.flight.segments.at(-1)!.arrivalAt)).length, 0);
    expect(unpinned.totalCandidates).toBe(chronologicalPairCount);
    expect(unpinned.totalCandidates).toBeGreaterThan(3);
    const outbound = unpinned.recommendations[0].selection.legs[0];
    const pinned = await recommendAssistantFlights(request, { context, search: searchFlights, pinnedOutbound: { flightId: outbound.flight.id, offerId: outbound.offer.id } });
    expect(pinned.recommendations).toHaveLength(3);
    expect(new Set(pinned.recommendations.map((item) => item.legs[1].flight.id)).size).toBe(3);
    expect(new Set(pinned.recommendations.map((item) => item.legs[0].flight.id))).toEqual(new Set([outbound.flight.id]));
    expect(pinned.totalCandidates).toBe(16);
    for (const item of [...unpinned.recommendations, ...pinned.recommendations]) expect(() => parseJourneySelection(item.selection)).not.toThrow();
  });
  it("preserves independently successful outbound data when inbound provider fails, with no fabricated pairs", async () => {
    const request = intent(); request.tripType = "round-trip"; request.returnDate = "2026-10-21";
    const found = await recommendAssistantFlights(request, { context, search: (query) => query.query.origin === "MHD" ? Promise.reject(new Error("SECRET PROVIDER ERROR")) : searchFlights(query) });
    expect(found.outbound?.flights.length).toBeGreaterThan(0); expect(found.inbound).toBeNull(); expect(found.recommendations).toEqual([]);
    expect(found.issues[0].message).not.toContain("SECRET");
  });
  it("never silently supplies fixtures for live failures or unverified reference prices", async () => {
    const request = intent(); request.mode = "live";
    const search = vi.fn(() => { throw new Error("offline"); });
    expect((await recommendAssistantFlights(request, { context, search })).recommendations).toEqual([]);
    expect(search.mock.calls).toHaveLength(1);
    request.mode = "fixture";
    request.departureDate = "2026-10-15";
    const reference = await recommendAssistantFlights(request, { context, search });
    expect(reference.recommendations).toEqual([]); expect(reference.question).toContain("واحد مبلغ"); expect(search.mock.calls).toHaveLength(1);
  });
  it("returns truthful empty results for unsupported inventory without wrong-route substitution", async () => {
    const request = intent(); request.origin = "TBZ"; request.destination = "KIH";
    const found = await recommendAssistantFlights(request, { context, search: searchFlights });
    expect(found.recommendations).toEqual([]); expect(found.totalCandidates).toBe(0);
  });
  it("rejects a mismatched search context or source mode without exposing those unrelated offers", async () => {
    const request = intent(); request.mode = "live";
    expect((await recommendAssistantFlights(request, { context, search: () => response([flight("demo", 20_000_000)]) })).outbound).toBeNull();
    request.mode = "demo"; request.destination = "KIH";
    const found = await recommendAssistantFlights(request, { context, search: () => response([flight("wrongroute", 20_000_000)]) });
    expect(found.outbound).toBeNull(); expect(found.recommendations).toEqual([]);
  });
});
