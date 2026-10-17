# Public flight-data access audit

**Inspected:** 2026-10-15; research reference 07:58 UTC. **Scope:** bounded public-page/documentation research for Flight AI. No production scraper, provider connection, search-result collection, account, booking or commercial agreement was created.

## 1. Decision and method

**No provider is currently confirmed for automated commercial flight-data collection and reuse by Flight AI.** Public shopper access is not an integration license. Flytoday and Safarmarket have express extraction restrictions; Snapptrip needs a separate agreement for the proposed use; Alibaba remains unclear because inspection was unsuccessful. Snapptrip's advertised B2B web services are the strongest next partnership lead, not an enabled API.

This audit follows [AGENTS.md](../AGENTS.md), [Design.md](../Design.md), [PRD.md](PRD.md), the [current architecture](ARCHITECTURE.md#authorized-provider-runtime--implemented-2026-10-15) and existing normalized [FlightOffer](../src/domain/provider.ts)/[adapter contracts](../src/server/providers/contracts.ts). It supplements [DATA_SOURCES.md](DATA_SOURCES.md) with robots, terms and public-page evidence. Runtime readiness categories are engineering states, not these permission classifications; existing adapters remain disconnected.

Methods and limits:

- Read official public homepages, robots URLs, linked flight landings, legal pages and partnership descriptions with the browsing tool; perform limited official-domain discovery. No date/route searches were submitted. No booking, refund, checkout, account or robots-disallowed query URLs were followed.
- Stop further offer/data inspection when a site's extraction restriction is identified. No internal network endpoint discovery/replay, authentication, OTP, CAPTCHA, proxy/identity rotation, control bypass, load testing or recurring crawler was used.
- The tool supplies **extracted page text**, sometimes from crawled/cached pages, not original HTML, a JavaScript execution trace or an origin HTTP-header capture. Its retrieval date is not a fare update timestamp. No individual dated flight quotes, prices or production dataset are retained in this audit.
- A tool timeout or “not accessible” result does not establish an origin HTTP status, an absent robots file, an allow-all policy, a CAPTCHA or a particular anti-bot vendor. Missing evidence stays unknown.
- Permission labels apply to the **proposed automated collection and commercial display**, based on inspected publisher rules: **confirmed** means an applicable express grant; **prohibited** means an express public restriction; **unclear** means insufficient evidence; **requires agreement** means the proposed rights need a distinct grant not currently held. They are not a jurisdiction-wide legal ruling.

Robots is a separate crawler policy: [RFC 9309 §1](https://www.rfc-editor.org/rfc/rfc9309.html#section-1) explains that it is not access authorization. An unlisted path or an allowed crawler path grants neither a public API contract nor commercial reuse rights.

| Provider | Public automated collection/commercial reuse | Future authorized route | Current decision |
| --- | --- | --- | --- |
| Alibaba.ir | **Unclear**: robots, applicable terms and result access unverified | Requires provider confirmation and written scope; no usable API specification established | Remain disconnected |
| Flytoday.ir | **Prohibited** by inspected automated-extraction terms; attributed visibility does not override them | A separate agreement would be needed; corporate purchasing panel alone does not establish external API rights | No public scraper |
| Safarmarket.com | **Prohibited without written permission**, explicitly including search-result extraction and publication | Separate outbound-data/comparison permission; supplier onboarding is not that grant | No public scraper |
| Snapptrip.com | **Requires agreement**: public reuse notices do not grant this commercial product use; robots restrict query URLs | Official B2B web-service inquiry, then approved contract/specification/access | Partnership discovery first |

No status is **confirmed** for Flight AI's intended collection/reuse. No outreach was sent on the user's behalf.

## 2. Provider findings

### Alibaba.ir

**Official target:** [www.alibaba.ir](https://www.alibaba.ir/). Do not substitute Alibaba.com ecommerce APIs.

**Inspection/evidence:** The homepage and [www robots.txt](https://www.alibaba.ir/robots.txt) returned a tool-level timeout. [Non-www robots.txt](https://alibaba.ir/robots.txt) was inaccessible through the tool. Official-domain discovery did not verify a relevant flight landing, terms page or API/partnership specification. No unobserved flight-path or search-query template is invented here.

**Robots/terms:** Unknown; no rules or commercial-use provisions could be assessed. This is an access/evidence limitation, not a finding of provider prohibition or permission. No repeated probing followed the failure.

**Technical/fields:** No accessible offer was observed. SSR versus client-fetched results, field completeness, quote timestamps, currency basis, booking links, anti-bot mechanisms, limits and reliability remain unverified.

**Strategy:** Keep disconnected. Ask the official provider whether independent flight comparison is supported, and obtain documented automated-use/display/cache/referral rights and a technical contract before evaluating an adapter. Reinspect robots/legal pages when ordinarily accessible. A private integration may exist; this audit neither confirms nor rules it out.

### Flytoday.ir

**Public routes:** [official homepage](https://www.flytoday.ir/) and its linked [flight landing](https://www.flytoday.ir/flight) expose flight search controls and product explanations. [Organization solutions](https://www.flytoday.ir/organization) describes contracted corporate purchasing, not confirmed external API distribution.

**Robots:** [robots.txt](https://www.flytoday.ir/robots.txt) was inaccessible through the research tool. Flight/query rules remain unknown.

**Terms:** The footer-linked [terms page](https://www.flytoday.ir/privacypolicy), section «استفاده متعارف از خدمات و محدودیت‌ها», expressly prohibits bots/data extraction, repeated or broad nonpurchase searches, control circumvention and artificial load, and provides for access/IP restrictions. It also warns that supplier prices can change between search and payment. General attribution/noncommercial reuse wording is not an exception to those restrictions.

**Technical/fields:** Search controls are visible; filtering descriptions are not observed offer records. Actual result delivery, complete fields and freshness guarantees remain unverified. Further offer/network inspection stopped upon finding the prohibition.

**Strategy:** No public scraping. Ask whether a separately authorized comparison API/feed exists; obtain express automated-use and commercial-display terms, then official specifications and sandbox access. A similarly named .com service or an unofficial MCP/website-gateway wrapper does not prove permission for flytoday.ir.

### Safarmarket.com

**Public routes:** [official homepage](https://safarmarket.com/) links the [flight landing](https://safarmarket.com/flights), [terms](https://safarmarket.com/page/terms) and [supplier program](https://safarmarket.com/supplier).

**Robots:** [robots.txt](https://safarmarket.com/robots.txt) was inaccessible through the tool; no flight/query permission can be inferred.

**Terms:** The flight-data provision in [the terms](https://safarmarket.com/page/terms) expressly forbids extracting/using search results and republishing them without written permission, including manual extraction, robots and crawlers. It identifies flight-related information among the protected data. The specific restriction takes precedence for this assessment over generic attributed-quotation/noncommercial footer wording. No further offer inspection followed this finding.

**Technical/fields:** The landing describes comparison across sellers and referral to the selected seller; that is not an approved outbound feed or a verified quote/deeplink schema. Result rendering, exact field completeness and quote validity were not tested.

**Strategy:** Obtain written permission specifically for outbound comparison-data access. [Supplier onboarding](https://safarmarket.com/supplier) concerns supplying listings to the marketplace and documents application/review/contract steps; it does not grant Flight AI inventory-consumption rights. Use a negotiated feed/API only after that distinction is resolved.

### Snapptrip.com

**Public routes:** The [official homepage](https://www.snapptrip.com/) links [domestic flights](https://www.snapptrip.com/flights), [international flights](https://www.snapptrip.com/inter-flights), [policy](https://www.snapptrip.com/policy) and [official B2B solutions](https://b2b.snapptrip.com/landings/b2b). The last is a separately hosted partnership lead, not a verified search API origin.

**Robots:** [www robots.txt](https://www.snapptrip.com/robots.txt) was readable. Selected exact directives:

```text
User-agent: *
Disallow: *?
Allow: *?utm
Allow: *?ver=
Disallow: /flights/booking/
Disallow: /inter-flights/booking/
```

The file also excludes flight auto-reserve/cancellation/refund/invoice paths, international tracking/cancellation and malformed/nested flight URLs. It does not blanket-disallow both flight landing roots. Its query exclusion and narrow tracking/version exceptions must not be treated as permission to collect results or an invitation to modify URLs around restrictions. Rules on www do not automatically govern a different hostname such as B2B. No numerical crawl-delay/quota was stated in the inspected file; that is not unlimited-access permission.

**Terms:** [Policy content-use provisions](https://www.snapptrip.com/policy) reserve content and discuss attribution; the footer limits reuse to noncommercial attributed purposes. This does not grant commercial fare aggregation. No explicit scraper-specific exception was established.

**Technical/fields:** Public landings expose route/promotional content and workflow descriptions. Starting-price cards are not dated available quotes. Actual result rendering and full per-offer fields remain unverified; query/booking inspection was not performed.

**Strategy:** [B2B solutions](https://b2b.snapptrip.com/landings/b2b) explicitly advertises web services and a reviewed partnership request. Confirm flight coverage and independent comparison rights, then obtain official schema/authentication/quotas/booking-link rules and sandbox access. Do not activate the adapter from the marketing page alone.

## 3. Robots and terms assessment

| Target inspected | Result | Applicable conclusion |
| --- | --- | --- |
| `https://www.alibaba.ir/robots.txt` | Tool timeout | Rules unknown; not confirmed HTTP 400/404/403 |
| `https://alibaba.ir/robots.txt` | Tool inaccessible | Non-www rules/redirect behavior unverified |
| `https://www.flytoday.ir/robots.txt` | Tool inaccessible | Flight/query rules unknown; express terms restriction still applies |
| `https://safarmarket.com/robots.txt` | Tool inaccessible | Rules unknown; written-permission requirement still applies |
| `https://www.snapptrip.com/robots.txt` | Extracted plain text available | Query/transaction path exclusions as summarized above; no commercial license |

The three unsuccessful robots inspections were not converted into technical workarounds. No unauthenticated website gateway, path absent from robots, browser cookie, normal user session or third-party wrapper is accepted as documented API authorization. Terms may change; future approved integration must recheck the exact host, intended paths and agreement scope before access.

## 4. Fields and rendering feasibility

This table distinguishes **documented product descriptions** from **observed usable flight records**:

- **U** — not verified for an individual dated offer.
- **D** — described in public workflow/filter/legal text; not observed as an offer field or guaranteed API field.
- **P** — visible only as promotional route/starting-price content; unsuitable as inventory.

| Required field | Alibaba | Flytoday | Safarmarket | Snapptrip |
| --- | --- | --- | --- | --- |
| Airline name (operating identity unverified) | U | D | D | D |
| Flight number | U | U | D (terms identify this data) | D (international-flight description) |
| Exact origin/destination airports and codes | U | U | U | U |
| Departure timestamp/time zone | U | D for movement-time filtering; complete timestamp U | D for flight time; complete timestamp U | D for departure filtering; complete timestamp U |
| Arrival timestamp/time zone | U | U | U | U |
| Stops | U | D | D | D |
| Baggage allowance | U | D | D (check seller conditions) | D (fare-class descriptions); numeric allowance U |
| Seller identity per offer | U | U | D (multi-seller workflow) | U |
| Complete numeric party price/unit/charges | U | D for price controls; complete total U | D for comparison; complete total U | P for starting prices; complete total U |
| Actual seat/party availability | U | U | U | D for availability notification; actual availability U |
| Approved persistent booking URL | U | U | D for seller referral workflow; actual URL U | U |
| Quote fetchedAt/provider-updatedAt/expiry | U | U | U | U |

Field-description evidence: [Flytoday flight landing](https://www.flytoday.ir/flight), [Safarmarket flight landing](https://safarmarket.com/flights) and its [data provision](https://safarmarket.com/page/terms), [Snapptrip domestic](https://www.snapptrip.com/flights) and [international](https://www.snapptrip.com/inter-flights) landings. A brand name is not a verified operating-carrier code or per-offer seller; city selectors/routes are not necessarily exact airport codes. No observed promotional number is copied into Flight AI or this audit.

**SSR versus dynamically fetched results:** **Undetermined for all four providers' actual search results.** The extracted public landings contain marketing/forms; they do not prove original-response SSR, client rendering, hydration or XHR/GraphQL transport. No JavaScript-disabled comparison, raw-result HTML capture or permitted search/network trace was obtained. Alibaba was inaccessible; extraction restrictions stopped Flytoday/Safarmarket result inspection; Snapptrip query/transaction restrictions and missing commercial grant limited inspection to linked public landings. Do not infer a public API from likely dynamic behavior or an observable network call. This evidence gap is explicit, rather than labeling every site “SPA” by assumption.

Consequently, reliable per-offer normalization cannot yet be validated for any target. The existing adapter's exact airport/operating identity, UTC schedule, charge-completeness and explicit monetary-unit requirements cannot be satisfied from these landings alone.

## 5. Freshness, reliability and maintenance risks

These are engineering assessments from the evidence limits above, not measured provider SLAs or verified descriptions of an anti-bot vendor.

| Risk | Evidence/impact | Response before integration |
| --- | --- | --- |
| Terms restrict the proposed use | Flytoday/Safarmarket express restrictions; other rights unconfirmed | Written exception/agreement covering the exact automated and commercial purposes; do not start a public scraper |
| Robots scope and query restrictions | Only Snapptrip rules could be read | Recheck approved hosts/paths; no rewriting queries, rotating identities or treating unreadable robots as consent |
| Unknown rendering/transport | No actual dated result transport inspected | Obtain official schema and authorized sandbox; do not build against assumed private endpoints or DOM selectors |
| Stale/indicative fares | No quote timestamp, expiry or reservation observed; public starting prices are promotional | Contractual freshness/expiry rules, retrieval and provider-update timestamps, explicit cached labels and final revalidation |
| Incomparable prices | Party/cabin/fees/currency fields unverified | Normalize documented rial/Toman units once, preserve complete-party basis and reject unsupported currency rather than guess FX |
| Identity/baggage gaps | Airline names/cities and explanatory text do not establish operating IDs, airports or allowances | Documented mappings and nullable fields; exact service grouping with separate seller/fare terms |
| Access enforcement | Flytoday terms allow IP/access restrictions; other controls not tested | Respect 401/403/429/Retry-After and stop on challenges; no CAPTCHA solving, cookie harvesting or proxy rotation |
| Public markup/deeplink churn | No supported extraction/booking contract or lifetime established | Prefer versioned authorized API/feed; contract tests, monitored changes and approved deeplink domains/lifetimes |
| Scaling/coverage | No quotas, coverage, latency or success-rate measurements | Negotiate limits; tune existing bounded cache/retries; coordinate across instances before deployment |
| History misrepresentation | No licensed verified operational roster/outcomes established | Keep inventory separate; missing real history remains «اطلاعات کافی موجود نیست», never synthetic risk presented as real |

No claim is made that these providers lack anti-bot protection, that challenges were successfully tested, or that a particular request rate is safe. No reliability percentage, live price, available seat or historical cancellation figure is inferred.

## 6. Proposed typed authorized-integration interface

**Documentation-only proposal; not implemented by this audit.** Reuse existing `ProviderId`, `ProviderDescriptor`, `FlightSearchInput`, `FlightOffer` and `Instant` from the current domain. The current executable adapter deliberately returns `unknown[]` for runtime validation. After official contracts are obtained, a stronger server-side port could separate a reviewed authorization manifest, validated offers and transport/freshness metadata:

```ts
import type { FlightSearchInput, Instant } from "../src/domain/models";
import type { FlightOffer, ProviderDescriptor } from "../src/domain/provider";

type PermissionStatus = "confirmed" | "prohibited" | "unclear" | "requires-agreement";
type AuthorizedPurpose =
  | "flight-search" | "comparison-display" | "cache" | "booking-referral";

interface ProviderAccessReview {
  status: PermissionStatus;
  evidenceUrls: readonly string[];
  reviewedAt: Instant;
  agreementReference: string | null; // server-only record reference, never a secret
  validUntil: Instant | null;
  approvedOrigins: readonly string[]; // from official documentation, not user input
  allowedPurposes: readonly AuthorizedPurpose[];
}

interface AuthorizedOfferSnapshot {
  offer: FlightOffer; // existing canonical integer IRR/rial money and UTC schedules
  providerUpdatedAt: Instant | null; // source-supplied, never guessed from fetchedAt
  expiresAt: Instant | null;
}

type ProviderSearchOutcome =
  | {
      ok: true;
      offers: readonly AuthorizedOfferSnapshot[];
      fetchedAt: Instant; // actual successful retrieval, including genuine empty results
      delivery: "fresh" | "provider-cache" | "unknown";
      providerRequestId: string | null; // sanitized opaque reference, not a token
    }
  | {
      ok: false;
      code: "not-authorized" | "auth" | "forbidden" | "rate-limited"
        | "timeout" | "unavailable" | "invalid-data";
      retryAfterMs: number | null;
    };

interface AuthorizedFlightProvider {
  readonly provider: ProviderDescriptor;
  readonly access: ProviderAccessReview;
  search(
    query: FlightSearchInput, // Gregorian ISO date-only, exact airports and party
    context: { signal: AbortSignal; requestedAt: Instant },
  ): Promise<ProviderSearchOutcome>;
}
```

Activation rules for a future implementation:

1. A reviewed agreement/official grant must authorize the actual purpose and transport. A Boolean, URL, credential or self-entered manifest does not create permission. Review dates and scope changes need a stop/review policy.
2. Provider-specific code receives credentials from server environment/secret storage. Clients cannot choose origins or supply website cookies. Do not add guessed endpoints, auth schemes or environment variable names before documentation exists.
3. Validate official JSON at the transport boundary, explicitly normalize source units, then pass offers through the shared runtime validator. Preserve supported unknown baggage, availability and fare fields. Reject offers lacking verified operating identity, airport mappings or timestamps rather than guessing them. Incomplete totals cannot establish comparable cheapest prices.
4. If source delivery/freshness is unknown, do not label it live. The aggregator's own cache is also a separate layer; retain timestamps, quote expiry and source attribution through both layers. Current internal TTL/retry defaults are not provider permissions or guarantees.
5. Stop on auth/access/challenge failures, respect rate limits and approved retry semantics, and retain partial valid peer results. Do not use synthetic fallback offers.
6. Use the existing deterministic grouping/ranking and Jalali/Toman presentation. Real cancellation history requires a distinct licensed operations adapter; this inventory port cannot supply a fabricated history score.

This proposal adds no network implementation, dependencies, credentials, UI styles or changed runtime behavior. Provider-specific DTOs and evidence/expiry fields need agreement-specific contract tests before changing the executable interface.

## 7. Unanswered questions

| Provider | Provider-specific questions requiring an official answer |
| --- | --- |
| Alibaba | Which official external flight-search/comparison integration, if any, is offered? What are the ordinary accessible terms/robots and supported public flight pages? Which hosts and products are approved for Flight AI? |
| Flytoday | Is there a B2B feed/API with a written exception to the public extraction restrictions? Does it authorize independent comparison and commercial display, beyond employee purchasing? |
| Safarmarket | Will it license outbound marketplace results, distinct from supplier onboarding? Does written permission cover extraction plus republication, preserving each seller's quote and referral rights? |
| Snapptrip | Do the advertised web services include domestic/international flight search for independent comparison? Which B2B hosts/paths and commercial-display terms are approved, including any exception to public-site restrictions? |

Shared technical/commercial questions:

1. Who can license the data and seller/airline fields, and what display/attribution/affiliate/retention/redistribution purposes are allowed? Does the agreement override or supplement the public terms for named transports?
2. What versioned specification, sanitized samples, sandbox credentials, authentication flow, scopes and IP requirements are issued? What does the API call itself do—search only, hold inventory, or create a reservation?
3. What are documented coverage, limits, concurrency, Retry-After behavior, cache rights, quote expiry, final-price revalidation and outage/error semantics? How are changed terms/API versions communicated?
4. Which identifiers are operating versus marketing carriers/numbers; which locations are city versus airport codes; what are schedule time zones and revision semantics? Which required fields are missing or conditional?
5. Is each price rial or Toman, per person or complete party, and are taxes/fees mandatory and included? Are fares, baggage and conditions versioned and tied to one quote? What happens for non-IRR quotes?
6. Are booking URLs supplied for approved referral use, on which hosts, with what token/deeplink lifetime and attribution obligations? What information must stay server-side?
7. Does an independently licensed operations-history product exist with verified expected rosters and terminal outcomes for the preceding 30 completed origin-local days? A refund policy or ticket inventory is not that evidence.
8. After permission, can an authorized sandbox trace verify actual delivery, field completeness, latency and freshness without production crawling? Which testing volume is explicitly permitted?

## 8. Safest viable next step and verification

Prepare a narrowly scoped partnership request for **Snapptrip's documented B2B web-service channel**, seeking read-only flight search, independent comparison/display and caching/referral rights plus official specifications and sandbox access. Do not submit it without human authorization. Keep the other providers disconnected while requesting their applicable access arrangements; public scraping is not a viable approved fallback.

After access is granted, implement **one documented server adapter** against the existing normalization/aggregation architecture, with sanitized official contract fixtures, explicit money/identity/expiry mappings and agreed quotas. Verify in the approved sandbox before activation. Keep real historical cancellation data unknown until its independent evidence requirements are met.

This iteration changes documentation only. Local-link and Markdown-fence checks passed; before/after hashes confirmed 46 application, test, design, rules and dependency files were unchanged, with no new application/test files. Independent reviews checked the Alibaba/Flytoday evidence and alignment with the existing contracts. Runtime tests/build were not rerun for this research-only change. Previous implementation test results in DATA_SOURCES.md are historical verification, not evidence of provider permission, accessible robots or live connectivity.
