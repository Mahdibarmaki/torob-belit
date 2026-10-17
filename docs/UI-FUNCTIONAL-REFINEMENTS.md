# Comprehensive UI and functional refinements · 2026-10-16

This iteration applies the user's 23 refinements to the existing application, following [DESIGN.md](../DESIGN.md). It preserves the [unified journey architecture](PRODUCT-EVOLUTION.md), canonical monetary units, fixtures, provider boundaries and retrospective cancellation calculations. [LOCAL-TICKETING.md](LOCAL-TICKETING.md) records the updated checkout navigation and persistence behavior.

The attachment refers to the earlier Vazirmatn/Airbnb design. The actual reviewed root design and current implementation use **Yekan Bakh FaNum**, Torob Red `#EF142B` / hover `#C90F24`, neutral surfaces and the existing layout. Those remain in place: no font rollback, second design system, new icon dependency, provider request, payment or real ticketing integration was added.

## Requirement audit and outcome

| # | Outcome |
| --- | --- |
| 1 | Airline/model header already existed. Refined explicit dot spacing, smaller regular secondary model text, mixed-direction isolation and responsive pairing. |
| 2 | Date/document controls were already 48px but neighboring help text stretched their grids. Anchored labels/controls so their surfaces share a baseline without displacing one another; mobile remains stacked. |
| 3 | Issued ticket short metadata now uses shared neutral badges. Actual baggage, fare, refunds, changes, ticket type and fee completeness remain dynamic; long explanations remain normal text. |
| 4 | Removed the entire “درباره اطلاعات این جست‌وجو” details element and its dedicated spacing/logic. Preserved actual warnings, a discreet results demo label, provider statuses and per-offer/history/checkout/document attribution. |
| 5 | Shared `Icon` now prefers reviewed solid silhouettes for existing semantic imports. Lucide has no separate solid collection, so clear arrows, chevrons, checks and unreviewed shapes retain strokes. No blanket fill or additional icon package. |
| 6 | Consistent red Trash icon for card, selected seller, comparison-card removal and clear-comparison actions. Exact seller selection determines the selected seller's removal state. Behavior and IDs are preserved. |
| 7 | Comparison now groups seller/price, per-segment departure/arrival schedules, flight/model, duration/stops, baggage/conditions and independent historical evidence. Desktop remains side by side; mobile stacks. Missing evidence and exact selected fares are retained. |
| 8 | Selected-trip seller, class and actual flight numbers now use neutral badges, shared with issued documents. |
| 9 | My Tickets has a genuine primary-red View Ticket link, hover/pressed/focus treatments and the same record URL. The stretched link preserves clicking the card without nested controls. |
| 10 | Actual locally issued-demo status uses dark-green text on a light-green pill in My Tickets and issued-ticket displays. It still explicitly identifies local simulation; no airline confirmation is implied. |
| 11 | Mobile Filters was already a native button with dialog behavior. Added a visible neutral surface, border, 44px minimum target, pressed state, focus treatment and accurate expanded state. |
| 12 | Only mobile sorting is compacted to a 40px surface, 12px type, 156px width, smaller padding and 14px chevron. Desktop retains its existing dimensions. |
| 13 | Checkout progress has icons, evenly spaced dots, distinct completed/current/upcoming states and working previous-step actions. URL-backed confirmation supports browser back/forward; future URLs cannot bypass required validation. |
| 14 | Moved “سفر انتخاب‌شده” immediately above its card, with one heading and consistent RTL alignment. |
| 15 | Issued ticket reuses the existing unmodified horizontal Brand component and emblem. |
| 16 | Initial empty-search criteria message and relevant takeoff icon are explicitly centered. No inventory/state behavior changed. |
| 17 | Passenger chevron was already on the logical left. Its mobile inset now matches the destination chevron; desktop/shared select insets remain unchanged. |
| 18 | Mobile date/count/party summary uses 12px typography, proportional icons and compact neutral dot spacing. Desktop typography stays unchanged. |
| 19 | Seller name and primary price share one centered top grid row; the smaller party caption occupies a separate row under price. Toman remains smaller and regular-weight. |
| 20 | Audited 21 airline identities across authored and imported fixtures. Added five source/license-backed local marks with centralized guarded lookup. Sixteen identities retain the generic fallback. See [AIRLINE_LOGOS.md](AIRLINE_LOGOS.md) and [public asset notices](../public/airlines/NOTICE.md). |
| 21 | Hamburger is hidden at 1024px+ where full navigation fits, shown below that breakpoint with `aria-expanded`, keyboard/focus return and automatic closing when resized to full navigation. |
| 22 | Origin retains takeoff; destination now uses landing, including their airport-result lists. Selection/swap logic is unchanged. |
| 23 | My Tickets renders trip type, passenger count and actual airline identities in separate neutral wrapping pills. Issued status and View Ticket CTA retain their distinct semantic treatments. |

## Shared presentation boundaries

`MetadataBadge` and `BadgeGroup` render short informational facts on Mist using Graphite, 12px regular type, pill radii and existing spacing tokens. They do not infer, combine or recalculate values. Historical status uses the existing evidence categories; issuance success is an explicit requested semantic exception with its own actual status. Neither becomes a decorative green informational badge.

`AirlineIdentity` displays the actual name independently from the image. Reviewed name aliases and an agreeing supplied code are required for lookup; uncertain/mismatched names/codes and image failures use a generic icon. Original mark colors/aspect ratios remain intact with `object-fit: contain`. Logos identify airlines without certifying fixture inventory. Visible credits are available in the existing About dialog and inside issued content/PDF; no removed source-navigation item is recreated.

The existing exact comparison selections and application services remain authoritative. `ComparisonPanel` only presents those records. It never substitutes another seller, fills an unknown price/history, estimates a journey cancellation probability, or changes filter eligibility. `SellerOfferMetadata` defaults to the prior inline presentation and additionally supports badge presentation for comparison/tickets; optional missing values and long conditions remain explicit.

## Checkout navigation and stored records

Passenger entry remains `/checkout?selection=<UUID>`. Successful validation persists the reviewed draft and pushes `&step=confirm` into browser history. Previous-step breadcrumb controls return to entry or the selected search while retaining the session draft. Editing a field invalidates the previous review permission. An unreviewed/invalid session cannot access issuance by manually adding the confirmation query. The existing final domain validation also remains in force.

An issued record is immutable. Its full temporary identity/contact draft has already been cleared; editing or reissuing that historical record is not presented as a breadcrumb action. Stored ticket schema, references, canonical totals, duplicate protection and privacy policy are unchanged. Browser storage remains local, without account synchronization or real booking.

## Modified and created files

| Area | Files |
| --- | --- |
| Shared badges | New `src/components/metadata-badge.tsx`, `metadata-badge.module.css` |
| Icons/airlines | `src/components/ui.tsx`; new `filled-icons.tsx`, `airline-identity.tsx`, `airline-identity.module.css`, `airline-logo-credits.tsx`, `airline-logo-credits.module.css`, `src/data/airline-branding.ts`; five local assets and `public/airlines/NOTICE.md` |
| Search/navigation | `src/components/flight-explorer.tsx`, `airport-selector.tsx`, `site-header.tsx`, `site-footer.tsx`, `offer-attribution.tsx`, `src/app/globals.css` |
| Cards/comparison/sellers | `src/components/flight-card.tsx`, new `flight-card.module.css`, `comparison-panel.tsx`, `comparison-panel.module.css`; `seller-offer-metadata.tsx`, `seller-offer-metadata.module.css` |
| Checkout/tickets | `src/components/checkout-flow.tsx`, new `checkout-breadcrumb.tsx`, `journey-summary.tsx`, `issued-ticket.tsx`, `my-tickets.tsx`, `booking-flow.module.css` |
| Tests | New `tests/airline-branding.test.ts`, expanded `tests/seller-offers.test.ts`, new `tests/e2e/refinement-search.spec.ts`, `refinement-comparison.spec.ts`, `refinement-booking.spec.ts`; adjusted affected legacy flight/refinement browser expectations |
| Documentation | This document, `AIRLINE_LOGOS.md`, `LOCAL-TICKETING.md`, README, AGENTS, PRD and ARCHITECTURE |

No flight fixture, provider adapter, currency/history algorithm, package manifest, font configuration, ticket schema or search API was changed.

## Limitations and manual review

- Five authentic source/license-backed logos were installed; the other sixteen audited identities intentionally use the requested fallback. Original Taban artwork includes whitespace, and Iran Air uses an original JPEG instead of a damaged PNG candidate. Asset licensing/trademark evidence and exact sources are recorded separately; no official endorsement is claimed.
- Some icons remain outlines where a clear consistent filled equivalent was unavailable. Solid glyphs are project-authored UI icons, never invented airline marks.
- The current Yekan font is intentionally retained according to the actual design authority. Success-status green is the user's explicit semantic exception; cancellation evidence meanings/colors remain unchanged.
- The PDF still captures the rendered RTL document as a raster image; its text is not searchable/tagged. Downloaded documents now include the applicable logo credits. Physical mobile keyboard/assistive-technology behavior still requires device testing beyond Chrome viewport emulation.
- Real login, installment purchasing, payment, reservations, airline issuance and rescheduling remain outside this local demonstration. Existing lint-toolchain dependency findings documented in the previous iteration are unaffected.

## Verification

| Check | Result |
| --- | --- |
| `npm run lint` | Passed, zero warnings. |
| `npm run typecheck` | Passed. Production TypeScript phase passed as well. |
| `npm test` | **508 tests across 22 files passed**, including the unchanged money/history/provider suites and 31 airline/icon checks. |
| `npm run build` | Passed with the existing Webpack command and all current routes. |
| `npm run test:e2e` | **101 production-browser tests passed in one final run**, 1.9 minutes. |
| Responsive review | Search/header, cards/sellers/comparison and checkout verified at **375/430/768/1024/1440/1920px**; existing one-way/round-trip persistence and issuance checks also pass. |
| PDF review | Actual one-way and round-trip downloads passed. The mobile PDF was rendered and visually reviewed for Persian joining, horizontal brand/logo presentation, wrapping badges, actual passengers/prices, QR, demo status and asset credits. |

The first integrated browser run found one CSS specificity defect in the new desktop-menu rule: the shared button display rule overrode it. Strengthening only the header-scoped selector fixed all four affected checks. The complete suite then passed without weakening those assertions.

Focused/new coverage checks baseline alignment even after a birth-date validation message, neutral badge semantics, guarded breadcrumb/browser back/forward, rejection of forged future-step URLs, My Tickets status/CTA, exact seller price and conditions, consistent comparison deletion, filled takeoff/landing semantics, menu expansion/resizing, passenger chevron alignment, compact sorting and essential remaining provenance. No historical verification count is reused as certification for this iteration.

Saved evidence: [desktop search](screenshots/functional-refinements/functional-search-1440.png), [mobile search](screenshots/functional-refinements/functional-search-375.png), [mobile comparison](screenshots/functional-refinements/refinement-comparison-375.png), [desktop comparison](screenshots/functional-refinements/refinement-comparison-1440.png), [seller alignment](screenshots/functional-refinements/refinement-seller-alignment-375.png), [passenger entry](screenshots/functional-refinements/product-passengers-768.png), [My Tickets](screenshots/functional-refinements/refinement-my-tickets-375.png), [issued ticket](screenshots/functional-refinements/refinement-issued-375.png), [PDF preview](screenshots/functional-refinements/ticket-pdf-preview.png) and [round-trip PDF](screenshots/functional-refinements/product-round-trip-1440.pdf). These contain synthetic test passengers only.
