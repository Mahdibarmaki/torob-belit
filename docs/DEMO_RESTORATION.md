# Offline demo restoration

This iteration restores the populated local product as the default. Git was inspected, but the current `main` branch has no commits; there was no historical revision to check out. The surviving seven-template synthetic catalog was preserved and extended rather than replacing the Next.js application or deleting its provider architecture.

## Modes

| Selection | Behavior |
| --- | --- |
| `/`, `/results`, `?mode=demo`, or omitted API mode | Complete local synthetic demo. Defaults to Tehran Mehrabad–Mashhad and tomorrow in `Asia/Tehran`; the server passes that date to the client. No provider calls, credentials, external fonts, or internet are required. |
| `?mode=live` or API `mode: "live"` | Preserved authorized-provider registry. All four providers remain disconnected until permission and official technical contracts are supplied. Failure returns transparent statuses, never demo offers. |
| `?mode=fixture` or API `mode: "fixture"` | Preserved Alibaba reference inspection mode, limited to the original saved routes/date. Unverified prices remain unpriced. This is independent of the full demo. |

Every generated offer/history row remains synthetic and carries dataset `flight-ai-demo-v4-domestic-irr`; the visible label is **اطلاعات آزمایشی**. No offer is attributed to a connected real seller. Changing modes changes the complete search context; real and demo inventory are never combined.

## Catalog and deterministic dates

Domestic coverage is THR–MHD, THR–SYZ, THR–KIH, THR–IFN, THR–TBZ and THR–AWZ, plus each reverse route. Each has sixteen sample services (fourteen direct and two connecting), eleven genuine Iranian airline identities, varied times/allowances/capacities, and three distinct synthetic seller fares. The older international sample routes remain supported. Unsupported routes return an informative empty result without substituting another route.

The fixed simulation horizon is Gregorian date-only **2026-10-15 through 2036-12-31**. All dates inside it, including leap days, work without stored daily JSON files. `dateBounds` is authoritative; the older `supportedDates` array is retained only as legacy examples and is also exposed as `exampleDates` with `datePolicy: "continuous-range"` by `/api/demo`. Generated identity, schedule and price variation depend only on the dataset version and validated query; no random values or browser clock enter generation. The default date is chosen once on the server. Changing departure date never advances the history reference or creates an apparent supplier update.

## Airline, aircraft and history truthfulness

The catalog uses sourced airline codes and conservative documented aircraft associations. [AIRLINE_REFERENCES.md](AIRLINE_REFERENCES.md) records evidence and historical limitations. No logos are invented. A genuine model and airline name do not establish that the airline operates the sample route or assigns that aircraft to the invented flight. Details/comparison explicitly identify the aircraft assignment as illustrative.

The cancellation algorithm is unchanged: thirty completed origin-local days, exact service identity, ten known observations, verified synthetic roster and eighty-percent coverage. All outcomes and rates in this mode are authored simulation, not real airline performance. The fixed reference remains **2026-10-15T12:00:00Z**, even for a much later departure. Gray unknown evidence remains unknown. Live/reference inventory still has no operational history.

## Existing product behavior

Search, the Jalali picker, exact numeric-rial/Toman handling, price ordering, airline/time/baggage/stops/history filters, seller comparison, itinerary comparison, details and evidence dialogs reuse the existing domain services and components. `FlightSegment.aircraftModel` is optional; missing provider aircraft information stays absent. No CSS tokens, palette, typography, spacing or layout system changed. Vazirmatn and other assets remain local.

## Verification

Restoration checks passed: `npm run lint`, `npm run typecheck`, **364 unit tests across 13 files**, production `npm run build` (Webpack), and **all 22 Playwright production-browser tests** in 21.1 seconds. Browser checks include default loading with external requests blocked, future Jalali search, price/airline/time/stops filtering, seller/itinerary comparison, synthetic-history details, keyboard focus, mobile RTL, explicit live isolation and unchanged Alibaba reference behavior. No CSS/theme files or runtime dependencies were changed.

The local development preview was restored after production verification. Previous provider/reference check counts belong to those earlier iterations and do not certify a live connection.
