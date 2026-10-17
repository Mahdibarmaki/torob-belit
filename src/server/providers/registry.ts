import "server-only";
import { createProviderAggregator } from "./aggregator";
import { createAlibabaAdapter } from "./alibaba";
import { createFlytodayAdapter } from "./flytoday";
import { createSafarmarketAdapter } from "./safarmarket";
import { createSnapptripAdapter } from "./snapptrip";
import { createAlibabaFixtureAdapter } from "./alibaba-fixture";
import type { ProviderAdapter } from "./contracts";

export const providerAdapters: readonly ProviderAdapter[] = [createAlibabaAdapter(), createFlytodayAdapter(), createSafarmarketAdapter(), createSnapptripAdapter()];
export const providerAggregator = createProviderAggregator(providerAdapters);

/** Offline is an explicit composition root; no live request or competitor mock is attempted. */
export const fixtureProviderAdapters: readonly ProviderAdapter[] = [createAlibabaFixtureAdapter(), ...providerAdapters.slice(1).map((adapter): ProviderAdapter => ({
  ...adapter, mode: "FIXTURE", readiness: { ...adapter.readiness, message: "برای این منبع پاسخ مرجع مجاز یا اتصال تأییدشده موجود نیست." },
}))];
export const fixtureProviderAggregator = createProviderAggregator(fixtureProviderAdapters);
