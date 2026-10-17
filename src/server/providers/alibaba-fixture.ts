import "server-only";
import { createHash } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import { AIRPORTS } from "@/data/airports";
import type { UnpricedFlightOffer } from "@/domain/provider";
import { ALIBABA_REFERENCE_FIXTURES, ALIBABA_REFERENCE_MANIFEST } from "@/fixtures/alibaba/manifest";
import { createAlibabaAdapter } from "./alibaba";
import { parseAlibabaResponse, type AlibabaRecord } from "./alibaba-parser";
import { ProviderError, type ProviderAdapter } from "./contracts";

function publicRecordHash(record: AlibabaRecord): string {
  const fields = Object.fromEntries(Object.entries(record).filter(([key]) => key !== "referenceIndex"));
  return createHash("sha256").update(JSON.stringify(fields)).digest("hex");
}

/** Saved-reference demonstration only. Unknown price units never become priced offers. */
export function createAlibabaFixtureAdapter(): ProviderAdapter {
  const provider = createAlibabaAdapter().provider;
  const source = { mode: "demo" as const, id: ALIBABA_REFERENCE_MANIFEST.id, label: ALIBABA_REFERENCE_MANIFEST.label };
  return {
    provider,
    mode: "FIXTURE",
    fixture: { source, asOf: ALIBABA_REFERENCE_MANIFEST.importedAt },
    readiness: {
      status: "fixture",
      message: "پاسخ ذخیره‌شده مرجع؛ اتصال زنده نیست، تاریخ دریافت و واحد قیمت تأیید نشده است.",
      missingRequirements: ["تأیید واحد قیمت و کامل بودن هزینه‌ها پیش از مقایسه قیمت", "تاریخ واقعی دریافت پاسخ و قرارداد رسمی برای اتصال زنده"],
    },
    async search(query, { signal }): Promise<UnpricedFlightOffer[]> {
      signal.throwIfAborted();
      if (!Number.isSafeInteger(query.adults) || query.adults < 1 || query.adults > 9) throw new RangeError("Unsupported fixture passenger count.");
      const fixture = ALIBABA_REFERENCE_FIXTURES.find((entry) => entry.origin === query.origin
        && entry.destination === query.destination && entry.departureDates.some((date) => date === query.departureDate));
      if (!fixture) return [];
      const originTimeZone = AIRPORTS.find((airport) => airport.code === query.origin)?.timeZone;
      const destinationTimeZone = AIRPORTS.find((airport) => airport.code === query.destination)?.timeZone;
      if (!originTimeZone || !destinationTimeZone) throw new ProviderError("invalid-data");
      const offers: UnpricedFlightOffer[] = [];
      const identifiers = new Set<string>();
      for (const record of parseAlibabaResponse(fixture.payload).records) {
        signal.throwIfAborted();
        if (record.cabin !== "E" || record.hasConnection !== false || !/^[A-Z0-9]{2,3}$/.test(record.airlineCode)
          || !/^[A-Z0-9]+$/.test(record.flightNumber) || record.origin !== query.origin || record.destination !== query.destination
          || record.departureLocal.slice(0, 10) !== query.departureDate) continue;
        const providerOfferId = `${source.id}:${publicRecordHash(record)}`;
        if (identifiers.has(providerOfferId)) continue;
        identifiers.add(providerOfferId);
        const segmentId = `${providerOfferId}:leg:0`;
        const departureAt = Temporal.PlainDateTime.from(record.departureLocal)
          .toZonedDateTime(originTimeZone, { disambiguation: "reject" }).toInstant().toString();
        const arrivalAt = Temporal.PlainDateTime.from(record.arrivalLocal)
          .toZonedDateTime(destinationTimeZone, { disambiguation: "reject" }).toInstant().toString();
        offers.push({
          sourceState: "FIXTURE",
          providerId: provider.id,
          providerName: provider.name,
          providerOfferId,
          sellerId: `${source.id}:seller-unverified`,
          sellerName: "فروشنده نامشخص · مرجع علی‌بابا",
          segments: [{
            id: segmentId,
            airlineId: record.airlineCode,
            airlineName: record.airlineName,
            flightNumber: record.flightNumber,
            origin: record.origin,
            destination: record.destination,
            departureAt, arrivalAt, originTimeZone, destinationTimeZone,
          }],
          stops: 0,
          adults: query.adults,
          cabin: "economy",
          fareName: record.fareClass,
          baggage: [{ segmentId, checkedKg: null, carryOnKg: null }],
          baggageRaw: record.baggageRaw,
          totalPrice: null,
          priceComplete: false,
          priceEvidence: { rawAmount: record.adultPriceRaw, field: "priceAdult", unit: "unverified" },
          availability: record.seats !== null && record.seats < query.adults ? "unavailable" : record.availability,
          ticketing: "unknown",
          refundability: record.refundable === null ? "unknown" : record.refundable ? "refundable" : "non-refundable",
          fareConditions: { changes: null, refunds: null },
          bookingUrl: null,
          fetchedAt: ALIBABA_REFERENCE_MANIFEST.importedAt,
          capturedAt: null,
          source: { ...source },
        });
      }
      signal.throwIfAborted();
      return offers;
    },
  };
}
