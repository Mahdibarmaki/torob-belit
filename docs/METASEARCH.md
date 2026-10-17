# Metasearch and external seller referrals

Current product authority, **2026-10-17**. This supersedes historical local
booking, issuance, checkout-progress and My Tickets descriptions elsewhere.

## Product journey

**Flight search → Results → Flight details → Seller offer → External seller.**
Torob Belit compares data and explains recommendations; it does not process
payments, collect passenger identity/contact documents, hold inventory, confirm
bookings, issue tickets or manage purchased tickets. The red `خرید بلیط` CTA
opens the selected seller destination in a separate tab. No intermediate
confirmation or internal purchase submission is introduced.

Existing search, independent round-trip results/filter/sort state, Jalali dates,
canonical rial totals/Persian Toman formatting, airline identities, cancellation
history, comparison, AI intent extraction and deterministic ranking remain.
Travel Preferences retains the latest validated session values, starts closed
and displays only its existing icon/title/chevron when collapsed.

## Reviewed sellers

| Current offer identity | External destination | Destination type |
| --- | --- | --- |
| `demo-seller-0` / علی‌بابا | [Alibaba](https://www.alibaba.ir/) | Published public flight-search entry at site root; direct retrieval timed out during review. |
| `demo-seller-1` / فلای‌تودی | [Flytoday](https://www.flytoday.ir/flight) | Official public flight-search landing, search form observed. |
| `demo-seller-2` / مستربلیط | [MrBilit](https://mrbilit.com/plane-ticket) | Official public flight-search landing, linked by homepage and search form observed. |

All three current authored-demo sellers have a reviewed destination. No
matching-flight or offer-specific booking URL is approved. Alibaba-reference
records explicitly retain an unverified seller identity and have no destination;
other unknown sellers also remain unavailable. Safarmarket and Snapptrip stay
disconnected inventory adapters, not fabricated seller offers.

[SELLER_DESTINATIONS.md](SELLER_DESTINATIONS.md) records primary evidence,
retrieval limits and the exact review policy. Alibaba's official published link
identifies a flight entry, but does not certify its current page uptime. No
provider route/date search, inventory collection, real purchase or partnership
was verified. Ordinary user referral does not authorize automated access.

## Shared implementation and safety

- `src/data/sellers.ts` centralizes official websites, search destinations,
  exact approved hosts, stable aliases and evidence. Offer fixtures and their
  original `bookingUrl: null` remain unchanged.
- `resolveSellerDestination` is pure and returns a classified destination or
  `null`. It accepts known seller IDs, not user-entered URLs or seller labels.
  HTTPS, exact hosts and reviewed URL shapes are required. It ignores fixture
  URLs. A future live booking destination must receive exact source-specific
  approval; every current booking approval list is empty. Unapproved provider
  URLs cannot become clickable merely because their host looks plausible.
- Native links use `target="_blank" rel="noopener noreferrer"`. No airport,
  date, passenger, identity or offer identifier is appended. Opening them does
  not close details, alter selection/filter/comparison, create checkout state,
  reserve inventory or certify the displayed offer. Query-free search links
  are explicitly labeled as seller-search continuation, with no flight/price
  guarantee; a missing destination shows a disabled CTA and explanation.
- `FlightDetails` preserves the existing seller layout, metadata, prices and
  comparison controls and is shared by cards in ordinary/AI results and by
  comparison. Native nested dialogs retain the existing focus/scroll handling.
- `JourneySelection`, its exact-fare/chronology validator and `journeyTotal`
  move to `domain/journey-selection.ts`. They remain reusable comparison/ranking
  logic, with no passenger or ticket models. Round-trip planning is in memory;
  `انتخاب برای سفر` is independent from `خرید بلیط`. AI outbound pinning and
  total-budget checks remain. A planned pair is not a guaranteed combined
  purchase; each external seller sets its own final terms.

## Removed features and browser data

Passenger/contact forms, national-ID/passport/birth-date validation used only
for checkout, confirmation/review steps, simulated issuance, ticket references,
issued documents, local ticket storage, PDF and QR exports, My Tickets and its
desktop/mobile navigation entry are deleted. `/checkout`, `/my-tickets` and
`/tickets/*` return 404 rather than usable internal pages.

No current code reads/writes legacy ticket or checkout records. Existing browser
records are deliberately left inert; there is no destructive migration and no
unrelated storage is deleted. Assistant preference persistence remains active
and independent. Users can remove historical browser data themselves if desired.
About retains actual airline source/license attribution; ticket/PDF-only
credit presentation was removed with export functionality.

Exclusive direct dependencies removed: `html-to-image`, `jspdf`, `qrcode`,
`@types/qrcode`. The lockfile was pruned offline by dependency reachability,
preserving required edges and root-manifest parity; no dependencies were
installed and no provider/model credentials were changed.

## File inventory

Paths are relative to the project root. Moves are listed under new and removed
paths to make the complete cleanup explicit.

### New / moved-in files

- `src/data/sellers.ts`
- `src/domain/seller-destination.ts`
- `src/domain/journey-selection.ts` (shared selection logic extracted)
- `src/components/flight-details.tsx` (existing details presentation shared)
- `src/components/assistant/use-assistant-journey.ts` (in-memory planning only)
- `tests/seller-destination.test.ts`
- `tests/journey-selection.test.ts`
- `tests/e2e/seller-referrals.spec.ts`
- `tests/e2e/assistant-referral.spec.ts`
- `docs/SELLER_DESTINATIONS.md`
- `docs/METASEARCH.md`

### Removed / moved-from files

- `src/app/checkout/page.tsx`
- `src/app/my-tickets/page.tsx`
- `src/app/tickets/[reference]/page.tsx`
- `src/components/checkout-flow.tsx`
- `src/components/checkout-breadcrumb.tsx`
- `src/components/issued-ticket.tsx`
- `src/components/my-tickets.tsx`
- `src/components/booking-flow.module.css`
- `src/components/journey-summary.tsx`
- `src/components/assistant/use-assistant-booking.ts`
- `src/domain/booking.ts`
- `src/lib/booking-storage.ts`
- `tests/booking.test.ts` (shared cases retained in journey selection tests)
- `tests/booking-storage.test.ts`
- `tests/e2e/assistant-booking.spec.ts` (reworked as assistant referral tests)
- `tests/e2e/branding-ticket.spec.ts`
- `tests/e2e/refinement-booking.spec.ts`

### Modified files

- `src/app/layout.tsx`
- `src/app/globals.css` (unused internal purchase-message rule removed)
- `src/application/assistant-recommendations.ts` (shared import only)
- `src/components/flight-card.tsx`
- `src/components/flight-explorer.tsx`
- `src/components/comparison-panel.tsx`
- `src/components/ai-assistant.tsx`
- `src/components/assistant/recommendation-results.tsx`
- `src/components/assistant/travel-preferences.tsx` (obsolete issuance copy only)
- `src/components/assistant/use-assistant-conversation.ts` (comment only)
- `src/components/ui.tsx` (nested Escape guard and updated dialog comment)
- `src/components/site-header.tsx`
- `src/components/site-footer.tsx`
- `src/components/airline-logo-credits.tsx`
- `src/components/airline-logo-credits.module.css`
- `package.json`, `package-lock.json`
- `tests/airline-branding.test.ts`
- `tests/assistant-recommendations.test.ts`
- `tests/comparison-presentation.test.ts`
- `tests/seller-offers.test.ts`
- `tests/provider-presentation.test.ts`
- `tests/e2e/product-flow.spec.ts`
- `tests/e2e/product-edge-cases.spec.ts`
- `tests/e2e/refinement-search.spec.ts`
- `tests/e2e/refinements.spec.ts`
- `tests/e2e/round2.spec.ts`
- `tests/e2e/flight.spec.ts`
- `README.md`, `AGENTS.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`
- Historical-authority banners: `docs/LOCAL-TICKETING.md`,
  `docs/PRODUCT-EVOLUTION.md`, `docs/AI_ASSISTANT.md`, `docs/ROADMAP.md`,
  `docs/AIRLINE_LOGOS.md`, `docs/UI-BRANDING-FIXES.md`,
  `docs/AI_UI_REFINEMENTS.md`

No `DESIGN.md`, font/logo assets, flight fixtures, provider transports, monetary
normalization, cancellation calculator or model integration were changed.

## Verification and limitations

Browser referral tests intercept external HTTPS navigation with controlled pages: they
verify destination identity, new-tab isolation and preserved local state without
contacting sellers or asserting real availability. Deleted routes and inert
legacy/unrelated storage are tested. AI tests disable real credentials and do
not spend model quota. Physical mobile keyboards and real external checkout are
outside these checks.

### Resumed final verification — 2026-10-17

The interrupted production browser run finished and recorded five failures.
Preserved results are available locally at
`/private/tmp/torob-referral-qa-preresume`. Four failures came from test
assumptions: the AI comparison test used the first card after a seller change
reordered selections; two seller tests matched both card and modal Remove
buttons; and the removed-route test expected the default `404` heading rather
than the application's Persian `صفحه پیدا نشد` heading. The corresponding
assertion corrections were already saved before the interruption and were
preserved. The fifth failure involved reopening the mobile filter at 768px;
it did not recur in either the affected-suite rerun or the final full run, so
no speculative application change was made for it.

The saved AI comparison correction (removing an alternate selected seller from
the main card rather than switching to the base fare) had not yet been included
in the prior build. A fresh production build now includes it and its browser
regression passes. No new application code was changed during the resumed
verification.

- Current lint, TypeScript, production build and **700 unit tests in 27 files** pass.
- **13 affected production-browser tests pass**: all three external sellers at
  375px/1440px, exact AI seller selection/removal and round-trip pins, comparison
  details with nested Escape/focus/scroll behavior, unknown-seller missingness,
  removed-route 404s, inert legacy storage and responsive filter/route checks.
- The final **124-case full production-browser regression passes in one run**,
  including the previously intermittent mobile case in its normal full-suite
  order. There are **zero remaining test failures**. No test was skipped or
  retried in this final run.
- Source inspection confirms no active checkout, issuance, My Tickets route,
  navigation or persistence code remains. Assistant preferences are the only
  active browser-storage boundary. All three registered destinations are HTTPS,
  exact-host-approved, query-free search entries; no live booking links or
  matching external inventory have been verified.

Reviewed current evidence:
[375px seller details](screenshots/metasearch/seller-referrals-375.png),
[1440px seller details](screenshots/metasearch/seller-referrals-1440.png),
[375px AI round-trip planning](screenshots/metasearch/assistant-round-trip-referral-375.png).
These captures contain synthetic local offers, not seller inventory.

Resume-only modified files: this verification report, `README.md`, and the three
evidence PNGs above. Application and test-source fixes already present at resume
were preserved and verified rather than rewritten. The complete earlier
implementation/removal inventory remains listed above. Git inspection showed
the project files were already untracked; no existing work was reverted.
