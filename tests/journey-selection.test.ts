import { describe, expect, it } from "vitest";
import { journeyTotal, parseJourneySelection, type JourneySelection } from "@/domain/journey-selection";
import { loadDemoFlights } from "@/fixtures/demo";
import { formatToman } from "@/domain/money";

function selection(roundTrip = false, adults = 1): JourneySelection {
  const outbound = loadDemoFlights({ origin: "THR", destination: "MHD", departureDate: "2026-10-16", adults, currency: "IRR" })[0];
  const inbound = loadDemoFlights({ origin: "MHD", destination: "THR", departureDate: "2026-10-20", adults, currency: "IRR" })[0];
  return { tripType: roundTrip ? "round-trip" : "one-way", adults, legs: [{ direction: "outbound", flight: outbound, offer: outbound.offers[0] }, ...(roundTrip ? [{ direction: "inbound" as const, flight: inbound, offer: inbound.offers[0] }] : [])] };
}
describe("selected journey snapshots", () => {
  it("normalizes a complete immutable selected fare and keeps seller, schedule, source and canonical money", () => {
    const input = selection();
    const safe = parseJourneySelection(input);
    expect(safe.legs[0].offer).toMatchObject({ id: input.legs[0].offer.id, sellerId: input.legs[0].offer.sellerId, baggage: input.legs[0].offer.baggage, totalPrice: input.legs[0].offer.totalPrice, sourceState: "FIXTURE" });
    expect(safe.legs[0].flight.segments).toEqual(input.legs[0].flight.segments);
    expect(safe.legs[0].flight.offers).toEqual([safe.legs[0].offer]);
    input.legs[0].offer.totalPrice.amountRials = 0;
    expect(safe.legs[0].offer.totalPrice.amountRials).toBeGreaterThan(0);
  });
  it("sums complete party prices for both directions without a second passenger multiplication or currency conversion", () => {
    const input = parseJourneySelection(selection(true, 3));
    const expected = input.legs.reduce((sum, leg) => sum + leg.offer.totalPrice.amountRials, 0);
    expect(journeyTotal(input)).toEqual({ currency: "IRR", unit: "rial", amountRials: expected });
    expect(formatToman(journeyTotal(input))).toContain("تومان");
  });
  it("accepts a consistent verified live source without treating it as locally issuable", () => {
    const input = selection();
    input.legs[0].flight.source = { mode: "live", id: "verified-source", label: "Verified provider" };
    input.legs[0].flight.offers.forEach((offer) => {
      offer.source = { ...input.legs[0].flight.source };
      offer.sourceState = "LIVE";
      offer.freshness = "live";
    });
    expect(parseJourneySelection(input).legs[0].offer.source.mode).toBe("live");
  });
  it.each(["live", "unavailable"])("rejects a seller source that does not match its demo flight: %s", (mode) => {
    const input = selection();
    input.legs[0].offer.source = { ...input.legs[0].offer.source, mode: mode as "live" | "unavailable" };
    expect(() => parseJourneySelection(input)).toThrow(/منبع/);
  });
  it.each(["currency", "unit", "unsafe", "incomplete", "availability", "adultCount", "absentOffer", "missingBag", "stopCount", "duration", "unknownAirport", "selfTransfer"])("rejects an invalid selection boundary: %s", (mutation) => {
    const input = selection();
    const leg = input.legs[0];
    if (mutation === "currency") Object.assign(leg.offer.totalPrice, { currency: "USD" });
    if (mutation === "unit") Object.assign(leg.offer.totalPrice, { unit: "toman" });
    if (mutation === "unsafe") leg.offer.totalPrice.amountRials = Number.MAX_SAFE_INTEGER + 1;
    if (mutation === "incomplete") leg.offer.priceComplete = false;
    if (mutation === "availability") leg.offer.availability = "unknown";
    if (mutation === "adultCount") leg.offer.adults = 2;
    if (mutation === "absentOffer") leg.flight.offers = [];
    if (mutation === "missingBag") leg.offer.baggage = [];
    if (mutation === "stopCount") leg.flight.stops = 1;
    if (mutation === "duration") leg.flight.durationMinutes += 1;
    if (mutation === "unknownAirport") leg.flight.segments[0].origin = "ZZZ";
    if (mutation === "selfTransfer") leg.offer.ticketing = "self-transfer";
    expect(() => parseJourneySelection(input)).toThrow();
  });
  it("restores optional legacy zones only from the curated airport catalog", () => {
    const input = selection();
    delete input.legs[0].flight.segments[0].originTimeZone;
    expect(parseJourneySelection(input).legs[0].flight.segments[0].originTimeZone).toBe("Asia/Tehran");
  });
  it("rejects wrong-direction, same-flight and overlapping round-trip snapshots", () => {
    const input = selection(true);
    input.legs[1].direction = "outbound";
    expect(() => parseJourneySelection(input)).toThrow();
    const same = selection(true);
    same.legs[1] = { ...same.legs[0], direction: "inbound" };
    expect(() => parseJourneySelection(same)).toThrow();
    const wrongDate = selection(true);
    const back = loadDemoFlights({ origin: "MHD", destination: "THR", departureDate: "2026-10-15", adults: 1, currency: "IRR" })[0];
    wrongDate.legs[1] = { direction: "inbound", flight: back, offer: back.offers[0] };
    expect(() => parseJourneySelection(wrongDate)).toThrow(/سازگار/);
  });
  it("compares connection instants numerically across equivalent fractional timestamp representations", () => {
    const input = selection();
    const connection = loadDemoFlights({ origin: "THR", destination: "MHD", departureDate: "2026-10-16", adults: 1, currency: "IRR" }).find((flight) => flight.stops === 1)!;
    connection.segments[0].arrivalAt = connection.segments[1].departureAt.replace("Z", ".000Z");
    input.legs[0] = { direction: "outbound", flight: connection, offer: connection.offers[0] };
    expect(() => parseJourneySelection(input)).toThrow(/اتصال/);
  });
  it("rejects a zero interval between round-trip legs regardless of fractional ISO formatting", () => {
    const input = selection(true);
    const out = input.legs[0].flight;
    const back = input.legs[1].flight;
    const outboundArrival = out.segments[0].arrivalAt;
    back.segments[0].departureAt = outboundArrival.replace("Z", ".000Z");
    back.segments[0].arrivalAt = new Date(Date.parse(outboundArrival) + back.durationMinutes * 60000).toISOString();
    expect(() => parseJourneySelection(input)).toThrow(/سازگار/);
  });
  it("rejects a sum beyond safe integer rials even when each leg is individually valid", () => {
    const input = selection(true);
    input.legs.forEach((leg) => { leg.offer.totalPrice.amountRials = Number.MAX_SAFE_INTEGER; });
    expect(() => parseJourneySelection(input)).toThrow(/محدوده/);
  });
});

