import type { DataSource, FlightSearchInput, FlightSegment, Instant, Money, SegmentBaggage, SellerOffer, SourceState } from "./models";

export type ProviderId = "alibaba" | "flytoday" | "safarmarket" | "snapptrip";

export interface ProviderDescriptor {
  id: ProviderId;
  name: string;
  homepage: string;
  /** Approved booking destinations only; never infer a redirect URL from a search. */
  bookingHosts: string[];
}

/** Adapter output contract, not a claim that any vendor exposes this JSON format. */
export interface FlightOffer {
  sourceState: Exclude<SourceState, "UNAVAILABLE">;
  providerId: ProviderId;
  providerName: string;
  providerOfferId: string;
  sellerId: string;
  sellerName: string;
  segments: FlightSegment[];
  stops: number;
  adults: FlightSearchInput["adults"];
  cabin: "economy";
  fareName: string;
  baggage: SegmentBaggage[];
  totalPrice: Money;
  priceComplete: boolean;
  availability: SellerOffer["availability"];
  ticketing: SellerOffer["ticketing"];
  refundability: SellerOffer["refundability"];
  fareConditions: { changes: string | null; refunds: string | null };
  bookingUrl: string | null;
  fetchedAt: Instant;
  source: DataSource;
}

/** Reference records with no verified monetary unit are never coerced to canonical money. */
export interface UnpricedFlightOffer extends Omit<FlightOffer, "sourceState" | "totalPrice" | "priceComplete"> {
  sourceState: "FIXTURE";
  totalPrice: null;
  priceComplete: false;
  priceEvidence: { rawAmount: number; field: "priceAdult"; unit: "unverified" };
  baggageRaw: number | string | null;
  capturedAt: null;
}

export type NormalizedFlightOffer = FlightOffer | UnpricedFlightOffer;

export function isPricedFlightOffer(offer: NormalizedFlightOffer): offer is FlightOffer {
  return offer.totalPrice !== null;
}

export type ProviderStatusCode = "live" | "cached" | "fixture" | "timeout" | "error" | "rate-limited" | "awaiting-agreement" | "awaiting-credentials" | "unverified";

/** Safe public metadata; no endpoints, tokens, or raw provider errors. */
export interface ProviderStatus {
  sourceState: SourceState;
  cache: "hit" | "miss" | "none";
  id: ProviderId;
  name: string;
  status: ProviderStatusCode;
  message: string;
  fetchedAt: Instant | null;
  lastSuccessfulAt: Instant | null;
  offerCount: number;
  missingRequirements: string[];
}
