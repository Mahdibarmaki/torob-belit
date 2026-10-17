# Torob Belit product evolution · 2026-10-16

> **Current scope — 2026-10-17:** [METASEARCH.md](METASEARCH.md) supersedes the internal booking and ticketing portions of this historical delivery. Search, round trips, comparison and AI recommendations remain; seller selection now continues to a verified external seller destination. Passenger forms, checkout/confirmation, issuance, My Tickets and PDF/QR export are removed. The dated details and verification below record the earlier implementation.

This iteration implements the user's thirteen-part evolution in the existing Next.js application. It supersedes historical automatic-homepage results, discovery/results tabs, one-way-only scope, source-information navigation, and the former absence of local ticketing. Existing domain rules, provider modes, deterministic inventory, exact monetary arithmetic and historical cancellation policy remain in force. [DESIGN.md](../DESIGN.md) remains the visual authority; [LOCAL-TICKETING.md](LOCAL-TICKETING.md) specifies issuance and privacy boundaries.

## Requirement checklist

| # | Implemented behavior |
| --- | --- |
| 01 | One-way/round-trip tabs replace discovery/results tabs. One page retains hero, search, results, filters, comparison and footer. Return searches reverse the airports and use a separate date. Distinct seller selections form one combined journey. |
| 02 | Bare `/` has empty airports/dates, one adult, an explanatory initial state and no inventory request, flight count, result filters or sorting. Explicit submission validates individual fields; editing the draft preserves submitted results. Valid full search URLs can initialize results; legacy `/results` links remain compatible. |
| 03 | Only the airport-modal search input receives a single neutral keyboard focus outline. Its editable Persian/English/IATA search and selection behavior are unchanged. |
| 04 | Flight details retain the existing modal/bottom sheet, seller offers, fare conditions, baggage, comparison and purchase. Repeated flight summary, schedule/timezone and cancellation sections are removed from that modal. Independent card history controls remain available. |
| 05 | Stable demo seller IDs now display علی‌بابا، فلای‌تودی، مستربلیط. Prices and restrictions are preserved; names imply no partnership, verified availability or provider booking connection. |
| 06 | Reusable per-offer metadata renders actual cabin, checked/cabin baggage, refund/change/ticketing conditions and completeness, with existing icons, neutral dots and narrow-screen wrapping. Missing information is not invented. |
| 07 | A selected complete demo offer starts passenger entry, review, explicit local issuance and persistent ticket details. Validation, disabled repeated actions, idempotency, missing-selection recovery and storage-failure messages are implemented. |
| 08 | Issued documents use actual selected legs, sellers, passengers and prices; white rounded surfaces, route connectors, dashed dividers, local QR and a working PDF. Both directions remain in one document. No seat, gate, portrait, boarding credential or unsupported reschedule action is invented. |
| 09 | Shared navigation has House/CreditCard/Ticket/User icons, neutral active-route styling, hover/focus treatments and consistent spacing. No “به‌زودی” badge remains. |
| 10 | Flight-guide and data-source navigation entries and handlers are removed from header/footer/menu. Legitimate inline provenance, historical evidence and project documentation remain. |
| 11 | The RTL logo/main group is on the right; login is beside the hamburger on the left. My Tickets lists browser-local issued records and opens their stable details. Empty, corrupt and inaccessible storage have recovery states. Login/installments remain honestly unavailable. |
| 12 | Hero bottom caption/icon/positioning styles are removed; the photographic background, headline and description remain. |
| 13 | Aircraft comes from the current flight beside the airline, with a neutral dot, smaller regular text and wrapping. Its footer duplicate is removed; missing model hides both model and separator. |

## Search and journey state

`src/domain/journey-search.ts` validates the draft and constructs the existing `SearchQuery` for each direction. Gregorian `LocalDate` values remain date-only; shared Jalali utilities supply Persian UI labels. `src/server/explorer-state.ts` initializes an empty page or a valid explicit query without silently supplying airports/dates.

`FlightExplorer` keeps the editable form separate from submitted criteria. Each submitted leg owns its response/base inventory, applied filters, unsaved filter draft, sort, loading/error and abort controller. Searches execute in parallel for round trips. Request generations and aborts prevent stale responses from replacing a newer search. A new submission clears selections/comparison and resets the relevant context. Switching result legs restores that leg's own filter/sort state and clears comparison across directions. Changing the outbound selection preserves a compatible return; overlapping chronology invalidates it explicitly.

The selected seller offer is a snapshot, not just a flight ID. Checkout validates that it belongs to the selected flight and retains its actual baggage/fare/party basis. An offer already represents the searched party total: one-way uses that total once; round-trip adds the two canonical integer rial totals once. `BigInt` detects overflow. `formatToman` remains the only monetary display boundary; no new multiplier, fee or conversion is introduced.

The existing server `/api/search`, pure filtering/ranking/history/comparison utilities and provider aggregation are reused. Authored `demo`, imported unpriced Alibaba `fixture`, and disconnected `live` modes remain distinct, with no network activation or fallback. Purchase simulation accepts complete authored-demo fares only.

## Issuance and persistence

The shared typed `JourneySelection`, `CheckoutDraft` and `DemoTicket` contracts live in `src/domain/booking.ts`; runtime validators reconstruct allowlisted JSON and check source, party, offer ownership, money, segment chronology and round-trip direction. Existing adult-only search produces one form per adult. Local birth-date/identity/contact checks are application validation, never government or carrier document verification.

`src/lib/booking-storage.ts` stores in-progress forms in `sessionStorage`, and issued snapshots in `localStorage`. Permanent records retain names and masked trailing identity characters, with no full national ID/passport, birth date, phone or email. A checkout UUID determines the stable ticket reference and storage key, so a retry returns the same issuance record. Failed writes never navigate to a success page, and successful issuance removes the temporary form. URLs and QR contain only the opaque internal reference. Full details are in [LOCAL-TICKETING.md](LOCAL-TICKETING.md).

The routes are `/checkout?selection=<UUID>`, `/tickets/<reference>` and `/my-tickets`. All use the shared header and existing local typography/RTL primitives. Issued documents and confirmation retain fare restrictions and both selected directions. The My Tickets destination uses the same validated records, without inventing accounts or server synchronization.

## Files and implementation boundaries

| Area | Files |
| --- | --- |
| Search/domain/server | `src/domain/journey-search.ts`, `src/server/explorer-state.ts`, `src/components/flight-explorer.tsx`, `src/app/page.tsx`, `src/app/results/page.tsx` |
| Shared navigation/search controls | `src/components/site-header.tsx`, `site-footer.tsx`, `airport-selector.tsx`, `jalali-date-picker.tsx`, `src/app/globals.css` |
| Cards/seller display | `src/components/flight-card.tsx`, `seller-offer-metadata.tsx`, `seller-offer-metadata.module.css`, seller display names in `src/fixtures/demo.ts` |
| Booking contracts/storage | `src/domain/booking.ts`, `src/lib/booking-storage.ts` |
| Booking presentation | `src/components/checkout-flow.tsx`, `issued-ticket.tsx`, `my-tickets.tsx`, `journey-summary.tsx`, `booking-flow.module.css` |
| Routes | `src/app/checkout/page.tsx`, `src/app/tickets/[reference]/page.tsx`, `src/app/my-tickets/page.tsx` |
| Dependencies | `package.json`, `package-lock.json` |
| Tests | New journey-search, seller-offers, booking and booking-storage unit suites; new `tests/e2e/product-flow.spec.ts` and `product-edge-cases.spec.ts`; updated airport-selector/flight/hero/refinements/round2 browser cases and presentation-copy tests |
| Documentation | This document, `LOCAL-TICKETING.md`, README, AGENTS, PRD and ARCHITECTURE |

There is no replacement app/server, database, global state dependency, payment integration or provider transport change. The working tree had no tracked application baseline; all existing files/uncommitted work were preserved.

## PDF/QR decisions and visual limitations

- [node-qrcode](https://github.com/soldair/node-qrcode) generates the internal-record QR locally. [html-to-image](https://github.com/bubkoo/html-to-image) captures the semantic RTL ticket after fonts and images load; [jsPDF](https://github.com/parallax/jsPDF) packages that raster into a real PDF with sufficient height for both legs/passengers. Dependencies load when needed, with no external export service.
- Raster PDF output preserves Persian shaping and the supplied FaNum font. Its text is not selectable/searchable or tagged for PDF accessibility; the on-screen document is semantic HTML.
- No ticket-reference screenshot file was supplied with this request. The implementation uses its written mobile-ticket specification and the existing reviewed tokens/components; unrelated reference branding/assets were not copied.
- Login, installment buying, real payment/reservation, real issuance, account synchronization and date changes remain unavailable. The browser-local QR has no airport validity and cannot retrieve a record on a different device without that stored record.
- Physical mobile keyboards and assistive technologies are not fully represented by desktop Chrome viewport emulation. The existing prescribed primary-button contrast limitation is recorded in [DESIGN-INTEGRATION.md](DESIGN-INTEGRATION.md).
- The dependency audit reports five high findings in the existing ESLint/Next lint-tool chain (`braces` → `micromatch` → `fast-glob` → Next ESLint packages). The three new export libraries are not the reported dependency path. The proposed automatic fix downgrades `eslint-config-next` across major versions; that unrelated toolchain change was not forced.

## Verification

Final application checks:

| Check | Result |
| --- | --- |
| `npm run lint` | Passed, zero warnings. |
| `npm run typecheck` | Passed. The production build's TypeScript phase also passed. |
| `npm test` | **469 tests across 20 files passed.** Includes unchanged history/provider/localization suites and new journey, booking, storage and seller regressions. |
| `npm run build` | Passed with the existing Webpack command; all search/API/checkout/ticket routes compiled. |
| `npm run test:e2e` | **All 75 production-browser cases passed** in the complete integrated run (1.4 minutes). |
| Additional responsive/focus run | **6 cases passed**: round-trip search → selected offers → passenger form → issued record at 375/430/768/1024/1440px, plus the neutral airport focus check. Three additional widths and the focus case extend the suite to **79 distinct cases**, with the two endpoint widths repeated for final visual evidence. |
| Download verification | Actual mobile one-way and desktop round-trip PDF downloads have valid `%PDF` headers. Their rendered pages were visually inspected: Persian joining, route directions/dates, both round-trip legs, totals, passengers, QR and demo disclosure remain visible. |
| Documentation | Six updated documents checked for missing relative links; none found. |

The initial browser run caught three test assumptions: counting cards before an asynchronous submission returned, comparing `innerText` with `textContent`, and matching Next.js's route announcer alongside an application error alert. Tests now wait for the actual inventory state and use scoped/text-consistent assertions. No flight data or business rule was changed to satisfy them.

Browser coverage includes empty/invalid initial searches, same-page explicit search, preserving draft edits, future Jalali queries, numeric prices, all existing filters/apply/reset, scoped round-trip filters/comparison, changing an earlier selected flight, seller-only details and keyboard dismissal, adult/identity validation, form correction/reload, write-denied recovery, stable issuance and My Tickets, unknown-unit fixtures, disconnected live providers and independent historical evidence. One-way issuance and UI layouts were checked at all five requested widths; round-trip issuance was also checked at all five. Browser-emulated keyboard behavior is not a physical-device certification.

Saved evidence is in [screenshots/product-evolution](screenshots/product-evolution/), including [mobile passenger entry](screenshots/product-evolution/product-passengers-375.png), [tablet passenger entry](screenshots/product-evolution/product-passengers-768.png), [mobile seller sheet](screenshots/product-evolution/product-sellers-375.png), [mobile ticket](screenshots/product-evolution/product-ticket-375.png), [desktop round-trip ticket](screenshots/product-evolution/product-round-trip-1440.png), [one-way PDF](screenshots/product-evolution/product-ticket-375.pdf) and [round-trip PDF](screenshots/product-evolution/product-round-trip-1440.pdf). Rendered PDF previews are saved alongside the originals. Test records use synthetic passenger inputs.
