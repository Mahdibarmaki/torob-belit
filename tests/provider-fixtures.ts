/** Entirely synthetic test transport fixtures. Never registered as a real provider. */
import type { FlightOffer, ProviderDescriptor, ProviderId } from "@/domain/provider";
import type { FlightSearchInput } from "@/domain/models";
export const NOW = Date.parse("2026-10-15T12:00:00Z");
export const QUERY: FlightSearchInput = { origin: "IKA", destination: "IST", departureDate: "2026-10-16", adults: 1, currency: "IRR" };
export function descriptor(id: ProviderId = "alibaba"): ProviderDescriptor { return { id, name: `Test ${id}`, homepage: `https://${id === "alibaba" || id === "flytoday" ? `${id}.ir` : `${id}.com`}/`, bookingHosts: [id === "alibaba" || id === "flytoday" ? `${id}.ir` : `${id}.com`] }; }
export function testOffer(id: ProviderId = "alibaba", overrides: Partial<FlightOffer> = {}): FlightOffer {
  const provider = descriptor(id);
  return { sourceState: "LIVE", providerId: id, providerName: provider.name, providerOfferId: "synthetic-quote-1", sellerId: "test-seller", sellerName: "Test seller", cabin: "economy",
    segments: [{ id: "provider-leg", airlineId: "TEST-AIRLINE", airlineName: "Synthetic airline", flightNumber: "101A", origin: "IKA", destination: "IST", departureAt: "2026-10-16T05:00:00Z", arrivalAt: "2026-10-16T08:00:00Z" }],
    stops: 0, adults: 1, fareName: "Test economy", baggage: [{ segmentId: "provider-leg", checkedKg: null, carryOnKg: 7 }],
    totalPrice: { amountRials: 60_000_001, currency: "IRR", unit: "rial" }, priceComplete: true, availability: "available", ticketing: "single-ticket", refundability: "unknown",
    fareConditions: { changes: null, refunds: null }, bookingUrl: `https://${provider.bookingHosts[0]}/test-only`, fetchedAt: new Date(NOW).toISOString(), source: { mode: "live", id, label: provider.name }, ...overrides };
}
