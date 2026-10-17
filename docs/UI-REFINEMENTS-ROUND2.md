# Torob Belit UI refinements, round 2 — 2026-10-16

This is a targeted continuation of [round 1](UI-REFINEMENTS.md), under the same [DESIGN.md](../DESIGN.md), font configuration, RTL rules and source-state contracts. No fixtures, prices, airport metadata, cancellation calculations, provider connections or dependencies change.

## Completed changes

1. **Zero-based price controls.** The absolute minimum is zero canonical rials (zero Toman); the maximum remains the highest valid eligible total-party offer in the unfiltered search. Initial and reset handles use the full interval. Positive equal-price/single-offer searches remain adjustable from zero to that price; zero-only results disable handles; missing prices remain unknown instead of producing an invented maximum. Draft/apply/reset, inclusive same-offer constraints, one-rial keyboard precision and lossless Toman formatting are preserved.
2. **Horizontal price labels.** Two equal RTL grid cells keep minimum/right and maximum/left on one row, including the narrow desktop filter column. The subtle tinted pills contain the complete Persian grouped numeric amounts; compact label headings carry “از / تا” and “تومان”. Accessible output names and slider value text contain the complete amount and unit. This avoids repeating a currency suffix inside a narrow pill or reducing typography below the source's 12px caption size.
3. **Removed banner.** The former `product-data-notice` paragraph, information icon, and their margin rules are removed. Existing header/footer source-information controls retain the explicit explanation that flights, prices, capacity and history are synthetic and are not market data or actual airline performance. Booking remains unavailable. No replacement banner or empty placeholder is inserted.
4. **Shared route presentation and alignment.** [AirportRoute](../src/components/airport-route.tsx) renders both card routes and the formerly plain-text details summary. Callers still supply the unchanged airport data and existing formatted local times/Jalali dates. A three-column grid puts origin on the RTL right, the existing airplane/dashed connector in the middle, and destination on the left. Card endpoints share four subgrid rows for time, code, name and date; the name row expands for either endpoint and centers the shorter name within it. Overnight notes add a separate fifth row. The middle stack centers over the full route. The compact summary uses the same endpoint/connector treatment with two rows and no duplicated schedule fields. Card details, comparison and history buttons keep their prior behavior.

## Changed files

- Slider bounds/presentation: [price-range.ts](../src/domain/price-range.ts), [price-range-slider.tsx](../src/components/price-range-slider.tsx), [filter-panel.module.css](../src/components/filter-panel.module.css).
- Route/banner presentation: [airport-route.tsx](../src/components/airport-route.tsx), [flight-card.tsx](../src/components/flight-card.tsx), [flight-explorer.tsx](../src/components/flight-explorer.tsx), [globals.css](../src/app/globals.css).
- Regression coverage: [price-range.test.ts](../tests/price-range.test.ts), [refinements.spec.ts](../tests/e2e/refinements.spec.ts), [round2.spec.ts](../tests/e2e/round2.spec.ts).
- Current behavior/documentation: [AGENTS.md](../AGENTS.md), [README.md](../README.md), and these iteration notes. Prior iteration notes and verification counts remain historical.

## Verification

- `npm run lint`, `npm run typecheck`, and the Webpack `npm run build` passed.
- `npm test`: **412 tests across 16 files passed**, including zero-based positive/identical/single/empty prices and the existing currency, filtering, comparison, provider and cancellation regressions.
- `npm run test:e2e`: **59 production-browser tests passed in one run**. Five additional responsive cases check 375/430/768/1024/1440px, initial and reset minimum zero, two horizontal RTL price groups, native keyboard value changes, no search until Apply, same-offer filter requests and complete reset, shared code/time/date alignment with wrapped names, the matching details summary, card focus restoration, banner absence and source-information truthfulness. Existing mouse dragging, mobile header layering and independent comparison/history cases also passed.
- Screenshots were inspected at phone, tablet and desktop sizes. The narrow 170px sidebar labels remain horizontal and readable; route times, codes and dates align; no clipping, overlap or page overflow was found.

Saved evidence: [desktop price labels](screenshots/round2-prices-desktop.png), [mobile price labels](screenshots/round2-prices-mobile.png), [mobile route summary](screenshots/round2-summary-mobile.png), [desktop route summary](screenshots/round2-summary-desktop.png), and a [normal card](screenshots/round2-card-desktop.png). [Mobile](screenshots/round2-route-wrapping-stress-mobile.png) and [desktop](screenshots/round2-route-wrapping-stress-desktop.png) wrapping-stress images deliberately change one label in the browser to exercise multiline layout; they are QA evidence, not a changed airport record or fixture.

Existing CTA contrast and physical-device QA limits in [DESIGN-INTEGRATION.md](DESIGN-INTEGRATION.md) still apply; this scoped iteration does not claim a new accessibility certification. No new unresolved implementation issue was found.
