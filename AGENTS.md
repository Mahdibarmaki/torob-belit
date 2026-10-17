# Flight AI development rules

## Current product authority — metasearch/referral (2026-10-17)

The user has explicitly replaced local booking/ticketing with flight discovery,
comparison and external seller referrals. This supersedes every older instruction
below to preserve checkout, passenger forms, internal issuance, My Tickets,
ticket storage or PDF/QR exports. Those routes and exclusive dependencies are
removed. Do not restore them. Preserve all unrelated search, AI interpretation,
ranking, round-trip planning, localization, history and current visual behavior.

Use the central reviewed seller registry/resolver for `خرید بلیط`; new-tab HTTPS
links require approved exact hosts and reviewed destinations. Current links
continue to seller search only, with no promise of a matching flight/price or
partnership. Missing/unverified sellers remain unavailable; never invent deep
links or forward passenger data. Demo/live/reference sources remain distinct.
Do not create new checkout/ticket records or read/delete legacy records. See
[METASEARCH.md](docs/METASEARCH.md) and
[SELLER_DESTINATIONS.md](docs/SELLER_DESTINATIONS.md) for current behavior,
security evidence and the file inventory. Older ticketing notes are historical.

## Current AI UI refinements — 2026-10-16

**Preference follow-up (2026-10-17):** restore the latest validated same-mode
saved intent on reload without automatic model/search requests. Keep the panel
closed until its trigger is clicked; restoration, failures and recommendations
must not expand it. Keep all editing and Apply controls inside the hidden body
without resetting valid values on collapse. The trigger shows only its icon,
title and chevron; the former trip summary and its reserved space are removed.
Controls retain the canonical intent; see [AI_UI_REFINEMENTS.md](docs/AI_UI_REFINEMENTS.md).

[AI_UI_REFINEMENTS.md](docs/AI_UI_REFINEMENTS.md) records the user's six targeted
UI changes. The regular-search entry is flush with the panel's RTL upper-right
edge, extends above it, and uses the explicitly authorized soft lavender
gradient/purple icon and text, without a red underline. The dedicated assistant
page must not repeat this tab. Welcome retains its title; active conversation
uses opposing neutral-user/lavender-assistant text bubbles without avatars or
visible repeated role headings. Structured results remain full-width blocks.
Use the existing primary CTA for `اعمال ترجیحات`; preserve validation, manual
preferences and deterministic requests without unnecessary LLM calls. Remove
rendered provider diagnostics, the empty-budget chip and separate logo-license
notice/dialog. Real error messages remain visible. Required attribution stays
accessible through actual source-linked logos and unchanged public/project
metadata and About/ticket/PDF credits. Preserve existing AI/provider/env/data/
ranking/history/booking behavior. This scoped lavender exception supersedes
older assistant-only white-tab/active-tab/diagnostic presentation descriptions.
Combined verification passes lint, TypeScript, 675 unit tests, production build
and all 139 browser tests, including six-width tab/bubble checks and real
structured Apply without model requests. Real OpenAI inference was not retested.

## Current AI Assistant extension — 2026-10-16

**Activation follow-up:** the user has authorized real OpenAI verification using
the ignored local key. Model-list authentication succeeded; `gpt-5.6-luna` is
explicitly configured. The real interpretation request failed on quota/billing,
so do not claim verified extraction or working model inference. Follow
[OPENAI_ACTIVATION.md](docs/OPENAI_ACTIVATION.md) and distinguish authentication,
quota, transient rate limits, request configuration, provider and schema errors.
Regression servers explicitly disable real credentials; avoid billed calls in
ordinary tests. No UI, inventory, ranking or historical policy changes accompany
activation. Earlier no-key observations below describe the initial delivery.

The user authorizes the additive `/ai-assistant` experience documented in
[AI_ASSISTANT.md](docs/AI_ASSISTANT.md) and its optional server-only model adapter
in [AI_PROVIDER.md](docs/AI_PROVIDER.md). This supersedes historical statements
below that defer all model integration. OpenAI Responses interprets validated
preference patches only; it never supplies inventory, scores, history or booking
facts. Require both `OPENAI_API_KEY` and `OPENAI_MODEL`, keep them server-side,
and never claim successful real inference merely because configuration exists.
No credentials or successful external model call were available during this
iteration. Missing credentials must remain honestly unavailable; independent
structured controls and deterministic recommendations remain usable.

Keep the raised assistant entry separate from the unchanged trip-type tabs.
Reuse current cards, dialogs, exact seller selections, comparison and local
ticketing. Apply all hard requirements to one eligible offer before the separate
eight-factor assistant ranking; ordinary-search policy remains unchanged.
Preserve manually confirmed fields, clarify ambiguous airports/dates/budgets,
and require explicit confirmation of conflicting model suggestions. Keep source
modes isolated, synthetic history explicit, canonical rials and Jalali boundaries
unchanged. Store validated preferences only, without chat or identity documents.
Round trips require explicit outbound and compatible inbound seller selections
and one combined budget. Never silently purchase a ranking companion fare.
Final combined verification: lint, TypeScript, 659 unit tests, production build
and all 137 production-browser tests pass; real model quality remains unverified.

## Current six-item branding follow-up — 2026-10-16

[UI-BRANDING-FIXES.md](docs/UI-BRANDING-FIXES.md) records the targeted ticket,
validation, mobile-price and footer changes. Keep the issued ticket free of the
former inline logo-source block; attribution-requiring logos retain compact
dialog access and actual used-logo credits in exported PDFs. CC0/PD-only
tickets have no extra license action. Footer socials use Graphite and the
rightmost licensed Instagram glyph, with no invented account URL. Price/summary
alignment changes apply only at the existing mobile breakpoint. Six verified
logo identities are installed; Qeshm and the documented 14 other fallbacks need
usable rights-backed artwork. Do not guess their logos or claim full coverage.
Preserve all existing data, cancellation, money, search and booking behavior.

## Current comprehensive refinements — 2026-10-16

[UI-FUNCTIONAL-REFINEMENTS.md](docs/UI-FUNCTIONAL-REFINEMENTS.md) records the latest authorized 23-part refinement. Retain the actual current Yekan Bakh FaNum/`DESIGN.md` authority; the attachment's older Vazirmatn/Airbnb references do not require reverting the approved migration. Short informational facts use shared neutral `MetadataBadge`/`BadgeGroup`; historical evidence and issued-demo success remain separate semantic statuses. Reuse reviewed solid icons with clear outline fallbacks and guarded, source/license-backed airline identities, including accessible attribution in About and exported tickets. Never guess another carrier's logo.

The search-information details notice is now removed completely. Keep actual warnings, the small results demo label, provider statuses, and relevant per-offer/history/checkout/document provenance; do not recreate the removed notice or source/guide navigation. Full navigation replaces the hamburger at 1024px+. Checkout confirmation is URL-backed only after validated review; previous-step/browser navigation preserves the session draft, edits invalidate review permission, and future links cannot bypass validation. Issued records stay immutable and privacy-sensitive drafts remain cleared after issuance. These rules supersede historical notice/breadcrumb presentation below; existing business/data/provider/money/history rules remain unchanged.

## Current product evolution — 2026-10-16

The user's [complete product evolution](docs/PRODUCT-EVOLUTION.md) authorizes unified one-way/round-trip search and [local demonstration ticketing](docs/LOCAL-TICKETING.md). This section supersedes older statements below about automatic initial results, one-way-only travel, no local issuance, and header/footer source-information navigation. All remaining data, provider, money, localization, design, and historical-cancellation rules still apply.

- A bare `/` opens with empty airports/dates and one adult, without searching or showing result-dependent controls. Search only after explicit valid submission; a complete valid deep link may load results on the server. Preserve drafts independently from submitted criteria and results. `/results` remains a compatible entry to the same unified page.
- Keep one-way/round-trip tabs and the existing hero. Round trips search outbound and reversed inbound routes independently, with separate response/base data, draft/applied filters and sorting. Scope comparison to the active direction and submitted context; reset incompatible selections on a new search. A selected return must depart after outbound arrival.
- Reuse typed `JourneySelection`, `Flight`, and `SellerOffer` contracts. Only complete, available authored-demo offers may enter local checkout. Preserve exact selected offers and party totals; round-trip totals add canonical rials once through the shared money logic. Do not invent live inventory, prices, taxes, discounts, payment, reservations, or real airline issuance.
- Passenger entry and confirmation use `sessionStorage` for the in-progress adult-only checkout. Issued demonstration records use `localStorage`, stable references and duplicate prevention. Persist only masked identity suffixes in issued records; keep full identities/contact/birth dates out of issued storage, public URLs and QR codes. Follow the boundary validation and recovery rules in the ticketing document.
- The header has Home, unavailable installment travel, My Tickets, and a separate unavailable login control. Do not recreate Flight Guide or Data Source navigation in the header, footer or elsewhere. Retain concise provenance in the inline search disclosure and relevant offer/history/checkout/ticket content. The hero's former bottom caption is removed. Existing flight-card history badges/calculations and independent comparison controls remain.

The current `DESIGN.md` and existing Yekan Bakh FaNum, Jalali/Toman, RTL and responsive contracts remain authoritative. Historical iteration notes below are retained as context; final combined verification is recorded in the product-evolution document.

> **Current UI refinements (2026-10-16):** [Round 2](docs/UI-REFINEMENTS-ROUND2.md) continues the [twelve prior improvements](docs/UI-REFINEMENTS.md). Filters retain distinct draft/applied states and one bottom Apply/Clear pair. The dual-handle range initializes/resets from zero to the highest unfiltered eligible numeric rial price; two horizontal RTL labels display Persian Toman values. The former below-search data banner is intentionally removed; synthetic provenance remains explicit through header/footer source-information controls, with no repeated notices in each seller/card. Reference/live/cache offers still require individual attribution. The shared route component uses centered airport columns and shared name/date rows; preserve its card/details consistency. Non-CTA selections use `#FFF0F2` with readable neutral text. Cards open details through a stretched native sibling button; keep comparison/history controls independent and never nest buttons. Account and installment entries remain explicitly unavailable placeholders.

> **Current visual authority — DESIGN.md migration (2026-10-16):** Read the root [DESIGN.md](DESIGN.md) as the single current visual source. It supersedes the former Airbnb-inspired tokens: use locally hosted Yekan Bakh FaNum, Torob Red `#EF142B`, hover `#C90F24`, the supplied neutral/type/spacing/radius/elevation values, and the recorded resolutions in [DESIGN-INTEGRATION.md](docs/DESIGN-INTEGRATION.md). Preserve the existing user-facing name ترب بلیط, unchanged supplied emblem, continuous airplane-photo hero background, attached navigation/search, two-column desktop tickets, modal/bottom-sheet interactions, text actions, complete footer, and all functionality. The older reference screenshots and [UI-REDESIGN.md](docs/UI-REDESIGN.md) describe the approved product structure and earlier styling; they do not override the new visual tokens. Keep the full local demo default, all original data/prices/algorithms and explicit source modes; disclose simulation discreetly through source controls/details instead of the removed banner and exact legacy phrases. No provider transport changes or real booking are authorized.


## Project objective and authority

ترب بلیط (internal project name Flight AI) is an independent flight discovery and comparison application. Help users find the most suitable flight for their stated needs; price is one factor among schedule, duration, stops, baggage, fare terms, and retrospective cancellation history.

Follow the user's latest authorized scope first. The project specifications are:

- [docs/PRD.md](docs/PRD.md): product scope, behavior, acceptance criteria, and data truthfulness.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): domain contracts, API boundaries, algorithms, policies, and proposed structure.
- [docs/ROADMAP.md](docs/ROADMAP.md): seven working days and implementation dependencies.
- [DESIGN.md](DESIGN.md): the single current visual source of truth; current migration decisions and historical integration notes are recorded in [docs/DESIGN-INTEGRATION.md](docs/DESIGN-INTEGRATION.md).
- [docs/LOCALIZATION.md](docs/LOCALIZATION.md): Jalali presentation, Gregorian date-only boundaries, canonical rial storage, and Toman formatting/normalization.
- [docs/INTERVIEW_DEMO.md](docs/INTERVIEW_DEMO.md) and [docs/REFERENCE_REVIEW.md](docs/REFERENCE_REVIEW.md): inspected offline source, adapter modes, unpriced-record exception, integration limits and rejected reference behavior.

Report material contradictions rather than silently changing behavior. Routine reversible implementation choices within approved scope do not need repeated permission. Update affected documentation when an authorized decision changes.

## Current implementation iteration

The user has explicitly authorized restoring the fully populated offline demo as the local default, extending deterministic domestic fixtures, using sourced genuine airline identities and illustrative aircraft models, and preserving all existing provider/reference integration readiness. This supersedes the previous documentation-only iteration and stop rule. Preserve the existing Next.js design/UI architecture; the reference's separate Node server/frontend, invented competitor prices, auto live-to-fixture fallback, wrong-route fallback and undocumented token/header transport are not ported. Undocumented or unauthorized network access, paid setup, model APIs and public deployment remain outside scope.

The current supplied source is saved as `DESIGN.md` and reviewed before visual implementation. Apply its exact tokens while preserving the existing layouts, features, data, and algorithms; document contradictions and intentional adaptations rather than inventing replacement design rules or importing its example analytics features. Use the provided local Yekan Bakh FaNum files and map unsupported 600 weights to the actual 700 face, with normal Persian tracking. The required Persian cancellation labels and existing green/amber/red/gray historical-status colors remain distinct from brand actions; preserve their meanings and calculations.

For future visual changes, continue to honor the original prerequisite: “Do not build UI components until Design.md has been provided and reviewed.” The current supplied and reviewed `DESIGN.md` fulfills that prerequisite; the quoted historical filename does not create a second visual authority. Routine reversible work within this authorization needs no repeated implementation approval.

## Engineering conventions

- Use the approved Next.js App Router, React, strict TypeScript, Tailwind CSS, server-side Route Handlers, normalized provider adapters and explicitly selected local typed fixtures. No separate backend, database, or global state library without a concrete need and an authorized scope change.
- Keep pure domain logic independent of Next.js, React, environment variables, fixtures, and network libraries. Application services coordinate provider contracts; adapters normalize external data; routes validate and serialize.
- Reuse the same domain/services for search, detail, comparison, and explanations. UI components must not contain competing eligibility, money, history, or ranking implementations.
- Keep provider/model adapters and credentials server-only. Never put a secret in a public environment variable or client bundle. Server Components call services directly instead of their own HTTP routes.
- Treat incoming JSON, future provider payloads, and preference text as untrusted data. Validate at boundaries, bound request sizes, return stable typed failures, and sanitize error details. TypeScript types are not runtime validation.
- Avoid broad abstractions and extra dependencies until they solve an actual MVP requirement. Verify compatible maintained versions during authorized scaffolding and preserve a lockfile.
- Search with `rg`/`rg --files` first. Inspect existing changes before editing and preserve unrelated work. Use `codex/` for an agent-created branch unless the user specifies another name. No commits, pushes, or pull requests are required unless requested.

## Synthetic data and provenance

- Default to the self-contained synthetic demo for local use. Provider and imported-reference modes require explicit selection and cannot silently receive demo offers. Real airport/airline/aircraft metadata does not make generated flights or history real.
- `mode: "fixture"` is a separate explicit offline Alibaba reference selection, not a live connection or four-provider mock. Match exactly THR–MHD/THR–SYZ on stored date 2026-10-15; unsupported queries must not substitute a route/date. Preserve `capturedAt: null`, the manifest's fixed `importedAt` and unverified provenance. Compatibility `fetchedAt` means local fixture import time here and must be labeled accordingly, never a provider refresh. Keep sanitized derivative files/source hashes and do not expose opaque proposal/session identifiers.
- Keep `sourceState: "LIVE" | "FIXTURE" | "UNAVAILABLE"` distinct from cache delivery (`hit`/`miss`/`none`, plus visible cached copy). A cache hit does not make offline data live or change its timestamp. The six-second total provider deadline includes transient retries/backoff; successful responses cache for sixty seconds with bounded process-local entries and in-flight deduplication. These are local defaults, not provider SLAs or cache licenses.
- Clearly label synthetic data in responses and wherever prices, details, comparisons, or history are independently presented. Never call demo fares live, current market prices, refreshed quotes, or available inventory.
- Keep dataset ID/version, fixed `asOf`, searchable dates, and linked identifiers coherent. Use the fixture reference clock for demo behavior; never quietly roll fixture history forward with the host date.
- Preserve source/mode and observation/reference time on offers and history. A future real-provider failure must not silently fall back to synthetic results. Mixed-source data needs explicit provenance for each affected value.
- Missing information stays missing. Do not turn unknown baggage, fees, operating identity, availability, cancellation outcomes, or roster completeness into favorable defaults.
- Future providers must implement normalized interfaces while retaining source references and missingness. Current authorization covers readiness and verified authorized integrations, not paid account setup or guessed API access.

## Search, offers, and comparison

- Match exact airports and first-leg origin-local departure date. Calculate elapsed durations and connection order from UTC instants using explicit IANA zones for local dates/windows.
- Group physical itineraries by exact ordered operating identities, routes, and scheduled instants. Preserve marketing codeshares separately. Do not fuzzy-merge schedules or guess missing operating identifiers.
- Canonical money is `{ currency: "IRR", unit: "rial", amountRials }`, with a nonnegative safe integer amount. Normalize an explicitly tagged provider/form Toman amount into rials exactly once; already-normalized rials pass through unchanged. Display every price through the shared `formatToman` utility, preserving a remaining rial as one decimal Toman digit. Never infer a unit from the amount, apply a foreign-exchange assumption, round away a rial, or sort formatted strings. Compare complete totals for the same party, cabin, and charge basis. Unknown mandatory charges make a quote incomplete and ineligible for comparable price/budget claims.
- A supplied reference amount with unverified unit is not canonical money. Preserve it in the typed `UnpricedFlightOffer`/`UnpricedFlightSearchResult` branch with `totalPrice: null`, `priceComplete: false` and raw price evidence; show «واحد مبلغ تأیید نشده» (optional raw Persian digits without a currency suffix). Exclude it from budget/cheapest-price claims and price-derived ranking. Do not divide by ten because the reference code does: its own rules question that assumption. Offline schedule/detail comparison can remain available without fabricated price, fees, seller, booking or historical evidence.
- Present every user-facing date in the Jalali calendar with Persian month names and numerals. Keep `LocalDate` as Gregorian ISO `YYYY-MM-DD` for search, API, and storage; keep UTC `Instant` values separate. Convert selected Jalali fields with the shared Temporal-based calendar utilities, never through the browser's implicit time zone. Format timestamp dates in the appropriate airport/source IANA zone; calendar changes must not change history windows, identity matching, or duration calculations.
- Budget controls accept Persian/Arabic/Latin digits and valid thousands separators as Toman, then submit canonical integer `maxPriceRials`. Legacy USD or `maxPriceMinor` requests are rejected rather than reinterpreted. Keep the accessible Jalali picker within the reviewed tokens and reusable dialog/focus conventions; verify month/year navigation, RTL keyboard behavior, and date bounds.
- Keep each seller/fare offer distinct, including baggage per adult and per segment, terms, availability, and ticketing protection. One offer must satisfy all hard constraints; never combine one seller's cheap price with another's baggage or fare terms.
- Only independently eligible offers can establish an itinerary's representative or cheapest eligible price. Unknown affirmative requirements do not pass hard filters.
- Compare two or three unique itineraries in one validated search context with explicit seller offer selections. Revalidate on context changes and identify invalid selections; never silently replace a chosen fare.

## Historical cancellation rules

- History is retrospective evidence, never a calibrated future cancellation probability. Avoid claims such as “will not cancel,” “safest,” or a predicted cancellation percent.
- Follow the versioned architecture policy: previous 30 completed origin-local calendar days anchored to source `asOf`; match operating carrier, normalized operating flight number, origin, and destination exactly. An optional departure pattern distinguishes documented repeated service slots using the original origin-local scheduled minute; never guess a pattern or widen matching.
- Use original scheduled departure and stable canonical operation identity through revisions. Preserve separate repeated same-day operations; deduplicate codeshares/provider observations. Discard revisions observed after `asOf`.
- A verified expected scheduled-operation roster defines coverage. Never assume daily frequency or use received outcome rows as the expected count. Missing, unresolved, and conflicting outcomes are excluded from known outcomes and reported.
- The observed fraction is `cancelled / (cancelled + operated)`. The user's minimum is 10 known historical flights; retain the existing verified-roster 80% coverage gate as an additional evidence requirement. Valid matching data and expected count above zero are also required. Unknown cannot become zero cancellations or low history.
- The user's updated thresholds supersede the old policy: low below 10%, medium from 10% to below 25%, high at least 25%. Compare unrounded values. Every flight card visibly shows the sufficient historical percentage and Persian label `کم`, `متوسط`, or `زیاد`; unknown uses `—` with `داده ناکافی` or `نامشخص`. Semantic colors are green, amber, red, and gray plus text; use design-derived rendering for the status-color exception.
- Headline `cancellationRate` is null for unknown/insufficient evidence and renders `—`, never `0%`. Available diagnostic `observedRate` is detail-only with an insufficiency explanation. The accessible popover/dialog shows cancelled and known total counts, expected/unknown/missing counts, coverage, period, source, and last update. In demo mode last update means the fixed synthetic reference, never real refresh activity.
- For connecting itineraries, show each leg's percentage and label. Summary is unknown if any leg is insufficient; otherwise use the worst category. Do not sum/average rates, pool legs, assume independence, or manufacture an overall journey probability. History filters and sorting reuse the domain output; unknown sorts last.

## Ranking and natural-language preferences

- Apply hard constraints before scoring. Ranking uses versioned, deterministic, explainable utility from actual eligible offers; follow the architecture's fixed references, active weights, unknown handling, and tie-breaking.
- Scores describe suitability under the current preferences. They are not confidence, factual quality, or future reliability. Explanations must match the selected offer, scored factors, missing evidence, and active sort. Historical evidence remains a typed input for future AI-assisted ranking without becoming a forecast.
- The initial natural-language interpreter is a local deterministic simulation and must be labeled **simulated demo interpretation**. Do not imply true AI/LLM inference. A real model adapter remains a later decision.
- Interpret text into validated proposed filters/preferences only. Expose ambiguities, unsupported phrases, and conflicts. Apply changes after user review/acceptance; preserve structured route/date/party and do not quietly relax requirements.
- Text cannot execute code, choose arbitrary endpoints, call tools, or invent fare/history facts. Future model output is validated against the same allowlisted schema. Failure preserves manual controls and the prior request; it does not trigger an unlabeled demo fallback.

## Verification and delivery

- For documentation changes, check completeness, cross-document consistency, relative links, current authorization, and repository diff.
- For approved implementation, use meaningful tests for identity, same-offer eligibility, money, time zones, history denominator/coverage/reconciliation, ranking invariants, interpretation issues, and comparison contracts. Use fixed clocks and coherent fixtures.
- Run relevant type/lint/build checks and targeted critical-flow tests when tooling exists. Include browser/accessibility checks for the authorized UI, card labels and percentages, and keyboard-accessible history details. Check exact 10%/25% thresholds and the 10-known/80%-coverage boundaries. Do not create tests that merely mirror implementation or repeat passing checks without new concerns.
- The supplied reference's original four Node tests ran and passed locally; their round trip and divide-by-ten assertion do not verify token server validity, price units, capture authenticity or provider authorization. Current app verification must be recorded separately after checks complete; do not reuse earlier iteration counts as current certification.
- Localization checks cover Jalali/Gregorian round trips, month/year boundaries and leap Esfand, date-only independence from host zones, origin-local search dates, lossless rial/Toman conversion, Persian formatted prices and budget input, numeric price order, and consistent card/detail/comparison/history presentation. Rerun the unchanged cancellation-history suite when shared time/model boundaries change.
- Keep disclosures, accessible labels, keyboard operation, text history statuses, and explicit missing/error states in the acceptance review. Derive all visual choices from reviewed `DESIGN.md` and record material accessibility limitations honestly in its integration notes.
- Report concrete changes, what was verified, material limitations, and remaining decisions. Do not claim a check ran when it did not or that implementation is complete before verification. Deliver the authorized local application; real-provider connections require documented authorized access, and public deployment remains separate.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
