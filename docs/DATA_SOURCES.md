# Flight data sources and authorized integration readiness

> **Current local default:** The populated synthetic demo now opens at `/`; the readiness behavior documented below is selected explicitly with `?mode=live`. Alibaba reference mode remains separate. No provider access or permissions have changed. See [DEMO_RESTORATION.md](DEMO_RESTORATION.md).

Public-documentation review: **2026-10-15**. That research was not an executed agreement or provider certification; no accounts, forms, credentials, private endpoint inspection or booking occurred. The later interview iteration inspected the supplied local reference source and JSON only; its undocumented network request was not called. [REFERENCE_REVIEW.md](REFERENCE_REVIEW.md) records that distinct source review.

**Research-only audit:** [DATA_SOURCE_AUDIT.md](DATA_SOURCE_AUDIT.md) records robots, public terms, field visibility and rendering limits. The [Flytoday terms](https://www.flytoday.ir/privacypolicy) explicitly restrict automated extraction; [Safarmarket terms](https://safarmarket.com/page/terms) prohibit search-result extraction/republication without written permission. That audit changed documentation only. Its evidence and limitations remain intact; the later local fixture implementation below does not change authorization findings or activate live access.

## Integration status

**Connected live providers: none.** Explicit `?mode=live` uses the authorized-provider registry and returns no offers while access is unavailable. Explicit `?mode=fixture` exercises only an inspected Alibaba offline parser with sanitized supplied responses; Flytoday, Safarmarket and Snapptrip remain unavailable. The restored authored synthetic experience is the default and is also selected with `?mode=demo`. Neither offline mode is fallback inventory for a real-source search. See [INTERVIEW_DEMO.md](INTERVIEW_DEMO.md).

| Target | Confirmed official evidence | Integration status in Flight AI | Required next evidence/access |
| --- | --- | --- | --- |
| Alibaba.ir | Official homepage could not be retrieved by the research tool (timeout); official-domain searches did not establish a usable API/affiliate feed. This is an investigation limitation, not proof that no private API exists. | `unverified`, disconnected | Provider confirmation of an authorized search/comparison distribution arrangement, technical documentation, and issued access if offered. |
| Flytoday.ir | Official corporate page describes a contracted organization purchasing panel. It does not establish a third-party flight inventory API or redistribution permission. | `unverified`, disconnected | Confirm whether a flight comparison API/affiliate feed is offered to an independent product; obtain its contract, specification and access. |
| Safarmarket.com | Official supplier onboarding describes applications, document review and a cooperation contract. Supplying listings to Safarmarket does not establish an outbound inventory API for Flight AI. | `awaiting-agreement`, disconnected; outbound access unverified | Explicit permission/specification for retrieving and displaying seller inventory, not merely a supplier account. |
| Snapptrip.com | Official B2B page explicitly advertises web services and an application route for agencies/businesses. Public technical endpoints, authentication and payload contracts were not established. | `awaiting-agreement`, disconnected | B2B approval and agreement covering comparison/display, flight-service documentation, sandbox and production credentials. |

No reviewed source established a publicly documented, unrestricted search API, a usable affiliate fare feed, a published quota/price schedule, a booking-deeplink contract, or an operational-history feed available to Flight AI. Requirements and capabilities remain unknown unless specifically confirmed below. “Awaiting agreement” describes an implementation gate; no application is pending with these companies.

The local Alibaba fixture is not a new item of official-provider evidence. Supplied source includes a token codec/request generator and stored JSON, but no official protocol, grant or validated monetary unit. Its other-provider adapters fabricate price changes and are not reused. The live-status table above is unchanged by source inspection.

## Primary evidence and boundaries

### Alibaba.ir

- Attempted [official homepage](https://www.alibaba.ir/) and the non-www host; retrieval was unavailable/timed out in this research environment. Official-domain API/partnership searches did not produce usable integration documentation.
- No endpoints, authentication scheme, accepted price unit, rate limits, or partner eligibility were verified. Contact through the provider's official channels is the next discovery step, not an implemented integration.
- Alibaba.com ecommerce developer documentation is a different organization/domain and is not evidence for the Iranian travel provider.

### Flytoday.ir

- [Official homepage](https://www.flytoday.ir/) confirms a consumer flight search product and links to [organization solutions](https://www.flytoday.ir/organization).
- The organization page documents an application/document-review/contract process for a corporate panel, with user and spending management. That panel alone does not authorize inventory extraction or resale/comparison.
- No usable public API schema, authentication instructions, quotas, feed terms or historical operations dataset were established. Do not infer a payload's currency unit from retail page labels.
- A similarly named .com service and unofficial libraries/MCP wrappers are not accepted as authorization for flytoday.ir. No website gateway was reverse engineered or called.

### Safarmarket.com

- [Official supplier page](https://safarmarket.com/supplier) documents registration and document review, a cooperation contract and bank guarantee. Listed materials include agency/online-sales licenses and business identity documents.
- This describes becoming a seller on its marketplace. Whether Flight AI can consume its comparison inventory, cache it, retain seller IDs or send affiliate traffic is unconfirmed and needs a separate written answer.
- The page's content-use notice allows noncommercial use with attribution; it does not grant a commercial fare-aggregation API license. No operational-history feed or API authentication/quotas were verified.

### Snapptrip.com

- The [official homepage](https://www.snapptrip.com/) links its agency/company offering to [official B2B solutions](https://b2b.snapptrip.com/landings/b2b).
- The B2B page explicitly offers web services alongside corporate/agency solutions and describes domestic/international flight services. Onboarding includes a request, mobile OTP verification, expert review and follow-up.
- This confirms a partnership lead, not that Flight AI is accepted or has flight API access. Specific product coverage for the web service, technical endpoints, authentication, quotas, caching rights, prices and deeplinks still require provider documentation/agreement. No OTP or authentication flow was automated.

## What must be obtained before connecting any provider

1. Written permission for the exact use: independent cross-provider comparison, consumer display, seller attribution, cache/retention, ranking and booking referrals. Confirm affiliate/commission rights separately if needed.
2. Official versioned flight-search contract and sample payloads: exact airports vs city codes, operating vs marketing carrier IDs, timezone/schedule semantics, party/cabin basis, mandatory taxes/fees, baggage, fare rules, availability and quote expiry.
3. Explicit monetary currency/unit for every numeric price field. The app stores safe integer IRR/rials; an explicitly tagged Toman field is multiplied by ten once. No guessed FX conversion.
4. Documented authentication and provider-issued sandbox/production credentials, approved server base URLs and any IP allowlisting. Authentication format and environment variable names are intentionally not invented here.
5. Limits, permitted concurrency, retry/Retry-After behavior, expected latency, cache TTL and revalidation requirements. The implementation defaults are local conservative limits, not vendor guarantees.
6. Approved HTTPS booking destinations, attribution text/logo license if requested, deeplink lifetime and final-price/availability recheck rules. A missing deeplink remains null.
7. A separate operations-history agreement/data contract if offered. Fare inventory, ticket refunds and a customer cancellation policy are not verified flight cancellation observations.

Provider secrets belong in server environment variables/secret management, read only by an adapter under `src/server/providers`; never in `NEXT_PUBLIC_*`, URLs sent to the browser, source control or raw error messages. No active provider credential variables are defined until the relevant official authentication contract is known. See [.env.example](../.env.example).

## Implemented readiness and runtime behavior

- `src/domain/provider.ts` defines **FlightOffer**, **UnpricedFlightOffer**, provider descriptors and public statuses. These are our normalized boundaries, not a fictitious vendor API. Offers preserve provider/seller identity or explicit missingness, legs/airports/UTC schedule, stops, cabin, party, baggage, fare conditions, availability, optional booking URL, timestamp semantics and source. Verified canonical money uses IRR/integer rials. `sourceState` explicitly distinguishes `LIVE`, `FIXTURE` and `UNAVAILABLE`; cache delivery is separately `hit`, `miss` or `none` with visible cached copy.
- `normalizeFlightOffer` validates untrusted adapter output. Live records reject synthetic/misattributed sources, mismatched party/route/date, unknown airport mappings, unsafe URLs and ambiguous monetary units. Explicit matched fixture provenance permits a separate unpriced branch instead of inventing a price: `totalPrice: null`, `priceComplete: false`, raw `priceAdult`/`unit: "unverified"`, and `capturedAt: null`. Missing baggage/terms stay unknown. Curated airport metadata includes THR/SYZ and the restored domestic KIH/IFN/TBZ/AWZ references alongside IKA/MHD/IST/DXB/LHR; reference clocks use an explicit offline `Asia/Tehran` interpretation, not a verified live-provider schedule contract.
- Grouping uses exact ordered operating identities, airports and scheduled UTC instants. Each provider/seller/offer key is unique; latest revisions replace older ones. Contradictory equal-version quotes are suppressed. Seller/fare differences remain separate; baggage references are remapped to canonical legs.
- The server-only live registry contains four named disconnected adapter factories and **no enabled network transport or scraping code**. A connected adapter must carry a reviewed authorization reference and implement its documented mapping; a status flag, copied browser token or credential alone cannot establish legal or technical access. A separate explicit fixture registry runs only the Alibaba local parser, with the other three providers unavailable.
- Aggregation isolates provider failures and applies a **six-second total deadline per provider**, including attempts and backoff, with AbortSignal and a race for noncooperative adapters. Only explicit transient errors retry: at most two retries after 250ms and 500ms backoff within that same budget. Auth/forbidden/invalid-data errors do not retry. Rate limits stop calls with a provider-wide cooldown respecting Retry-After (minimum sixty seconds); no alternate credentials/proxy rotation.
- Successes, including genuine empty responses, cache for **sixty seconds** with a **200-entry bound per process**. The key includes execution mode, provider, fixture version/reference or authorization reference, exact route, Gregorian date, party and currency. Concurrent identical requests share work; outputs are cloned. Expired cache is not served after failure. Cached responses retain original source/retrieval or explicitly named import timestamps and are visibly **cached**, never newly live. A fixture cache hit stays `FIXTURE`; `LIVE` origin plus cached delivery is not a newly fetched quote. Fresh live output older than sixty seconds is rejected at the normalized boundary.
- `POST /api/search` defaults to the authored synthetic demo without provider requests. `mode: "live"` explicitly selects authorized sources; `mode: "fixture"` selects Alibaba offline reference data. Browser/SSR use the same service; HTTP responses are `no-store`, with provider cache semantics represented in data. Partial valid results remain when peers fail. Request time is never a successful provider update; fixture `asOf`/compatibility `fetchedAt` means the manifest's fixed local import time, not capture or refresh. Per-provider last-success timestamps apply to successful live retrievals for that exact search key; fixture and absent access do not invent one.
- Explicit live search accepts dates from today through 365 days ahead using Tehran date-only boundaries. The default synthetic demo instead has a continuous 2026-10-15–2036-12-31 simulation horizon; imported reference dates remain fixed. These are application limits, not claims about a provider's inventory window. Jalali display and numeric rial/Toman filtering/ranking are unchanged.
- Every fare/detail/comparison displays its source and live/cached/offline status with truthful timestamp semantics. Reference records say **«واحد مبلغ تأیید نشده»**; optional raw Persian numbers have no currency suffix, price-derived ranking is inactive, and budget/known-baggage constraints cannot pass unknown price/allowance evidence. Fixture price/history sorts are disabled and equivalent API requests return `422 UNSUPPORTED_FIXTURE_SORT`; «برنامه سفر مرجع» uses schedule/departure/duration ordering and details comparison. Booking links render only when present and approved; the reference supplies none. Empty live-mode results do not assert absence of market flights.

## Inspected Alibaba offline reference

The supplied [reference archive](../reference/torob-belit.zip) was extracted and its actual rules, JavaScript, frontend, tests and JSON inspected. The reusable pure TypeScript record mapping is `src/server/providers/alibaba-parser.ts`, with `alibaba-fixture.ts` applying the explicitly reviewed offline interpretation. Stored derived files are allowlisted/sanitized under `src/fixtures/alibaba/`; the manifest records original/derivative SHA-256 hashes, source paths, fixed **local** `importedAt: 2026-10-15T08:27:36Z`, `capturedAt: null` and `priceUnit: "unverified"`. The supplied files' authenticity and original recording times remain unverified.

Only THR–MHD/THR–SYZ on **۲۳ مهر ۱۴۰۵** (`2026-10-15`) is supported. Unsupported route/date combinations return `422 UNSUPPORTED_FIXTURE_QUERY`; no fallback route or redating is allowed. Parsed unpriced records remain separate as `unpricedFlights` and support schedule/detail comparisons without inventing authoritative Toman totals. Original opaque proposal/quote identifiers and irrelevant transport material are not exposed by the sanitized port. The reference's random token fields/.NET-tick builder and browser-like headers are not called or activated; a Base32 local round trip proves only codec behavior.

The reference's `AGENTS.md` explicitly questions whether `priceAdult` is rials, despite its code dividing by ten and a test asserting that division. Neither JSON declares a currency/unit. Therefore no rial/Toman conversion is applied to these raw amounts. [REFERENCE_REVIEW.md](REFERENCE_REVIEW.md) explains this necessary exception to the ordinary priced-offer boundary and the rejected mock/fallback/identity/refund/time assumptions. No supplied reference behavior overrides Flight AI's Design.md or current project rules.

## Separate cancellation-history source

No trustworthy operational history was obtained for these integrations. Real-source and Alibaba reference flights therefore always have unknown history and **اطلاعات کافی موجود نیست**, no historical percentage, no favorable zero and no fabricated update timestamp. The inventory boundary deliberately discards supplied history, including synthetic fixture history. The existing calculator and its 30 completed origin-local days, exact service matching, 10-known minimum and 80% verified-roster coverage gate remain intact for a future separately authorized operations adapter. Current ticket `X`/`C` statuses, seats and refund rules are not a historical operations roster. Synthetic operations remain solely in the clearly labeled demo mode, now the local default.

## Remaining limitations and next steps

The integration framework and local offline parser are implemented; live connections and real-provider contract tests remain blocked on permission, specifications and credentials. Framework tests use synthetic test transports; offline parser tests additionally use the inspected supplied/sanitized JSON without claiming verified capture provenance. This verifies local behavior, not supplier compatibility, price-unit correctness or live inventory.

Start discovery with Snapptrip's documented B2B web-service route; ask all four providers whether independent comparison/redistribution is permitted. No messages have been sent on the user's behalf. Once an agreement and technical contract are available, implement that single adapter, add sanitized contract fixtures/tests, tune limits/TTL/expiry to its terms, perform sandbox validation, then enable it server-side. Do not add a generic configurable endpoint or turn on a provider by supplying a token alone.

The cache, in-flight map and rate-limit cooldown are process-local readiness mechanisms. Before multiple production instances, coordinate quotas/cooldowns/cache in shared infrastructure; apply inbound abuse controls and contract-specific monitoring. Current deployment remains local. Future quote-expiry/revalidation and richer bag-piece/codeshare contracts must be implemented when the first provider specification is known rather than guessed now.

## Current restoration verification

The restored default demo passed lint, typecheck, **364 unit tests across 13 files**, production Webpack build and **all 22 browser tests** in 21.1 seconds. [DEMO_RESTORATION.md](DEMO_RESTORATION.md) records the current behavior; these checks do not establish a live connection.

## Historical reference-integration verification

The earlier reference-integration iteration passed `npm run lint`, `npm run typecheck`, **323 unit tests across 11 files**, production `npm run build` with Webpack, and **all 19 Playwright tests** in 17.8 seconds. That browser run included the previous 15 regressions plus four reference-fixture checks, covering offline attribution/unpriced behavior, exact queries, schedule comparisons, sort restrictions and mobile layout alongside existing Jalali/Toman/history behavior. These are historical counts, not the current restoration certification.

The supplied reference's **four original Node tests passed separately**. Their codec round trip, assumed divide-by-ten assertion, fake failure and second-route parser case do not establish monetary units, capture authenticity, server acceptance, provider authorization or a working live adapter. These are local implementation results, not vendor contract tests; the historical counts below are from a different iteration.

## Historical provider-readiness iteration verification

- `npm run lint`, `npm run typecheck`, and the production build passed.
- **218 unit tests** passed, including all existing calendar, money, search and cancellation-history cases. New cases exercise normalized output validation, explicit currency boundaries, exact grouping/seller deduplication, source/URL rejection, numeric filtering/sorting, in-flight dedup, cache retention/expiry/eviction, partial errors, timeouts/abort, exponential transient retries and rate-limit cooldowns. Presentation checks cover cached attribution and unknown real-source history; an accidental implicit live-to-demo call throws.
- **15 production browser checks** passed on isolated localhost port 3100, including default disconnected providers, absence of fabricated inventory/update timestamps, explicit demo isolation, mobile RTL overflow, Jalali picking, Toman budgets, comparison and cancellation regressions. Desktop/mobile screenshots were inspected against the existing design.
- These are local framework/regression results, **not** a real-provider connectivity, commercial-access or live-fare accuracy certification. No provider-specific contract tests can be run until an official specification and authorized environment exist.
