# Seven-day MVP roadmap

> **Current product model — 2026-10-17:** Torob Belit is a flight discovery, comparison and seller-referral platform; [METASEARCH.md](METASEARCH.md) is the current handoff specification. Purchases happen on external travel agency websites. Internal checkout, passenger entry, issuance, My Tickets and ticket PDF/QR export have been removed. The dated milestones and verification below preserve historical delivery records and do not restore removed features.

## Current AI Assistant delivery — 2026-10-16

The original seven-day plan below remains historical. The local demo, round-trip
ticketing and subsequent approved refinements are implemented. Current default
inventory remains offline `demo`; `live` and imported `fixture` are explicit,
separate modes. The user authorized an additive model-compatible assistant;
this supersedes historical model-deferral and default-live statements below.
Full details: [AI_ASSISTANT.md](AI_ASSISTANT.md), [AI_PROVIDER.md](AI_PROVIDER.md).

| Phase | Current result |
| --- | --- |
| 1 — UI foundation | Completed: connected raised entry, dedicated route, verified logos, exact welcome copy, suggestions, multiline composer and six-width RTL checks. |
| 2 — Search/recommendations | Completed: strict intent/patch, clocked normalization, editable controls, hard eligibility, eight-factor scoring, up to three distinct choices and grounded explanations. |
| 3 — Model integration | Server adapter, strict validation, clarification, follow-up/manual-lock handling, controlled tests and honest no-key behavior completed. **Actual external inference remains unverified: credentials unavailable.** |
| 4 — Product integration | Completed: shared flight details/comparison, exact seller selection, explicit round-trip legs, combined totals and existing checkout/local issuance/My Tickets. |
| 5 — Final QA | Passed lint, TypeScript, 659 unit tests, production build and all 137 browser tests. Saved evidence covers welcome at six widths, mobile recommendations and one-way/round-trip issued records. |

Next externally gated step: configure an authorized OpenAI project key and an
available structured-output model, run a real smoke test, then evaluate Persian
intent/clarification accuracy and latency with reviewed examples. Before public
rollout add account/distributed abuse controls, cost monitoring and provider
privacy review. Live inventory/history still require independent licensed
sources and verified agreements; no model setup unlocks those data sources.

> **Provider readiness iteration (2026-10-15):** The user's current request authorizes official-provider feasibility research and server-side integration readiness. Default search now uses the authorized-provider registry; none of Alibaba.ir, Flytoday.ir, Safarmarket.com or Snapptrip.com is connected. Missing access returns transparent statuses and no offers. Synthetic data is available only through explicit `?mode=demo`, never a fallback. [DATA_SOURCES.md](DATA_SOURCES.md) records evidence, implementation, access requirements and limitations. Its current behavior supersedes older demo-only scope statements below. Design.md, Jalali/Toman conventions and retrospective-history rules remain in force. Public deployment, paid account setup, booking and sending partnership messages remain separate actions.


Status: local MVP implementation authorized; milestones and verification remain to be completed.

The schedule covers seven working days for the authorized implementation. The current implementation iteration supersedes the earlier documentation-only stop rule. The user has authorized scaffolding, required local dependencies, domain/server logic, and UI from the supplied reviewed design. Paid/provider/model API connections and public deployment remain outside scope.

## Gates and planning assumptions

- Implementation approval has been received; proceed with the documented local scope.
- The supplied `Design.md` source is saved and reviewed before UI implementation, fulfilling the visual-source gate. [DESIGN-INTEGRATION.md](DESIGN-INTEGRATION.md) records integration decisions; the requested history status colors are the narrow exception to its single accent rule. Keep design review as a prerequisite for later visual changes.
- The MVP uses local synthetic fixtures, a deterministic demo preference interpreter, and no paid APIs. “AI” product branding must not be used to imply live model inference.
- Scope is one-way economy, 1–9 adults, exact airports, up to one connection, Toman total-party prices backed by canonical integer rials, Jalali date presentation, fixed demo dates, and comparison of up to three itineraries in a shared query, as defined in [PRD.md](PRD.md).
- Implementation follows the models, contracts, algorithms, and structure in [ARCHITECTURE.md](ARCHITECTURE.md). The work below is a sequence of reviewable milestones, not a commitment to production integration.
- The authorized localization iteration follows [LOCALIZATION.md](LOCALIZATION.md): Gregorian ISO date-only API/storage, Jalali display and accessible picker, explicit `IRR`/rial money, exact Toman formatting, and synthetic fare reseeding without foreign-exchange assumptions. Localization verification is pending until the implementation owner records actual checks.

## Delivery plan

| Day | Work and deliverable | Exit criteria |
| --- | --- | --- |
| 1 — Foundation and fixtures | Establish the authorized Next.js App Router/TypeScript/Tailwind project and select compatible dependency versions. Add domain types, money and time helpers, provider interfaces, fixed demo metadata, and local fixtures with validation. Integrate the reviewed design source and document contradictions. | Domain/API tooling starts; TypeScript checks pass; coherent itinerary, offer, airport, and operation fixtures validate. No current-time dependence or undisclosed synthetic values. Design integration is recorded before UI implementation. |
| 2 — Search and offers | Implement server-side search validation, fixture provider, itinerary matching and identity, eligible seller offers, total-party pricing, filters, explicit sorts, and typed empty/error states. | Search returns only matching eligible itineraries. Meaningful domain checks cover invalid queries, unavailable party sizes, incomplete quotes, duplicate/codeshare identity, local-date matching, and price arithmetic. |
| 3 — History, ranking, and interpretation | Implement the previous-30-completed-day matcher, exact airline/number/route identity and optional documented departure pattern, canonical operation reconciliation, minimum 10 known outcomes plus retained 80% verified coverage, and new `<10%`, `10–<25%`, `>=25%` categories. Add deterministic ranking/explanations, future-history ranking input, and simulated interpreter. Build server routes. | Meaningful checks cover 30-day boundaries, unrelated airline/number/route exclusion, pattern matching, duplicate/revised records, denominator/coverage, exactly 10%/25%, insufficient sample, and null headline rates. No future probability or true AI inference claim. |
| 4 — Search and result experience | Implement design-derived search controls, preference review, filters/sorts, results, loading/empty/error states, and synthetic-data disclosure. Every card shows historical percentage or `—` plus `کم`/`متوسط`/`زیاد`/`داده ناکافی`/`نامشخص`, with semantic status colors and text. Add history filters and ascending-rate sort with unknown last. | Search-to-results works against the local API. Accepted preferences and active filters are reviewable. Card status never substitutes unknown with `0%`; connecting cards preserve per-leg evidence. Visual choices trace to `Design.md` and documented exceptions. |
| 5 — Details, sellers, and comparison | Implement flight details, seller/fare comparison, baggage/conditions, recommendation explanations, up-to-three itinerary comparison, and accessible history popover/dialog. Show cancelled and total known counts, expected/unknown/missing counts, coverage, period, source, and fixed synthetic last update. | Comparisons keep one query and party size. Unknown diagnostics are detail-only and marked insufficient. A fourth selection is handled deliberately. Keyboard access, closing, and focus behavior work. Disclosures explain retrospective evidence and synthetic reference time. |
| 6 — Integrated quality review | Validate the complete journey and supplied design at its required viewports. Run targeted end-to-end flows, keyboard/accessibility review, type/lint/build checks, and fixture/invariant checks. Repair material defects. | Critical flows pass: direct/connecting searches, budget/baggage/history filters, history sorting, preference review, seller details, sufficient/unknown labels, accessible evidence details, and comparison. Boundary and reconciliation tests, type/lint/build failures are resolved. |
| 7 — Acceptance and handoff | Review against PRD acceptance criteria, polish explanatory content, document fixture usage/limits and local setup, record known limitations, and prepare a reviewable local demo plus provider-integration backlog. | All nine demo workflows are demonstrated with synthetic data and explicitly simulated natural-language interpretation. Actual model inference remains deferred. Documentation agrees with implementation. Remaining limitations are explicit. Publishing, paid integrations, and production readiness are separately gated. |

## Validation priorities

Use tests where they protect domain correctness or critical user behavior, rather than duplicating component implementation:

1. Exact query and canonical itinerary identity, operating/marketing carrier distinction, and common-query comparison.
2. Total-party prices, known mandatory charges, safe integer rial calculations, tagged rial/Toman normalization without double conversion, Persian Toman formatting/input, numeric price sorting/budgets, offer eligibility, and baggage missingness.
3. Jalali/Gregorian round trips, month/year boundaries, leap Esfand, origin-local date/time handling, overnight arrivals, connection durations, and daylight-saving boundaries for applicable fixture zones. Date-only selections must remain unchanged across host time zones.
4. History-window boundaries; exact airline, number, route, and optional original-departure-pattern matching; verified-roster coverage; duplicate/revised/conflicting records; denominator; 10-known and 80%-coverage boundaries; exact 10%/25% thresholds; unknown headline rate null.
5. Deterministic ranking, hard-filter enforcement, explanation consistency, handling of unknown evidence, and sort tie-breaking.
6. Preference parsing review, unsupported/ambiguous text, contradictory constraints, and bounded server input.
7. Visible card percentages and Persian category labels, unknown `—`, synthetic disclosures, accessible evidence popover/dialog with counts/period/source/reference update, history filters/sorting, and understandable empty/error states.
8. Consistent Persian month names/numerals and Toman units in search, cards, seller details, comparison, budget filters, history periods, and source timestamps; Jalali picker month/year and RTL keyboard navigation, bounds, Escape/focus return, and narrow-phone layout.

## Localization iteration within the existing milestones

| Existing milestone | Authorized localized deliverable |
| --- | --- |
| Day 1 — Foundation | Shared Gregorian/Jalali date-only conversion and formatting using existing Temporal; canonical `Money { currency: "IRR", unit: "rial", amountRials }`, tagged normalization, exact Toman formatter/parser, and versioned synthetic fare fixtures. |
| Day 2 — Search and offers | Gregorian ISO search requests, `maxPriceRials` budget validation, numeric rial sorting/eligibility/ranking, Jalali unsupported-date messages, and rejection of old USD/ambiguous minor-unit requests. |
| Days 4–5 — Product presentation | Accessible Jalali date picker, consistent local-date/time context, Toman cards/offers/explanations/comparison, Persian-digit budget entry, and localized history periods/source reference dates, using existing design tokens. |
| Days 6–7 — Verification and handoff | Calendar/leap/month/timezone and money-unit tests, search-date and numeric-price regression tests, picker keyboard/mobile/browser checks, unchanged cancellation-history tests, lint/typecheck/build, and documented actual outcomes. |

## Scope control and dependency response

| Condition | Response |
| --- | --- |
| A future visual requirement contradicts the supplied design | Record the contradiction in `DESIGN-INTEGRATION.md` and apply explicit user instructions first. Preserve the source rather than replacing its design system. |
| Fixture or history invariants fail | Repair fixture consistency and logic before building more features. Never manufacture coverage or replace unknown evidence with zero cancellations. |
| Provider credentials or paid-service suggestions appear | Keep the MVP local. Capture integration needs in a future backlog; a paid/provider connection needs separate authorization. |
| UI requirements exceed the seven-day scope | Identify the specific scope/schedule tradeoff for review. Preserve the approved nine demo workflows and data-truthfulness requirements. |
| Natural-language expectations exceed supported phrases | Preserve simulated interpretation disclosure and supported-phrase guidance. Expand tested local rules if feasible; leave real-model evaluation for a later phase. |
| Real deployment is requested | Complete a concrete reviewable build and deployment plan first. Confirm destination and publication authorization at that later stage. |

## Follow-on work after MVP acceptance

- Evaluate real fare-provider access and normalize itineraries, seller offers, availability, mandatory charges, and baggage terms.
- Evaluate operation-history sources for exact operating identifiers, scheduled-operation roster completeness, status semantics, corrections, and permitted retention.
- Select and evaluate a real natural-language model adapter with structured output, validation, privacy controls, latency/cost limits, and fallback behavior.
- Consider return/multi-city travel, passenger categories, multiple currencies, wider date/airport search, saved preferences, and refreshed offers as separate scope expansions.
- Revisit history-category thresholds using validated production evidence. Predictive cancellation probability would require a separate calibrated forecasting project.

The completion review ends with user approval of the local MVP and a decision on the next phase. It does not automatically authorize publishing or production data integrations.

## Provider rollout following the localization MVP

1. **Completed:** official-source feasibility record and four truthful readiness states; no working connection claimed.
2. **Completed:** normalized offer contract/runtime validation, exact itinerary grouping, seller deduplication, server orchestration and independent inventory/history boundary.
3. **Completed:** default search/API wired to authorized aggregation with per-source status; explicit separate demo mode preserves regression coverage; Jalali/Toman and design preserved.
4. **External dependency:** obtain an agreement, documented flight API, approved comparison/distribution rights, sandbox and provider-issued credentials. Snapptrip advertises the clearest B2B web-service path; the other providers need outbound-access confirmation.
5. **After access:** implement one provider-specific adapter and sanitized official contract fixtures, normalize unit/identity/baggage/fare/expiry semantics, validate in the sandbox, and set approved quotas/cache/deeplink behavior before production activation.
6. **Separate work:** license/verify operations roster/outcomes before enabling real historical rates. Missing trustworthy history stays unknown.
7. **Before deployment:** coordinate rate limits/cache across instances, add agreed monitoring/inbound controls and revalidation, and run end-to-end provider checks. No guaranteed seven-day date is promised for externally gated access.
