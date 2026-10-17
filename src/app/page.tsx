import { FlightExplorer } from "@/components/flight-explorer";
import { loadExplorerState } from "@/server/explorer-state";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const state = await loadExplorerState(params);
  return <FlightExplorer key={JSON.stringify(params)} {...state} />;
}
