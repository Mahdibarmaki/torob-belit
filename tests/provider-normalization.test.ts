import { describe, expect, it } from "vitest";
import { groupFlightOffers, normalizeFlightOffer } from "@/application/normalize-offers";
import { searchFlights } from "@/application/search-service";
import { toRialMoney, formatToman } from "@/domain/money";
import { descriptor, NOW, QUERY, testOffer } from "./provider-fixtures";

const normalize = (value: unknown) => normalizeFlightOffer(value, descriptor(), QUERY, new Date(NOW).toISOString());

describe("normalized provider output boundary (synthetic test transport only)", () => {
  it("preserves a supplied aircraft model without inferring one for missing data", () => {
    const input = testOffer();
    input.segments[0].aircraftModel = "Airbus A320";
    expect(normalize(input).segments[0].aircraftModel).toBe("Airbus A320");
    expect(normalize(testOffer()).segments[0].aircraftModel).toBeUndefined();
    input.segments[0].aircraftModel = "bad\u0000model";
    expect(() => normalize(input)).toThrow();
  });
  it("retains source, unknown conditions, explicit money and verified airport zones", () => {
    const offer = normalize(testOffer());
    expect(offer.source).toEqual({ mode: "live", id: "alibaba", label: "Test alibaba" });
    expect(offer.baggage[0].checkedKg).toBeNull();
    expect(offer.fareConditions.refunds).toBeNull();
    expect(offer.segments[0].originTimeZone).toBe("Asia/Tehran");
    expect(offer.totalPrice.amountRials).toBe(60_000_001);
    expect(formatToman(offer.totalPrice)).toBe("۶٬۰۰۰٬۰۰۰٫۱ تومان");
  });
  it.each([
    { source: { mode: "demo", id: "alibaba", label: "Test alibaba" } },
    { source: { mode: "live", id: "flytoday", label: "Test alibaba" } },
    { providerId: "flytoday" }, { providerName: "Untrusted" }, { adults: 2 }, { cabin: "business" },
    { fetchedAt: "2026-10-15T12:00:01Z" }, { stops: 1 },
    { totalPrice: { currency: "IRR", unit: "toman", amountRials: 6_000_000 } },
    { totalPrice: { currency: "USD", unit: "rial", amountRials: 6_000_000 } },
    { totalPrice: { currency: "IRR", unit: "rial", amountRials: 1.5 } },
    { totalPrice: { currency: "IRR", unit: "rial", amountRials: Number.MAX_SAFE_INTEGER + 1 } },
    { baggage: [] }, { priceComplete: undefined }, { availability: "maybe" }, { fareConditions: {} },
  ])("rejects ambiguity, synthetic provenance and inconsistent contracts %#", (change) => {
    expect(() => normalize({ ...testOffer(), ...change })).toThrow();
  });
  it.each(["http://alibaba.ir/a", "https://alibaba.ir.evil.test/a", "https://evil.test/a", "https://user:secret@alibaba.ir/a", "https://alibaba.ir:8443/a", "javascript:alert(1)"])("rejects unsafe booking URL %s", (url) => {
    expect(() => normalize(testOffer("alibaba", { bookingUrl: url }))).toThrow();
  });
  it("does not invent a booking URL when absent", () => { expect(normalize(testOffer("alibaba", { bookingUrl: null })).bookingUrl).toBeNull(); });
  it("normalizes explicitly tagged provider Toman at the adapter boundary exactly once", () => {
    const totalPrice = toRialMoney({ amount: 6_000_000.1, unit: "toman" });
    expect(normalize(testOffer("alibaba", { totalPrice })).totalPrice.amountRials).toBe(60_000_001);
    expect(toRialMoney({ amount: totalPrice.amountRials, unit: "rial" })).toEqual(totalPrice);
  });
  it("matches first departure in origin local date, not UTC date", () => {
    const offer = testOffer();
    offer.segments[0].departureAt = "2026-10-15T21:00:00Z";
    offer.segments[0].arrivalAt = "2026-10-16T01:00:00Z";
    expect(normalize(offer).segments[0].departureAt).toBe("2026-10-15T21:00:00Z");
    offer.segments[0].departureAt = "2026-10-15T19:00:00Z";
    expect(() => normalize(offer)).toThrow();
  });
  it("rejects missing operating identity, inverted times and unverified zones", () => {
    for (const fields of [{ airlineId: "" }, { flightNumber: "" }, { arrivalAt: "2026-10-16T04:00:00Z" }, { originTimeZone: "UTC" }]) {
      const offer = testOffer(); Object.assign(offer.segments[0], fields);
      expect(() => normalize(offer)).toThrow();
    }
  });
});

describe("exact flight service grouping and independent seller offers", () => {
  it("retains the actual fixture dataset attribution and isolates different fixture datasets", () => {
    const source = { mode: "demo" as const, id: "documented-test-fixture", label: "Test saved response" };
    const fixture = { ...normalize(testOffer()), sourceState: "FIXTURE" as const, source };
    const other = { ...fixture, source: { ...source, id: "different-fixture" } };
    expect(groupFlightOffers([fixture])[0].source).toEqual(source);
    expect(groupFlightOffers([fixture, other])).toHaveLength(2);
    expect(groupFlightOffers([fixture])[0].offers[0].freshness).toBe("fixture");
  });
  it("groups providers for identical services and remaps per-offer baggage", () => {
    const a = normalize(testOffer());
    const input = testOffer("flytoday"); input.segments[0].id = "other-leg"; input.baggage[0].segmentId = "other-leg";
    const b = normalizeFlightOffer(input, descriptor("flytoday"), QUERY, new Date(NOW).toISOString());
    const flights = groupFlightOffers([a, b, a], { flytoday: "cached" });
    expect(flights).toHaveLength(1); expect(flights[0].offers).toHaveLength(2);
    expect(flights[0].offers[1].freshness).toBe("cached");
    expect(flights[0].offers.every((offer) => offer.baggage[0].segmentId === flights[0].segments[0].id)).toBe(true);
    expect(flights[0].history).toBeUndefined();
  });
  it("keeps flight-number suffixes and schedule differences separate", () => {
    const a = normalize(testOffer()); const b = structuredClone(a); b.providerOfferId = "another"; b.segments[0].flightNumber = "101B";
    const c = structuredClone(a); c.providerOfferId = "later"; c.segments[0].departureAt = "2026-10-16T05:01:00Z";
    expect(groupFlightOffers([a, b, c])).toHaveLength(3);
  });
  it("retains distinct seller/fare IDs and picks only the newest unambiguous duplicate", () => {
    const a = normalize(testOffer()); const fare = { ...a, providerOfferId: "fare-2" }; const seller = { ...a, sellerId: "seller-2" };
    expect(groupFlightOffers([a, fare, seller])[0].offers).toHaveLength(3);
    const newer = { ...a, fetchedAt: "2026-10-15T12:00:01Z", totalPrice: { ...a.totalPrice, amountRials: 70_000_000 } };
    expect(groupFlightOffers([a, newer])[0].offers[0].totalPrice.amountRials).toBe(70_000_000);
    expect(groupFlightOffers([a, { ...a, totalPrice: { ...a.totalPrice, amountRials: 1 } }])).toEqual([]);
  });
  it("numeric sorting/filtering never uses Persian strings or synthetic history", () => {
    const a = normalize(testOffer()); const b = { ...a, providerOfferId: "later", totalPrice: { ...a.totalPrice, amountRials: 50_000_000 }, segments: a.segments.map((leg) => ({ ...leg, flightNumber: "202" })) };
    const flights = groupFlightOffers([a, b]);
    const response = searchFlights({ query: QUERY, filters: { maxPriceRials: 55_000_000 }, sort: "price" }, flights, { source: { mode: "live", id: "aggregation", label: "Test" }, asOf: new Date(NOW).toISOString(), supportedDates: [] });
    expect(response.flights).toHaveLength(1); expect(response.flights[0].selectedOffer.totalPrice.amountRials).toBe(50_000_000);
    expect(response.flights[0].historyCategory).toBe("unknown");
    expect(response.flights[0].flight.history![0].source.mode).toBe("unavailable");
    expect(response.flights[0].flight.history![0].cancellationRate).toBeNull();
    expect(response.flights[0].reasons.join(" ")).not.toContain("ساختگی");
  });
});
