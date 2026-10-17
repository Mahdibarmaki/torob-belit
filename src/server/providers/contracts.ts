import type { DataSource, FlightSearchInput, Instant } from "@/domain/models";
import type { ProviderDescriptor } from "@/domain/provider";

export interface ProviderAdapter {
  provider: ProviderDescriptor;
  mode: "LIVE" | "FIXTURE";
  /** A separate fixture adapter only; a live adapter can never switch to this after failure. */
  fixture?: { source: DataSource; asOf: Instant };
  readiness: {
    status: "connected" | "fixture" | "awaiting-agreement" | "awaiting-credentials" | "unverified";
    message: string;
    /** Internal reference to reviewed agreement + technical contract; never a credential. */
    authorizationReference?: string;
    missingRequirements?: readonly string[];
  };
  /** Map an officially documented response to FlightOffer[], preserving unknown fields. */
  search(query: FlightSearchInput, context: { signal: AbortSignal }): Promise<unknown[]>;
}

export class ProviderError extends Error {
  constructor(readonly code: "not-authorized" | "auth" | "forbidden" | "rate-limited" | "transient" | "invalid-data", readonly retryAfterMs?: number) {
    super(code);
  }
}
