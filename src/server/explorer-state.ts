import "server-only";
import { AIRPORTS } from "@/data/airports";
import { DEMO_DATE_BOUNDS } from "@/domain/demo-date";
import { EMPTY_JOURNEY_SEARCH, journeyLegQuery, validateJourneySearch, type JourneySearchDraft } from "@/domain/journey-search";
import { searchModeFromParam } from "@/application/search-mode";
import { DEMO_METADATA } from "@/fixtures/demo";
import { executeSearch, liveDateBounds } from "./search";
import type { FlightExplorerProps } from "@/components/flight-explorer";

/** No default route or inventory call: only an explicit valid query creates results. */
export async function loadExplorerState(params: Record<string, string | string[] | undefined>): Promise<FlightExplorerProps> {
  const mode = searchModeFromParam(params.mode);
  const dateBounds = mode === "demo" ? { ...DEMO_DATE_BOUNDS } : mode === "fixture" ? { min: "2026-10-15", max: "2026-10-15" } : liveDateBounds();
  const scalar = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const initialDraft: JourneySearchDraft = { ...EMPTY_JOURNEY_SEARCH, origin: scalar("origin"), destination: scalar("destination"), departureDate: scalar("date"), returnDate: scalar("returnDate"), adults: params.adults === undefined ? 1 : Number(scalar("adults")), tripType: scalar("tripType") === "round-trip" ? "round-trip" : "one-way" };
  const common = { mode, dateBounds, initialDraft, referenceAsOf: mode === "demo" ? DEMO_METADATA.asOf : null };
  if (!["origin", "destination", "date", "returnDate", "adults"].some((key) => params[key] !== undefined)) return { ...common, initialData: null, initialInboundData: null, initialSearch: null };
  const checked = validateJourneySearch(initialDraft, { airportCodes: AIRPORTS.map((airport) => airport.code), dateBounds });
  if (!checked.search) return { ...common, initialData: null, initialInboundData: null, initialSearch: null, initialFieldErrors: checked.errors };
  const search = checked.search;
  const fetchLeg = async (direction: "outbound" | "inbound") => {
    try { return { data: await executeSearch({ query: journeyLegQuery(search, direction), filters: {}, sort: "recommended", mode }), error: "" }; }
    catch (error) { return { data: null, error: error instanceof Error ? error.message : "دریافت پروازها انجام نشد. دوباره تلاش کنید." }; }
  };
  const [outbound, inbound] = await Promise.all([fetchLeg("outbound"), search.tripType === "round-trip" ? fetchLeg("inbound") : Promise.resolve({ data: null, error: "" })]);
  return { ...common, initialData: outbound.data, initialInboundData: inbound.data, initialSearch: search, initialError: outbound.error, initialInboundError: inbound.error };
}
