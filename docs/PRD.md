# Flight AI product requirements

## Current product model — 2026-10-17

Torob Belit is a Persian flight-search, comparison and referral application.
The journey is **Search → Results → Flight Details → Seller Offer → External
Seller Website**. The application never processes payment, collects passenger
identity/contact documents, holds inventory, confirms a booking, issues a ticket
or manages purchased tickets. Internal checkout, confirmation, issuance,
PDF/QR exports, My Tickets and related routes are removed.

- Keep flight/seller facts, per-offer price/baggage/refund terms, comparison,
  filtering, Jalali dates, Toman prices and cancellation-history evidence intact.
- `خرید بلیط` opens only a centrally verified HTTPS seller destination in a new
  tab with `noopener noreferrer`. Unknown/unverified sellers show an unavailable
  link state, without fake URLs or substituted identities.
- Current demo sellers continue to public flight-search entries. Disclose that
  synthetic offers, prices and availability are not guaranteed on the seller
  site; no live integration or seller partnership is implied. Do not generate
  undocumented route/date/passenger parameters or transmit identity data.
- AI recommendations reuse the same flight details/seller links. Deterministic
  ranking and interpretation are unchanged. Round-trip selection remains
  in-memory planning with exact offers, chronological inbound legs and one
  combined budget; purchases are independent seller referrals, not an internal
  checkout or a guaranteed combined booking.
- Legacy ticket/checkout records are ignored, without deleting unrelated data.
  `/checkout`, `/my-tickets` and `/tickets/*` render no usable feature (404).

Acceptance: verify every configured seller destination, standard/AI/comparison
continuation, unknown-link behavior, removed desktop/mobile navigation, removed
routes, state preservation and lint/type/unit/browser/build regression checks.
[METASEARCH.md](METASEARCH.md) contains the current implementation inventory and
verification. [SELLER_DESTINATIONS.md](SELLER_DESTINATIONS.md) records evidence.

The earlier iteration sections below are historical. Their descriptions of
local booking/issuance and My Tickets do not describe the current application.

## Current AI Assistant acceptance — 2026-10-16

[AI_ASSISTANT.md](AI_ASSISTANT.md) extends the existing product with a connected
assistant entry, dedicated minimal welcome/conversation route, four verified
local airline logos, suggested prompts and an accessible multiline composer.
This authorized extension supersedes historical model-deferral statements below.
Existing search, fixtures, pricing, retrospective history and local issuance
retain their current behavior and truthfulness boundaries.

- The optional real-model adapter interprets Persian travel preferences into
  validated partial updates. Preserve unmentioned and manually confirmed values;
  ask targeted questions for ambiguous airports, dates, currency or party scope.
  Source mode, fares, operations history and scores are never model output.
- Compact editable preferences must remain independently usable without model
  credentials. No-key, timeout, refusal, invalid response and source failures
  expose honest states without simulated intelligence or fallback inventory.
- Apply hard constraints to independently eligible seller offers before ranking
  across price, historical evidence, departure, duration, stops, baggage,
  refundability and airline. Show at most three distinct choices with factual
  explanations, explicit weights and neutral treatment of missing evidence.
- Reuse flight details/comparison and exact seller selection through the existing
  local checkout, issuance and My Tickets. Round trips require explicit outbound
  and chronological reversed-route inbound selections; budget covers both legs.
- Preserve Yekan Bakh, current `DESIGN.md`, RTL, Jalali dates, numeric rials/Toman,
  synthetic labels and historical risk semantics. Persist only validated travel
  preferences in session storage; never raw chat or passenger documents.

Acceptance: lint, TypeScript, 659 unit tests, production build and all 137 browser
tests pass, including six-width assistant checks and existing regressions.
Actual natural-language model success is **unverified**, with no credentials
available. [AI_PROVIDER.md](AI_PROVIDER.md) specifies the two required environment
variables and the remaining real-provider evaluation requirement.

> **Latest UI refinement (2026-10-16):** The [23-point checklist](UI-FUNCTIONAL-REFINEMENTS.md) defines the current incremental presentation, navigation, badge, logo and checkout-progress refinements. Keep the current Yekan/RTL/Jalali/Toman design and all existing product logic. The previous search-information notice is removed while essential attribution remains. Complete local ticketing and immutable browser records retain their existing truthfulness/privacy boundaries; no real booking or account feature is added.

## Current product evolution — 2026-10-16

[PRODUCT-EVOLUTION.md](PRODUCT-EVOLUTION.md) defines the latest implemented scope, and [LOCAL-TICKETING.md](LOCAL-TICKETING.md) defines its explicit local issuance and privacy limits. This section supersedes older one-way-only, automatic-first-results, no-local-booking-flow and source-navigation descriptions below; historical iteration records remain for context. Real payment, airline booking, inventory holds and real ticket issuance remain out of scope.

- The unified homepage retains the existing hero, then one-way/round-trip search and results beneath the form. First visits have no preselected airports or dates, one adult, no search request, no cards/count/filters/sort, and a helpful empty state. Valid explicit submission produces results on the same page. Complete valid deep links may load results server-side; `/results` remains compatible. Draft edits do not silently replace submitted results.
- Round trips use the selected outbound date and a return date no earlier than it, exact reversed airports, independent search failures and per-direction filters/sorting/comparison context. Users select exact seller offers for each direction, revise either selection, see the combined canonical party total, and continue with both legs. The selected inbound departure must follow outbound arrival.
- Available, complete authored-demo offers support `انتخاب بلیط → اطلاعات مسافران → تأیید و صدور → بلیط صادرشده`. Validate the supported adult passenger forms, preserve in-progress values, show exact flights/offers/baggage/conditions and totals for review, and issue only after explicit confirmation. This creates a persistent **local demonstration record**, not a payment, carrier reservation or valid travel document.
- My Tickets lists valid records stored in the current browser and reopens their details. Stable references, refresh recovery and duplicate prevention are required. In-progress forms use session storage; issued records use local storage with masked identity suffixes and without full identity documents, birth dates or contact details. The ticket QR contains only its internal URL/reference. A working PDF download preserves the Persian layout and demonstration disclosure.
- Header navigation is Home, an honestly unavailable installment entry and My Tickets; unavailable login is separate beside the menu. Remove Flight Guide and Data Source navigation entirely rather than moving it. Preserve concise source information in the inline search summary and relevant offers/history. Flight details focus on actual seller offers, while history remains independently accessible from cards. Preserve `DESIGN.md`, the approved hero, localization, data fixtures, numeric prices and cancellation calculations.

Final acceptance and combined verification belong to [PRODUCT-EVOLUTION.md](PRODUCT-EVOLUTION.md); verification counts in the older status notes below describe their historical iterations.

> **Current visual iteration:** The user-facing brand is ترب بلیط. The supplied reference screenshots and approved emblem drive the editorial hero, attached search navigation, two-column ticket cards, modal/bottom-sheet details and filters, discreet provenance, and complete footer. [UI-REDESIGN.md](UI-REDESIGN.md) records these authorized exceptions to older visual examples. Domain data, search/ranking, money and historical calculations remain unchanged.

> **Offline demo restoration (2026-10-15):** Default search is the complete local synthetic demo. Explicit `?mode=live` preserves provider readiness; `?mode=fixture` preserves the unpriced Alibaba reference. Dataset v4 covers six popular domestic routes in both directions with sixteen itineraries per route and a continuous 2026-10-15–2036-12-31 simulation horizon. Airline identities and aircraft examples are sourced; flight assignments, schedules, prices and cancellation outcomes remain synthetic. [DEMO_RESTORATION.md](DEMO_RESTORATION.md) supersedes prior defaults/date limits.


Status: restored local MVP implemented; lint, typecheck, **364 unit tests across 13 files**, production Webpack build and **22 browser tests** passed (21.1 seconds for the browser run). [DEMO_RESTORATION.md](DEMO_RESTORATION.md) records current behavior. The current implementation iteration supersedes the earlier documentation-only approval gate.

## Product objective

Help a traveler choose the most suitable flight for their stated needs by comparing schedules, journey characteristics, seller offers, and transparent preference scores. Price is one factor, alongside departure time, duration, stops, baggage, and retrospective cancellation history.

The initial MVP is a standalone flight discovery and comparison demonstration. It uses coherent local synthetic fixtures throughout. It does not book flights or claim access to live fares, availability, airline operations, or AI model inference.

## Current implementation iteration

The initial inspection on 2026-10-15 found an empty application repository and no `Design.md`. The user has since authorized implementation and supplied the design source, saved as `Design.md` and reviewed before UI work. The documentation-only iteration is complete and its implementation stop rule is superseded.

Implement the local synthetic MVP using the supplied visual source. [DESIGN-INTEGRATION.md](DESIGN-INTEGRATION.md) records design integration decisions. The requested historical-status semantic colors are a narrow exception to the single accent rule; other visual choices remain governed by `Design.md`. Paid APIs, real model inference, booking, and public deployment remain deferred.

The current localization iteration adds Jalali date presentation and Iranian Toman prices throughout the existing product. It preserves the design, RTL behavior, search/comparison rules, and cancellation-history policy. [LOCALIZATION.md](LOCALIZATION.md) records the date and money boundaries; this scope includes unit normalization, not foreign-exchange conversion.

## Current MVP scope

The implementation uses the following bounded scope for the seven-day MVP:

| Area | Initial behavior |
| --- | --- |
| Journey | One-way economy travel; exact origin and destination airports |
| Passengers | 1–9 adults; all passengers use the same itinerary and offer |
| Connections | Non-stop or one connection; no self-transfer or mixed-ticket journeys |
| Search dates | Continuous synthetic schedule generation from 2026-10-15 through 2036-12-31 internally; all visible dates use Jalali; unsupported dates return a Jalali demo-data message |
| Calendar | Jalali dates, Persian month names/numerals, and an accessible month/year date picker; Gregorian ISO date-only values remain the internal search/API/storage contract |
| Price | Toman (`تومان`) display for the entire party, including every known mandatory charge; canonical nonnegative integer Iranian rials (`IRR`, `unit: "rial"`) |
| Sellers | Multiple synthetic seller offers attached to the same scheduled itinerary |
| Comparison | Up to three itineraries from the same search query |
| Preferences | Structured controls plus a deterministic local natural-language demo interpreter |
| Recommendation | Deterministic ranking with a visible explanation of the factors and tradeoffs |
| Persistence | Local fixtures and temporary client state; no accounts or database |

Out of scope: return and multi-city travel, children and infants, flexible-date grids, nearby-airport expansion, booking or payment, live availability, alerts, accounts, loyalty programs, production LLM use, production operation-history ingestion, foreign-exchange conversion, and calibrated forecasts.

## Primary user journey

1. Select origin, destination, a supported departure date, and adult passenger count.
2. Optionally state preferences in plain language and review the interpreted constraints and priorities.
3. Search the synthetic fixture set and inspect ranked flights with their explanations.
4. Narrow results with filters or choose an explicit sort order.
5. Inspect seller offers, baggage, itinerary details, and the evidence behind history labels.
6. Compare up to three eligible itineraries and select a preferred option for evaluation. Selection does not reserve, purchase, or redirect to a real booking offer.

## Functional requirements and acceptance criteria

| Feature | Required MVP behavior and acceptance criteria |
| --- | --- |
| Search | Validate exact airport identifiers, distinct origin/destination, supported date, and integer passenger count. Date matching uses the first leg's departure date at the origin airport. Return only complete matching itineraries with at least one offer valid for the requested party; distinguish no matches, unsupported demo date, invalid input, and service failure. |
| Jalali dates | Display search, results, leg details, comparison, history periods, and source reference dates in Jalali with Persian month names/numerals. The date picker supports month/year navigation, keyboard day selection, accessible labels, bounds, Escape dismissal, and focus restoration. Convert selections to Gregorian ISO date-only values before searching. Do not derive a date-only selection from a timestamp or implicit browser zone. |
| Toman prices | Use one shared Persian-number Toman formatter for cards, seller offers, budgets, comparison, and explanations. Normalize tagged rial/Toman source amounts once to safe integer rials; preserve a single-rial remainder as one decimal Toman digit. Budget input accepts Persian digits and grouping, submits numeric rials, and uses the same party basis as offers. Filtering, sorting, seller selection, and ranking use numeric rials. |
| Results | Show operating airline and flight number, departure/arrival local times with time-zone context and date changes, total elapsed duration, stops, baggage terms, and total party price. Missing baggage or charge information is explicit. Unpriced or incomplete offers cannot establish a comparable lowest total. |
| Seller comparison | Group offers by the canonical scheduled itinerary identity defined in `ARCHITECTURE.md`. Expose seller, fare/cabin, party total, baggage, refund/change conditions, fixture reference time, and differences affecting comparability. Do not merge flights merely because times or marketing labels look similar. |
| Filtering and sorting | Support carrier, maximum stops, departure-time window, maximum journey duration, total-party budget, baggage requirements, and historical cancellation categories. Apply mandatory requirements before ranking. Provide recommended, total price, journey duration, departure-time, and historical cancellation-rate sorts with deterministic tie-breaking. Unknown history sorts last and never satisfies a known-category filter. Resetting filters restores eligible results. |
| Natural-language preferences | Interpret supported local phrases for budget, non-stop preference, baggage, time window, short duration, and preference for lower historical cancellation rates. Label the interpreter as **simulated demo interpretation**. Return supported parsed fields, unrecognized content, ambiguities, and conflicts; never silently invent constraints or change search fields. Users review and accept the parsed preferences before they apply. |
| Explainable recommendations | Return a deterministic preference score and factual explanation for each ranked itinerary. Explain applicable factors, leading tradeoffs, missing evidence, and ties. Scores reflect suitability under the selected preferences, not factual flight quality or future reliability. Explicit alternative sorts retain the explanations but state the active sorting basis. |
| Cancellation history | Match previous-window operations by operating carrier, normalized operating flight number, origin, and destination, with an explicit departure-pattern discriminator only where needed. Every flight card visibly shows the sufficient historical percentage. An accessible popover/dialog shows cancelled count, total known historical flights, expected operations, unknown/missing counts, coverage, period, source, and last update. In demo mode last update is the synthetic reference instant, not a real refresh. Apply the sampling and sufficiency policy below. |
| History risk labels | Display low/green `کم`, medium/amber `متوسط`, high/red `زیاد`, or unknown/gray `داده ناکافی`/`نامشخص` as **historical cancellation category**. Unknown main rate is null and shown as `—`, never `0%`; available insufficient diagnostics appear only in details. Color is accompanied by text. State that the historical rate is not a calibrated future cancellation probability. |
| Flight details and comparison | Show every leg, connection duration, seller/fare differences, price basis, baggage scope, recommendation factors, and leg-level history. Comparison preserves a common search query and party size, supports removing selections, and explicitly shows unavailable information. A fourth selection requires replacing an existing selection. |

Search, offer identity, filtering, ranking, comparison, error contracts, and the TypeScript domain models are defined in [ARCHITECTURE.md](ARCHITECTURE.md). That document is the canonical technical specification; UI must not implement separate versions of the rules.

## Data truthfulness and fixture requirements

- Every search, result, offer/detail view, comparison, and history presentation carries clear synthetic-demo disclosure. Global disclosure alone is insufficient when a price or history record can be viewed in isolation.
- Prices are synthetic fixture values. A fixture reference timestamp must not be called a live quote, refresh time, or evidence of actual availability.
- Historical records are synthetic operation outcomes. Never describe a synthetic cancellation history as airline evidence or imply the rate forecasts a particular flight's cancellation.
- Deterministic query-based fixtures and the fixed `demoMetadata.asOf` instant `2026-10-15T12:00:00Z` make results reproducible throughout the simulation horizon. The history reference displays as ۲۳ مهر ۱۴۰۵ in the applicable fixture zones. Do not recalculate synthetic history relative to the computer's current date or searched departure date.
- Fixtures include different carriers, departure times, stops, durations, seller prices, baggage conditions, complete and incomplete histories, missing baggage information, unavailable party sizes, and empty-result cases. Every itinerary, offer, and history record references consistent identifiers.
- Synthetic offers use one money representation and a consistent passenger/charge basis. Dataset `flight-ai-demo-v4-domestic-irr` contains authored synthetic Toman fares normalized to rials, not an exchange-rate conversion of former USD fixtures. Unknown mandatory charges make a quoted amount incomplete; disclose it and exclude it from comparable pricing and budget satisfaction.
- Provider interfaces preserve provenance, observation time, currency, fare terms, and missingness. A future adapter must satisfy the same normalized domain and disclosure requirements before entering results.

## Cancellation-history policy

This policy incorporates the user's updated thresholds and minimum sample. The existing verified-roster coverage rule remains an additional evidence gate:

1. Use the previous 30 **completed calendar days at the leg's origin airport**, anchored to the fixed demo reference instant. Exclude the current origin-local calendar day and the searched future operation.
2. Match exact normalized operating carrier, operating flight number, origin, and destination. Codeshare marketing numbers are descriptive only. Preserve meaningful flight-number suffixes when normalizing. When the same identifiers serve multiple scheduled slots that require separate cohorts, an explicit original scheduled origin-local departure minute may distinguish the pattern; match it exactly and never infer it from nearby times.
3. Resolve duplicate observations using the authoritative roster's canonical operation identity: matching service identifiers plus original scheduled departure instant or a stable provider operation ID. Schedule revisions remain the same operation; repeated services on one local day remain separate. Conflicting or unresolved outcomes remain unknown roster rows.
4. A known terminal outcome is either operated or cancelled. The historical cancellation rate is `cancelled / (operated + cancelled)`. Delayed flights that operated count as operated; diverted flights with confirmed operation count as operated. Pending or unresolved statuses are excluded and reported.
5. Coverage is known terminal outcomes divided by the authoritative expected scheduled-operation count within the window. Use the fixture/provider schedule roster; do not assume the flight operated daily. An unavailable or inconsistent expected-operation roster makes coverage unknown.
6. The user's minimum is at least 10 known terminal outcomes. The earlier policy's verified-roster requirement and at least 80% coverage are retained in addition. No expected operations, missing history, or insufficient evidence produces unknown. Headline `cancellationRate` is null in these cases; retain valid available counts and diagnostic fractions only in expanded detail with the insufficiency explanation.
7. The user's new thresholds supersede the earlier thresholds: low is below 10%, medium is 10% to below 25%, and high is 25% or above. Classify the unrounded fraction. These are retrospective heuristic categories, not calibrated predictions.
8. For connections, display each leg's percentage and label separately on the card and in detail. The itinerary summary is the worst leg category only when all legs have sufficient evidence; otherwise it is unknown. There is no overall itinerary cancellation percentage. Never sum rates or construct an independent-leg cancellation probability.
9. History details identify the actual 30-day period, cancelled count, known denominator, coverage evidence, synthetic source, and fixed reference time. Use an accessible popover or dialog with keyboard access; the display never claims current live operational history.

## Quality requirements

- Server-side validation is authoritative; typed failures and missing-data states remain visible to the client.
- Identical requests against the same fixture version produce identical results, scores, and ordering.
- Money arithmetic uses canonical integer rials with explicit `IRR` currency and rial unit. Toman conversion/formatting happens at input/output boundaries; all numeric filters and ranking references use rials. No formatted string is used as a price value.
- Gregorian date-only values and UTC instants remain separate. Jalali conversion uses the existing Temporal polyfill; formatting timestamps uses the appropriate airport/source IANA zone. Month/leap-year and timezone-boundary tests protect against off-by-one-day errors. Presentation changes do not alter the 30 completed origin-local-day history window.
- Keyboard navigation, descriptive labels, accessible status messages, and text alternatives for color are required for the authorized UI. Visual details remain governed by `Design.md`.
- Provider credentials and future model secrets remain server-side. Untrusted preference text is bounded, validated data; it cannot execute code or create arbitrary server requests.
- Core domain behavior is independently testable with fixed clocks and fixtures. Evaluation includes price basis, identity, time-zone boundaries, history sufficiency, conflicts, and deterministic ranking.

## MVP completion criteria

The demo MVP is complete when all nine workflows pass the demo acceptance criteria, with natural-language interpretation explicitly simulated, fixtures validated, every displayed price and history record clearly synthetic, recommendation explanations consistent with actual scoring, and unsupported requests understandable. Every flight card must show its historical percentage or `—` plus Persian category label, with working accessible evidence details and history filters/sorting. Actual model capability remains deferred. The supplied design must be applied and critical flows must work at its required viewports. Authorization does not constitute completed implementation or passed verification.

Passing a demo does not validate production fare accuracy, provider completeness, future cancellation forecasts, or true AI interpretation quality.

## Technical risks and external dependencies

| Risk or dependency | Consequence and initial response |
| --- | --- |
| Design integration | Supplied source fulfills the design gate when reviewed. Preserve its authority and record contradictions in `DESIGN-INTEGRATION.md`; use the explicitly requested semantic status colors as a narrow exception. |
| Provider itinerary identity and codeshares | Different feeds may identify the same service differently. Preserve provider IDs and operating identifiers; use explicit normalized identity and fixture collision tests. |
| Schedule/history completeness | Missing operations can bias observed cancellation rates. Require a scheduled-operation roster, report coverage and unknown statuses, and suppress categories when insufficient. |
| Time zones and schedule changes | Local date boundaries and revised times can corrupt matching or durations. Preserve instants, IANA time zones, original scheduled local date, and observation times. |
| Calendar and monetary-unit boundaries | Implicit time zones or double rial/Toman conversion can misstate dates/prices. Use shared Temporal date-only utilities, explicitly tagged normalization, exact integer money, Persian formatting, and leap/month/zone/unit tests; reject legacy ambiguous API units. |
| Fare and baggage differences | Lowest amounts can conceal incompatible fare terms or incomplete charges. Preserve conditions and completeness; compare total party price on a stated basis. |
| Ranking and unknown evidence | Scores can reward absent data or overstate small differences. Use deterministic documented factors, explicit missingness, and explanations rather than unsupported confidence claims. |
| Limited natural-language interpreter | Unsupported phrases can be mistaken for successful interpretation. Make demo simulation, ignored phrases, conflicts, and user review explicit. |
| Future fare and history suppliers | Availability, commercial access, terms, identifiers, coverage, latency, and costs remain unverified. No supplier is selected or connected in this iteration. |
| Future model provider | Real model choice, pricing, privacy, latency, evaluation, and structured-output reliability remain open. Keep a replaceable server adapter; no paid model integration is required for the demo. |
| Future hosting and monitoring | Deployment target, retention, analytics, and production operations remain unselected. Local MVP does not imply publishing authorization. |

Implementation dependencies are Next.js App Router, React, TypeScript, Tailwind CSS, and minimal compatible development/test tooling. Select and verify compatible versions during authorized scaffolding. Necessary local tooling and server-side API routes are permitted; provider/model API integration remains outside this iteration.

## Remaining decisions for later stages

Implementation is authorized and the supplied design resolves the visual-source gate. The local synthetic scope, simulated interpreter, new 10%/25% history thresholds, minimum 10 known outcomes, and retained coverage gate are documented above. Remaining decisions do not block the authorized local work:

- Expand fixture routes, carriers/sellers, supported dates, and localization only through coherent dataset versions; keep inventory and language as configuration/data.
- Review ranking weights and retrospective-history usefulness during MVP acceptance; preserve history as a typed future AI-ranking input without forecasting claims.
- Choose real fare, history, and AI providers only for a separately approved integration phase.
- Decide broader passenger/trip/currency support and public hosting in later iterations.

## Provider-readiness acceptance criteria — explicit live mode

- Explicit live search invokes server aggregation; no authorized connection means per-provider access statuses, null last-success times and zero offers. Empty results do not assert that the market has no flights. No synthetic fallback exists; omitted mode uses the separate labeled local demo.
- All four target providers are listed accurately. An advertised B2B panel, web service, supplier program or reachable webpage is not described as an enabled integration. Evidence and uncertainty are recorded in [DATA_SOURCES.md](DATA_SOURCES.md).
- Equivalent exact operating services can carry multiple independent seller fares. Numeric total/cabin/party/charge eligibility stays coupled to one offer; unsafe URLs, ambiguous units, synthetic attribution and malformed payloads are rejected.
- Valid partial results survive other provider failures. Fresh, cached, unavailable and failed states are distinct, with actual successful retrieval times only. Retry, timeout, bounded caching, request deduplication and provider-wide rate-limit cooldown behavior are covered by tests.
- All visible dates/prices retain Jalali/Persian Toman presentation. One-way economy/adult and curated-airport limits remain explicit; provider-specific coverage/expiry needs are not guessed.
- Real-source results use only separately verified operational history. None is connected: cards and details show «اطلاعات کافی موجود نیست», no percentage and no invented history update. Explicit demo mode retains its labeled synthetic history and existing calculation tests.
- No provider account/paid agreement, credentials, real vendor payload, endpoint or booking link is fabricated. Credentials for an approved future adapter are server environment values. Provider UI/server integration can be complete while actual connections remain blocked externally.
