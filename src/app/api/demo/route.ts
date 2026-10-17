import { AIRPORTS, DEMO_METADATA, DEMO_ROUTES } from "@/fixtures/demo";

export function GET() {
  return Response.json({ ok: true, data: { ...DEMO_METADATA, datePolicy: "continuous-range", exampleDates: DEMO_METADATA.supportedDates, airports: AIRPORTS, routes: DEMO_ROUTES } }, { headers: { "Cache-Control": "no-store" } });
}
