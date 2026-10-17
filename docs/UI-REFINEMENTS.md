# Torob Belit UI refinements — 2026-10-16

> This records the previous twelve-change iteration. [Round 2](UI-REFINEMENTS-ROUND2.md) supersedes its below-search banner, nonzero lower price bound/equal-price disabling, and route alignment rules while preserving the other completed behavior. The counts below remain historical.

This iteration refines the existing product under [DESIGN.md](../DESIGN.md). It keeps the approved logo, continuous airplane photograph, local Yekan Bakh FaNum faces, routes, fixtures, providers and retrospective cancellation calculations. No dependencies are added.

## Implementation checklist

| Requirement | Implementation |
| --- | --- |
| 01 — Swap alignment | A relative `airport-fields` parent contains both equally sized airport fields. The circular control is centered at the pair's 50% inline/50% block position at desktop, tablet and mobile widths. Its existing accessible button and swap state remain. |
| 02 — Quiet selection | The requested `--color-brand-tint: #FFF0F2` is a narrow extension of the source palette. Airport/calendar selections use this tint and Carbon text; the airport check and calendar outline provide a small red cue. Solid red remains primarily on conversion actions. |
| 03 — Cards | A sibling native button stretches over the non-interactive card surface, with independent comparison/history controls above it. Enter/Space and focus restoration use the native button; buttons are not nested. `OfferPrice` splits the shared formatter's numeric text from a 12px/400 Toman label. Airport codes appear above reference-data city labels. |
| 04 — Header | Home navigates through the existing view behavior. Installment travel and account access are explicit “به‌زودی” non-interactive placeholders, available in the responsive menu as well. Existing results, source and history-information destinations remain. |
| 05 — Hero | The supplied eyebrow, headline and description replace the prior copy without changing the image/background structure. Natural balanced text wrapping preserves the type scale. |
| 06 — Disclosure | One visible notice below search reads «اطلاعات پروازها صرفاً برای آزمایش محصول است.» in authored demo mode. The source dialog retains full provenance; reference/live/cache modes retain their own truthful attribution. The forbidden legacy version phrase is removed from UI and metadata. |
| 07 — Clear action | The bottom secondary button has hover/active/focus states and disables when neither draft nor applied filters need resetting. |
| 08 — Section rhythm | Every filter section shares 24px vertical padding, a 12px heading/control gap and the source Fog divider. |
| 09 — Apply/reset | Controls edit draft filters. Apply submits one complete snapshot; only a successful response commits applied filters/results. Clear resets both filter states through the same search service and preserves the active sort. Sorting uses applied filters and retains unsaved draft edits. One adjacent action pair replaces the old top reset, budget submit and mobile done actions. |
| 10 — Price range | Two native RTL range inputs share one track and clamp without crossing. Bounds come from unfiltered eligible total-party offers for the search, not current filtered results. Native handles support pointer/touch/keyboard, Persian Toman value text and distinct labels. Equal-price inputs disable; empty/unpriced searches show missing-price text rather than inventing bounds. |
| 11 — Concise copy | Authored demo attribution is not repeated for every seller/card/modal. A presentation-only helper cleans legacy fixture fare/reason text without mutating source records or removing provenance. Purchase actions explicitly report that booking/payment is unavailable. |
| 12 — Summary | Two neutral, assistive-technology-hidden dots separate the three visible date/count/party items. Each dot stays attached to its following item when the row wraps. Existing icons and RTL order remain. |

## Technical decisions and limits

- Canonical money remains safe integer Iranian rials; all formatting delegates to the existing Toman formatter. The new inclusive `minPriceRials` search option complements `maxPriceRials` and is validated at the API boundary. Both bounds and all other hard constraints must be met by the **same** seller offer. No price arithmetic, FX assumption, formatted-string comparison or double conversion is introduced.
- Full-range handles omit price constraints, so resetting does not accidentally exclude imported records with unknown units. Unpriced records cannot satisfy an explicit price bound. The initial unfiltered response keeps price bounds and airline choices stable throughout draft/apply/reset cycles; existing keyed route components reset state on a new search context.
- The existing implementation has a single independent `--color-price` semantic red. It has no green/amber/red price-tier classifier to preserve. This refinement retains that assignment and does not invent price thresholds or reinterpret historical colors. A new tier policy would require a separate product decision.
- Airline/airport metadata, synthetic fixtures and all source-state flags remain unchanged. Legacy words still exist in preserved fixture strings and in the presentation-only replacement rules/tests; those locations are not user-facing UI copy.
- Cancellation rates remain retrospective thirty-day evidence with the same sufficient-data gates and semantic colors, separate from ticket inventory. History dialogs retain observation counts, period, local source, reference time and the future-probability limitation.
- The exact source primary CTA remains white on `#EF142B`, approximately 4.37:1 at small text sizes. The previously documented normal-text AA limitation still applies; this refinement does not claim to solve it. See [DESIGN-INTEGRATION.md](DESIGN-INTEGRATION.md).
- Account, installment travel, payment and actual booking remain unavailable. No login, checkout, live inventory connection or analytics feature is implied.

## Verification

- `npm run lint`, `npm run typecheck`, and the Webpack `npm run build` passed after the final application change.
- `npm test`: **409 tests across 16 files passed**, including inclusive same-offer price ranges, invalid bounds, empty/equal/single-price cases, lossless money, concise presentation without fixture mutation, and all existing history/search/provider regressions.
- **54 production-browser checks verified:** the final full run passed 52 checks; the two remaining card checks passed on a focused rerun after their selectors were narrowed to the interactive history button rather than its hidden modal status copy. Application code did not change between these runs.
- Browser coverage includes the existing 39 flows and 15 new checks for symmetric airport swapping at 375/430/768/1024/1440/1920px, exact hero copy, honest desktop/mobile navigation, a single disclosure and absent forbidden phrases, full-card pointer/Enter/Space details, independent comparison/history controls, smaller regular-weight currency, airport hierarchy, draft/apply/reset and failed-request behavior, real mouse dragging of both range handles, RTL keyboard clamping, sticky-header pointer hit testing, and summary dots.
- Visual review found and fixed mobile range thumbs escaping above the sticky filter-dialog header. The slider now contains its local stacking context; the production regression confirms the header receives pointer input when a focused thumb scrolls behind it. Hero, airport controls, ticket layouts and compact filter action labels were inspected at mobile/tablet/desktop sizes.
- User-facing components, application presentation strings and app metadata contain none of the seven prohibited phrases. Preserved fixture terms and the presentation replacement rules/tests intentionally retain their original strings.

Physical-device keyboard/touch behavior is not claimed by desktop browser emulation. The previously documented CTA contrast limit and unimplemented account/installment/booking services remain explicit limitations rather than fabricated working flows.
