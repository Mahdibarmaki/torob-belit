# External seller destinations

Reviewed **2026-10-17** for the authorized metasearch/referral change. This review
concerns ordinary user navigation to public seller search pages, not automated
inventory access, an affiliate agreement, or confirmed booking availability.
The separate [provider data audit](DATA_SOURCE_AUDIT.md) continues to govern
future automated integrations.

## Current destination registry

| Current offer seller ID | Seller | Official website | Configured destination | Type and evidence |
| --- | --- | --- | --- | --- |
| `demo-seller-0` (`alibaba` canonical alias) | علی‌بابا | [Alibaba](https://www.alibaba.ir/) | `https://www.alibaba.ir/` | Public flight-search entry at the site root. Alibaba's [published flight announcement](https://t.me/s/alibabatravels?before=2594) explicitly directs readers to this URL to view flights and obtain tickets. Direct homepage retrieval timed out in this research environment; the root's currently rendered form was not independently observed. This is a published flight entry, not a guessed `/flights` route or an offer-specific booking URL. |
| `demo-seller-1` (`flytoday` canonical alias) | فلای‌تودی | [Flytoday](https://www.flytoday.ir/) | `https://www.flytoday.ir/flight` | [Official flight landing](https://www.flytoday.ir/flight) visibly includes origin, destination, dates, passengers and the search control. |
| `demo-seller-2` (`mrbilit` canonical alias) | مستربلیط | [MrBilit](https://mrbilit.com/) | `https://mrbilit.com/plane-ticket` | The official homepage's flight navigation links to this [flight landing](https://mrbilit.com/plane-ticket), which visibly includes origin, destination, departure/return and passenger search fields. |

Only the three seller identities actually present in authored-demo fixtures are
registered. Safarmarket and Snapptrip remain disconnected provider interfaces,
not added synthetic sellers. Imported Alibaba-reference records explicitly mark
their seller identity as unverified; their seller ID is not an Alibaba seller
alias and resolves to no destination. An unrecognized seller shows the existing
unavailable-link presentation rather than linking to a different seller.

No individual flight/price, seat availability, passenger search submission,
transaction, partnership, affiliate parameter or booking API was verified. Public
landing visibility does not override the provider's automation/data-reuse rules.
The Alibaba published-entry evidence does not establish live page availability;
users may encounter seller-side errors or access restrictions. Retrieval tools
may use extracted/cached public text, which is not an inventory freshness signal.

## Resolution and security

- [The registry](../src/data/sellers.ts) contains all destinations, exact approved
  hosts, canonical/display aliases, evidence URLs and review dates. React
  components do not invent or scatter seller URLs.
- [The pure resolver](../src/domain/seller-destination.ts) accepts the existing
  offer's `sellerId`, `bookingUrl`, and `source`. It returns
  `{ url, type: "flight-search" | "booking", sellerName } | null`. It does not
  mutate the offer, its source, selected fare, price, search or comparison state.
- Authored-demo/fixture URLs are ignored. Known authored-demo sellers receive
  only the reviewed query-free search landing, clearly identified as continuing
  a search at the seller. No route, date, party, price or identity is appended.
- Unknown/unverified sellers and unavailable sources return `null`. A known
  seller's missing or unapproved live booking link can still resolve to its
  separate **flight-search** landing; it never resolves as **booking** merely
  because a supplied string has an approved hostname.
- A future live booking link must match an exact, source-specific destination
  recorded after authorized review. **All current booking-approval lists are
  empty.** The URL validator additionally rejects HTTP, credentials, nondefault
  ports, arbitrary subdomains/hosts, query strings, fragments, whitespace and
  control characters. Even a same-host path carrying identity data is unusable
  without exact approval. Future documented query-based link contracts require
  a separately reviewed field/PII policy; they are not enabled by this change.
- External actions use a native link in a new tab with `noopener noreferrer`.
  No passenger name, contact, national ID, passport, birth date, or stored ticket
  information enters a destination URL. The application does not request these
  attributes as part of referral.

## Product meaning

Torob Belit helps users discover and compare flights, then continue to the chosen
seller's website. It does not process payment, reserve the displayed fare, or
issue airline tickets. Current authored-demo flight numbers, schedules, offers,
prices and history remain synthetic. The named real travel agencies do not
establish a commercial relationship, live connection, or matching seller quote.
The selected seller may offer different flights/prices or no equivalent flight.

## Verification

The regression suite covers the three existing fixture seller mappings,
canonical aliases, unchanged offer data, unknown/reference seller missingness,
unavailable sources, ignored fixture URLs, strict HTTPS/host boundaries,
credentials, attempted redirection/identity parameters, and the absence of
undocumented live booking approvals. Verification results are recorded with the
parent implementation's final checks. The focused **31 tests** and ESLint for the
registry, resolver and its tests passed on 2026-10-17. No live inventory or
transaction request is part of these tests.
