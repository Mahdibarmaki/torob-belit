# Jalali dates and Toman prices

This authorized iteration localizes the existing Flight AI demo without changing its visual system, RTL layout, seller eligibility, retrospective cancellation calculation, or ranking weights. [Design.md](../Design.md) remains the visual authority; [DESIGN-INTEGRATION.md](DESIGN-INTEGRATION.md) records the calendar interaction adaptation. Current verification must be reported after the implementation checks run; previous design-iteration results do not verify these changes.

## Date-only values and timestamps

The domain deliberately keeps two different concepts:

```ts
type LocalDate = string; // validated Gregorian ISO YYYY-MM-DD; no time zone or time
type Instant = string;   // validated ISO UTC timestamp ending in Z
interface JalaliDate { year: number; month: number; day: number; }
```

Search requests, result URLs, filtering, fixtures, and storage retain Gregorian ISO date-only values. The picker displays Jalali fields and converts the selection to `LocalDate` before submitting it. It does not parse a selected day as midnight in a browser/server time zone. Flight schedule instants, history revisions, and the fixed source reference remain UTC timestamps.

`src/domain/jalali.ts` reuses the existing `@js-temporal/polyfill` rather than introducing another calendar dependency. A strict `Temporal.PlainDate` in the `persian` calendar converts between validated Jalali fields and ISO dates. Invalid month/day/leap combinations are rejected. Month navigation deliberately constrains a day when moving into a shorter month; this does not make an invalid explicitly selected date valid. Temporal distinguishes calendar dates from instants. See [Temporal PlainDate documentation](https://tc39.es/proposal-temporal/docs/plaindate.html).

All visible dates use the shared `formatJalaliDate`/`formatJalaliInstant` helpers, Persian month names, and Persian numerals. `formatJalaliDate` has no timezone dependency. For a timestamp, `formatJalaliInstant` requires an explicit IANA zone: departure dates use the origin airport, arrival dates use the destination airport, and a history/source reference uses its stated source/origin zone. The format boundary never changes elapsed durations or matches a search against a UTC day accidentally.

| Meaning | Gregorian internal value | Persian display date |
| --- | --- | --- |
| First supported demo departure | `2026-10-16` | ۲۴ مهر ۱۴۰۵ |
| Last supported demo departure | `2026-10-22` | ۳۰ مهر ۱۴۰۵ |
| Source reference date in applicable fixture zones | `2026-10-15T12:00:00Z` | ۲۳ مهر ۱۴۰۵ |
| Leap Esfand example | `2025-03-20` | ۳۰ اسفند ۱۴۰۳ |
| Next year boundary | `2025-03-21` | ۱ فروردین ۱۴۰۴ |

The Jalali picker uses the existing design-derived modal and controls, associated labels, a Saturday-first grid, Persian month/year controls, disabled dates outside the fixture range, visible focus, and Escape/focus restoration. RTL left/right keys follow the visual day order; up/down move weeks, Home/End move to week boundaries, Page Up/Down move months, and Shift with those page keys moves years. Keyboard selection respects the supported min/max dates. Month/year controls can browse outside the current demo range, but unsupported days cannot be selected.

## Canonical money and exact unit conversion

The canonical monetary unit is the **Iranian rial**, with ISO currency code `IRR` and an explicit unit field:

```ts
interface Money {
  currency: "IRR";
  unit: "rial";
  amountRials: number; // nonnegative safe integer
}
```

One Toman is exactly ten rials. Keeping integer rials preserves provider precision, avoids inventing an ISO currency code for Toman, and makes the input/output conversion explicit. All offer eligibility, complete party totals, seller comparison, budget filtering, numeric sorting, and price utility use `amountRials`; formatted strings never participate in arithmetic or order.

`src/domain/money.ts` owns the boundary helpers:

| Helper | Contract |
| --- | --- |
| `toRialMoney({ unit: "rial", amount })` | Validate and preserve an already-rial integer; do not multiply or divide it again. |
| `toRialMoney({ unit: "toman", amount })` | Normalize an explicitly Toman amount to integer rials once; allow at most one Toman decimal digit and reject fractional-rial, negative, non-finite, or unsafe amounts. |
| `parseTomanInput(text)` | Accept Persian, Arabic-Indic, or Latin digits, valid thousands groups, and at most one decimal digit; return canonical integer rials, or `undefined` for an empty budget. Reject malformed text instead of partially parsing it. |
| `formatToman(money)` | Require canonical `IRR`/rial money; return Persian grouped numerals followed by `تومان`, dividing by ten only at display. |

Formatting uses `BigInt` quotient/remainder arithmetic over the safe integer rial input. It preserves one rial as one tenth of a Toman, including near the maximum safe amount; it does not round prices for display. Examples:

```ts
formatToman({ currency: "IRR", unit: "rial", amountRials: 12_345_670 });
// "۱٬۲۳۴٬۵۶۷ تومان"
formatToman({ currency: "IRR", unit: "rial", amountRials: 15 });
// "۱٫۵ تومان"
parseTomanInput("۱٬۲۳۴٬۵۶۷٫۵");
// 12_345_675 (rials)
```

Cards, seller offers, budgets, comparison, and recommendation explanations use this one formatter. Budget entry remains a Toman text field with a numeric input hint so Persian keyboard digits are accepted; canonicalization happens before API submission. No UI component contains a competing `/10`, `/100`, or exchange-rate calculation.

## Fixture and API migration

The preceding fixture prices were authored in USD cents, not IRR or Toman. They cannot be relabeled as Toman or converted without an exchange-rate assumption. This iteration replaces them with deliberately authored **synthetic Toman fares**, normalized once by the fixture adapter and identified by dataset `flight-ai-demo-v3-irr`. Seller/party structure and coherent schedules/history remain intact. These values are not market prices or evidence of an exchange rate.

The fixed source reference remains `2026-10-15T12:00:00Z`; neither fares nor history advance with the computer clock. The ranking price reference is versioned as `ranking-v2-irr` and uses `125_000_000` rials per adult, displayed as ۱۲٬۵۰۰٬۰۰۰ Toman. Ranking weights, hard eligibility, deterministic tie-breaking, and cancellation evidence semantics remain unchanged.

The local demo API migration is explicit:

```ts
query: {
  origin: "IKA", destination: "IST",
  departureDate: "2026-10-16", // selected as ۲۴ مهر ۱۴۰۵
  adults: 1, currency: "IRR"
}
filters: { maxPriceRials: 100_000_000 } // user-entered ۱۰٬۰۰۰٬۰۰۰ Toman
```

Money responses expose `amountRials` and `unit: "rial"`. Old USD requests and `maxPriceMinor` are rejected, and old `amountMinor` offers do not satisfy canonical quote eligibility; no legacy amount is silently reinterpreted. Supported-date machine fields remain Gregorian ISO, while human-readable validation messages use Jalali. Future provider adapters must state their source unit explicitly and retain provenance; this iteration connects no real currency/flight provider.

## Cancellation history and verification

Calendar localization changes presentation only. History still matches the operating carrier/number/route over the previous **30 completed origin-local days**, anchored to source `asOf`. The current origin-local day is excluded. For the fixture's applicable origin zones, the internal interval is `[2026-09-15, 2026-10-15)`, shown from **۲۴ شهریور ۱۴۰۵** to before **۲۳ مهر ۱۴۰۵**. The minimum 10 known outcomes, verified roster, 80% coverage gate, 10%/25% thresholds, unknown handling, and per-leg semantics remain unchanged. Historical percentages remain retrospective evidence, never calibrated future cancellation probabilities.

Verification covers round trips, month/year boundaries, leap and non-leap Esfand, date-only timezone independence, zoned instants, lossless tagged unit conversions, safe integer boundaries, Persian grouping/fraction formatting, budget parsing, ISO search-date matching, and numeric price sorting. Browser checks cover date selection/search, month/year and RTL keyboard navigation, unsupported-date bounds, Escape/focus return, consistent dates/prices across views, and mobile overflow. Run lint, typecheck, unit tests, production build, and the cancellation/browser regressions; report actual outcomes separately.

### Completed verification — 2026-10-15

- Lint, TypeScript checking, and the production build passed.
- All 167 unit tests passed, including the unchanged cancellation-history calculation suite and new calendar/money/search cases.
- All 12 production-browser checks passed, including month/year and keyboard date selection, Persian-digit budgets, exact toman amounts in seller/comparison views, ISO search submission, cancellation controls, and a 390px mobile viewport.
- Desktop and mobile screenshots were inspected against the existing design. Browser QA runs on its own port, 3100, without reusing the open development preview on port 3000; this prevents a stale preview from being mistaken for the current production build.
