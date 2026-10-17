# Torob Belit reference source review

Reviewed locally: **2026-10-15**. The supplied archive is extracted under [reference/extracted/torob-belit](../reference/extracted/torob-belit). This review reads source and stored JSON only; it does not call the reference's network adapter, start its server, replay tokens, authenticate or test a provider endpoint. The review establishes what the supplied implementation does, not provider authorization or real-world data authenticity.

Inspected: [reference AGENTS.md](../reference/extracted/torob-belit/AGENTS.md), [Alibaba adapter](../reference/extracted/torob-belit/src/adapters/alibaba.js), [mock adapters](../reference/extracted/torob-belit/src/adapters/mock.js), [shared flight helper](../reference/extracted/torob-belit/src/flight.js), [search coordinator](../reference/extracted/torob-belit/src/search.js), [HTTP server](../reference/extracted/torob-belit/src/server.js), [tests](../reference/extracted/torob-belit/test/alibaba.test.js), both stored responses, package metadata and the single-file frontend. The supplied reference has no dependency declaration or license file establishing an API/data license. Its `AGENTS.md` is reference material for this review; Flight AI's project rules and the user's current instructions govern the port.

## What the source actually contains

| Area | Observed source behavior | Reuse decision |
| --- | --- | --- |
| Alibaba record parsing | Iterates `result.departing`; maps carrier/number, route, local schedule strings, baggage, seats, fare class, ticket type and raw adult price. By default excludes `X`/`C`, falsy seats and falsy purchase permission. | Reuse understood field mappings through a defensive pure TypeScript parser, retaining unknowns and raw evidence. Validate JSON, route/date and types; do not call the transport. |
| Base32 | Uses the `ABCDEFGHIJKLMNOPQRSTUVWXYZ234567` alphabet and unpadded encoding, with a sample-token encode/decode round trip. `decodeToken` does not robustly reject invalid alphabet characters. | The codec can be reviewed/tested as a pure local function. Round-trip success says nothing about server acceptance, authorization, token expiry or protocol validity. Do not port a request generator as a working API. |
| Search URL/token | Constructs a URL using random numeric fields, .NET ticks, route and date. Comments explicitly say some field meanings and server validation are unconfirmed. | Do not activate or reuse the undocumented URL generator as an authorized transport. Do not infer what its numeric fields mean. |
| Network headers | Sends browser-like user-agent/origin/referer and optionally an `ab-alohomora` header from an environment variable. | Not ported or called. A copied browser header/token is not a documented API credential or permission grant. Do not solicit harvested website credentials or bypass a challenge. |
| Other providers | `mock.js` starts from Alibaba rows, drops deterministic subsets and changes prices, then labels them Flytoday/Safarmarket/Snapptrip. | Not reused. These are fabricated seller offers, not independent provider data. Keep the other three adapters disconnected. |
| Parallel search | Uses `Promise.all` with per-adapter try/catch, a six-second `AbortSignal.timeout`, and a sixty-second `Map` cache. | Reuse the architectural intent in Flight AI's existing aggregator, with a total deadline race, bounded cache, in-flight deduplication and safe typed failures. A noncooperative adapter can outlive a signal in the reference. |
| Fixture loading | If the requested route file is absent or invalid, silently loads THR–MHD. It does not check the requested date against stored departures. | Reject this fallback. Match exact stored route and date, otherwise return an explicit unsupported/empty fixture result. Never substitute airports or shift dates. |
| Mode handling | Defaults to fixture; `auto` tries network then silently replaces failed provider results with fixtures, using `fixture-fallback` metadata. | No implicit fallback. Preserve explicit authorized and offline modes, and distinguish source origin from cache delivery. |
| Standard flight ID | Combines provider, carrier/number, departure clock and fare class; excludes route, date and arrival schedule. | Do not reuse as the canonical identity. Use Flight AI's exact ordered service identity including airports and scheduled instants, with separate seller/offer IDs. |
| Price | Divides `priceAdult` by ten and rounds; `RIAL_TO_TOMAN` is a constant, and tests assert the same division. | Do not treat this as verified monetary evidence. Preserve raw numeric values and unresolved unit; do not round away rials or show an authoritative Toman price. |
| Time | Extracts local clocks with string slicing and subtracts `new Date()` values lacking offsets. | Preserve date-only/local schedule fields first. Explicit reviewed airport-zone assumptions or an official contract are required before UTC conversion; never use host timezone. |
| Fare conditions | Missing `isRefundable` becomes nonrefundable; the generic helper defaults refund to fee. | Retain unknown conditions and raw refund rows. Missingness is not proof of nonrefundability or a fee. Refund rules are not operational cancellation history. |
| Booking | Adds a generic Alibaba flight landing and other provider homepages as purchase links. | Keep `bookingUrl: null`; a homepage is not an approved fare-specific booking/referral URL. |
| Server/frontend | Separate dependency-free Node HTTP server and a frontend with its own colors, native Gregorian date control and price display assumptions. | Do not port server/UI. Preserve Next.js services/routes, Design.md, Jalali/Toman boundary rules, RTL and accessibility. |

The reference's **four original Node tests ran and passed locally**. They exercise a codec round trip, the assumed divide-by-ten parser output, a failing fake adapter and the second stored route. This establishes only those local assertions, not provider connectivity, production schema stability, permission, freshness, capture authenticity or price-unit correctness. In particular, a passing test that repeats `/ 10` is not independent evidence of the amount's unit.

## Stored responses and provenance

| Supplied JSON | Rows | Rows passing the reference's default purchase predicate | Stored route/date |
| --- | ---: | ---: | --- |
| [alibaba-THR-MHD.json](../reference/extracted/torob-belit/fixtures/alibaba-THR-MHD.json) | 55 | 45 | THR–MHD, `2026-10-15` |
| [alibaba-THR-SYZ.json](../reference/extracted/torob-belit/fixtures/alibaba-THR-SYZ.json) | 14 | 9 | THR–SYZ, `2026-10-15` |

These are static file counts, not current seat/inventory claims or the output count of the new validated port. Rows include `X`/`C` statuses and seats/purchase flags, but those are historical file contents; they cannot establish present availability or a thirty-day operations denominator.

The reference's `AGENTS.md` calls the files real responses, but the supplied material does not establish who recorded them, how or when they were obtained, permitted retention/reuse, or whether they were edited/authored. No independent capture provenance, recording timestamp or provider-update timestamp is present. Treat them as **user-supplied offline reference JSON with unverified provenance**, never as certified recorded real data, live inventory or verified synthetic data. Do not invent `fetchedAt` from file modification time or the present clock. A local import/processing time must be named as such rather than presented as a supplier refresh.

Raw records include opaque proposal/quote identifiers and incidental fields irrelevant to the demonstration. The port should allowlist needed schedule/identity/fare fields, remove opaque proposal identifiers and transport/session material, and keep the extracted reference outside client/public assets. A sanitized derivative must state its source and modifications; sanitization does not establish authenticity or a data license.

## Money decision: preserve uncertainty

The key contradiction is explicit in [reference AGENTS.md](../reference/extracted/torob-belit/AGENTS.md): its structure section describes rial-to-Toman conversion, while its open-items section says the Alibaba price scale **has not been confirmed**. Neither stored file has an explicit currency or unit field. `priceAdult`, numeric size, the divide-by-ten constant, or a test repeating that division is insufficient evidence.

The implemented unpriced boundary preserves this uncertainty; the following is a compact evidence-type example rather than a replacement for the executable domain contract:

```ts
type UnverifiedReferenceAmount = {
  rawAmount: number; // validated safe integer from the supplied priceAdult
  sourceField: "priceAdult";
  currency: null;
  unit: "unverified";
};
```

Keep this distinct from canonical `{ currency: "IRR", unit: "rial", amountRials }`. The port uses `totalPrice: null`, `priceComplete: false`, raw price evidence and separate typed unpriced search results. Until a trustworthy unit/party/charge basis is established, do not fabricate canonical money, infer a zero fare, divide or multiply, call the amount Toman, or include it in cheapest-price/budget/ranking comparisons. The UI shows **«واحد مبلغ تأیید نشده»**, and any raw value has no تومان/ریال suffix. Fixture price/history sorts are disabled and API requests for them return `422 UNSUPPORTED_FIXTURE_SORT`; reference schedule ordering remains available.

If the product intentionally supports a demo-only monetary assumption later, it must be a separately disclosed simulation decision with an explicit typed assumption and version, not described as verified Alibaba normalization. An official contract or reliable original capture evidence is still required before live prices can use the rial/Toman conversion. Once verified, convert exactly once and retain single-rial precision.

## Safe parser/fixture port

The useful port is an **offline defensive parser**, not a network integration. Its integration requirements are:

1. Load only known local sanitized fixture files. Enforce exact route and stored local date; do not serve THR–MHD for a missing route or change `2026-10-15` to satisfy a later query.
2. Validate the root/result/row types and required strings, safe numeric raw amount, positive ordered local schedules and known supported fields. Report malformed and unsupported rows explicitly; malformed payloads must not become a falsely successful empty provider response.
3. Preserve flight number formatting, carrier code/name, exact airport codes and local date/time strings, fare class, baggage and availability evidence. Distinguish source-supplied claims from verified operating identity, airport-zone semantics and allowance units.
4. Preserve uncertain monetary units and charge/party completeness. Do not manufacture the strict canonical offer when its required invariants are unavailable; use a typed parsed-record/quarantine result until normalization is possible.
5. Use no homepage as a booking URL; preserve unknown fare conditions; keep history absent. No derived thirty-day risk may be generated from these ticket rows.
6. Add tests for both stored routes, exact date/route mismatch, malformed payloads, unavailable statuses, missing fields, raw-price preservation, explicit unit conversion where actually established, stable route/date-aware identities and no implicit fallback. No test may claim the private endpoint is valid or authorized.

The multi-provider architecture, explicit `LIVE`/`FIXTURE`/`UNAVAILABLE` states, parallel isolation, six-second total provider deadline and sixty-second bounded cache can be verified with local test transports independently of these unresolved reference fields. Real adapters remain blocked by the access requirements in [DATA_SOURCE_AUDIT.md](DATA_SOURCE_AUDIT.md).

## Unanswered reference questions

- Who produced these files; are they edited/synthetic or unmodified captures; what are their recording times and permitted reuse/retention rights?
- What authoritative specification establishes `priceAdult` currency/unit, passenger basis and included mandatory charges? Is baggage kilograms per adult, per piece, or another measure?
- Are carrier/flight fields operating or marketing identities? What official timezone/schedule semantics and airport identifiers apply? How are revisions and duplicate fares identified?
- What is the approved token/authentication protocol, if one is offered, and what agreement authorizes it? Randomized template fields and copied browser headers do not answer this.
- What do each status, purchase flag, seat count and empty response mean under a supported contract? What are quote expiry and revalidation rules?
- Is there an authorized fare-specific booking URL and attribution rule? The stored files' empty/opaque targets are not a documented referral contract.
- Does any separate trustworthy operations dataset exist? Neither ticket statuses nor refund tables establish historical flight cancellation observations.

This review's executed reference check is the **four original local Node tests**, which passed without certifying live access or monetary semantics. Flight AI's separate completed integration verification is recorded in [INTERVIEW_DEMO.md](INTERVIEW_DEMO.md#verification); it does not change the access and provenance limitations found here.
