import type { SearchMode } from "./search-service";

/** The local product opens as a self-contained simulation; other origins are explicit. */
export const DEFAULT_SEARCH_MODE: SearchMode = "demo";

export function searchModeFromParam(value: unknown): SearchMode {
  return value === "live" || value === "fixture" ? value : DEFAULT_SEARCH_MODE;
}
