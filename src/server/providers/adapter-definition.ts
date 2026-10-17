import "server-only";
import type { ProviderDescriptor } from "@/domain/provider";
import { ProviderError, type ProviderAdapter } from "./contracts";

interface UnavailableAdapterDefinition {
  provider: ProviderDescriptor;
  status: "awaiting-agreement" | "awaiting-credentials" | "unverified";
  message: string;
  missingRequirements: readonly string[];
}

/** A named integration boundary, deliberately without a network transport. */
export function createUnavailableAdapter(definition: UnavailableAdapterDefinition): ProviderAdapter {
  return {
    provider: { ...definition.provider, bookingHosts: [...definition.provider.bookingHosts] },
    mode: "LIVE",
    readiness: {
      status: definition.status,
      message: definition.message,
      missingRequirements: [...definition.missingRequirements],
    },
    async search() {
      throw new ProviderError("not-authorized");
    },
  };
}
