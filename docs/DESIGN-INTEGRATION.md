# Design integration for Flight AI

## Current DESIGN.md migration — 2026-10-16

The root [DESIGN.md](../DESIGN.md) is the single current visual authority. Its Visitors-inspired Torob Belit reference replaces the earlier Airbnb-derived palette, typography, shapes and elevation rules. This migration applies the new visual contract to the existing product; it does not add the reference's analytics dashboards, charts, subscription plans, marketing sections or new flight features. The existing Persian copy, continuous photographic hero, navigation/search arrangement, responsive ticket grid, filters, airport/date dialogs, comparisons, footer, source modes and domain behavior remain the product structure.

### Current visual contract

| Area | Current rule |
| --- | --- |
| Neutral palette | Carbon `#181925`; Paper White `#ffffff`; Linen `#fafafa`; Mist `#f5f5f5`; Fog `#e8e8e8`; Ash `#999999`; Graphite `#666666`. Use Carbon for primary text, Graphite for readable secondary text, Fog for 1px dividers/card borders, and Ash for placeholders or disabled/de-emphasized states rather than meaningful small metadata. |
| Brand actions | `--color-brand-primary: #EF142B`; `--color-brand-primary-hover: #C90F24`. Filled primary actions use white text. Existing `brand`/`brand-strong` aliases resolve to these tokens; old Rausch names do not define the current palette. |
| Supporting palette | Preserve source tokens Mint `#33c758`, Mint Wash `#def6e4`, Amber `#ffa600`, Sky `#2c78fc`, Magenta `#d6409f`, and Ember `#ff3e00` without decorating existing flight surfaces with new colors or introducing analytics categories. Bright semantic-like tokens do not replace the existing accessible historical-status foregrounds. |
| Typography | Caption 12px/1.33; body 16px/1.5; subheading 18px/1.33; small heading 24px/1.17; heading 36px/1.22; large heading 48px/1; display 60px/1.13. Existing 12px small text, 14px controls and 20px price roles correspond to sizes/components included in the source. Use actual 400 body/caption, 500 button and 700 heading weights; map former 600 declarations to 700. Preserve source negative tracking tokens as compatibility data, but render Persian text with normal tracking. |
| Spacing and layout | 4px base; source scale 4/8/12/16/20/24/32/48/64px. Page maximum 1200px, section gap 64px, base card padding 32px and element gap 16px. Existing 28/40/44px dimensions remain compatibility dimensions on the same 4px base. Keep the existing two-column desktop ticket pattern and responsive single-column layouts; compact mobile padding is a responsive adaptation rather than a new density system. |
| Shapes | Cards 16px, images and inputs 8px, table containers 24px, buttons/tags/chips 9999px. Legacy component names alias the new semantic radii. Input-like airport/date triggers retain their field presentation; their popup controls use the shared pill/button rules. |
| Surfaces | White page and card surfaces; Linen secondary bands; Mist input/disabled surfaces. Flat cards acquire the source's 1px Fog boundary rather than a heavy shadow. |
| Elevation | Primary action: `rgba(0,0,0,.08) 0 1px 1px 1px, rgba(0,0,0,.06) 0 0 0 .5px`. Secondary: `rgba(0,0,0,.08) 0 1px 1px 0, rgba(0,0,0,.05) 0 0 0 1px`. Elevated panel: `rgba(0,0,0,.06) 0 1px 3px 0, rgba(0,0,0,.06) 0 8px 16px 0, rgba(0,0,0,.02) 0 0 0 1px`. Overlay/menu aliases use this supplied panel stack, replacing the previous large drop shadows. |

The current variables and Tailwind v4 theme live in [globals.css](../src/app/globals.css). Legacy neutral/component aliases support the existing UI without maintaining a second competing palette. Dates, currency, fares and comparison/ranking values continue through the existing application/domain utilities; this is not a data migration.

### Local font registration and provenance

[layout.tsx](../src/app/layout.tsx) registers user-provided local FaNum TTF faces through `next/font/local`: `04 Regular` as 400, `05 Medium` as 500, `06 Bold` as 700, and `07 Heavy` as 800. The Heavy file's internal weight metadata is 900; the explicit 800 registration follows the supplied design's Heavy weight mapping, while preserving its supplied outlines. No real 600 face exists in the supplied set, so existing semibold roles use the actual Bold face at 700 and `font-synthesis: none` prevents invented styles.

Files under `public/fonts/yekan-bakh/` carry `.woff` names but inspection identifies their bytes as raw TrueType/sfnt data. The implementation therefore uses the actual `.ttf` files in `public/fonts/FaNum/` without renaming, converting or changing supplied font binaries. Font loading stays local; no CDN request is introduced. The old Vazirmatn import is removed from the layout; its unused dependency and [license file](../public/fonts/LICENSE-Vazirmatn.txt) remain to avoid unrelated dependency churn.

The fonts were provided by the user for this project. No separate Yekan Bakh license/permission file was found among the supplied files; this record documents the supplied asset provenance and does not characterize Yekan Bakh as open source or extend the Vazirmatn license to it.

### Current contradictions and resolutions

| Conflict or ambiguity | Chosen resolution |
| --- | --- |
| Mist's color-table role mentions the primary canvas, while the introduction, quick reference and Surfaces table define a white canvas. | Use Paper White for page/card surfaces; Mist is an input, disabled or subdued surface. |
| One reconstructed example uses Carbon text on the red CTA, while the integration notes and full primary-button definition require white text. | Use white CTA text as the repeated, explicit normative rule. The contrast limitation below remains disclosed. |
| The hover token/integration note assigns `#C90F24` to hover, while a Don't sentence reserves that red for registration and excludes body CTAs. | Follow the user's explicit hover requirement and named token: default body CTAs use `#EF142B`; hover/active states may use `#C90F24`. Do not invent a registration action merely because the style reference contains one. |
| The snippets retain a 600 semibold token although the actual static font set has no 600 face. | Map the application semibold role and prior 600 declarations to the provided 700 Bold face, following the integration note. |
| Latin-oriented tracking values conflict with connected Persian glyphs. | Keep the exact source tracking tokens available but use normal tracking for Persian and preserve isolated LTR airport/Latin identifiers. |
| Centered analytics marketing layouts, atmospheric chart bands, a non-sticky navigation example and filled feature icons differ from existing Torob Belit product structure. | Apply visual tokens without redesigning the product: preserve the existing right-aligned photograph-background hero, sticky header, attached tabs/search, Lucide navigation/control icons, ticket grid and shared dialog behavior. Do not add dashboards, decorative gradient sections or unrelated categories. The existing neutral hero readability veil remains a content-contrast treatment. |
| 32px base card padding and the 1200px page maximum reduce the room inside the existing two-column ticket grid. | Keep the approved outer product arrangement, allow content to wrap and apply existing responsive adaptations instead of hiding flight information, changing fares, or inventing a smaller typography scale. |
| Bright Mint/Amber and Ash examples do not meet small-text contrast requirements on their example surfaces. | Retain their exact source tokens; use Graphite for meaningful secondary text and the existing dark semantic status foregrounds for actual historical evidence. No new price-tier calculation is introduced. |

### Semantic colors and accessibility boundary

The historical-status pairs are preserved: low `#166534`/`#f0fdf4`, medium `#854d0e`/`#fffbeb`, high `#991b1b`/`#fef2f2`, and unknown `#6a6a6a`/`#f7f7f7`. Each still carries its Persian label and the existing sufficient percentage or unknown state. The independent displayed-price token remains `#bd1325`; it does not classify a fare as expensive, predict cancellation or borrow meaning from the new brand CTA red. History thresholds, observation windows, sufficient-data gates and every numeric price/ranking calculation are unchanged.

**Remaining contrast limitation:** the prescribed white text on `#EF142B` measures approximately **4.37:1**. At the source's 14px/500 label size this is below the 4.5:1 normal-text threshold. Switching to Carbon from the contradictory example would lower the contrast to about 3.99:1. The implementation preserves the requested exact brand fill and white text; it must not be reported as meeting normal-text AA contrast. A future adjustment to the action fill or label treatment would need an intentional documented design decision. White on the hover red `#C90F24` is approximately 5.87:1; hover contrast does not resolve the default-state limitation.

### Verification scope

The current migration passed `npm run lint`, `npm run typecheck`, `npm test` (**386 tests across 14 files**), `npm run build` (Next.js Webpack production build), and `npm run test:e2e` (**39 installed-Chrome production-browser tests**). No dependencies were added and no domain algorithms, fixtures, routes, fare calculations or history calculations were changed by this migration.

The browser checks verify that the actual local 400/500/700/800 font faces load, the exact new theme and button states apply, and the RTL search, airport selection, Jalali calendar, filtering, details, comparison, source disclosure and cancellation-history interactions continue to work. Existing date-sensitive browser tests now select an explicit query date through the existing search/navigation flow instead of expecting a fixed wall-clock default; the application default-date behavior is unchanged. CSS-token assertions normalize equivalent three- and six-digit hex output from production minification.

Hero screenshots were inspected at **375, 430, 768, 1024, 1440 and 1920px**. The airplane remains a continuous background under readable Persian copy at every width. Desktop equal-height ticket rows, metadata/Compare wrapping, compact mobile cards, modal controls and the footer were also inspected without visible clipping or horizontal overflow. Mobile keyboard behavior was checked through reduced-height/visual-viewport browser emulation, not a physical-device keyboard; device-specific keyboard behavior remains a manual-device check. These browser results do not remove the prescribed CTA contrast limitation described above or certify live provider access.

Current visual evidence is saved separately from the older screenshots: [desktop hero](screenshots/design-migration-desktop.png), [mobile hero](screenshots/design-migration-mobile.png), [airport selector](screenshots/design-migration-airport.png), [Jalali picker](screenshots/design-migration-date.png), [ticket cards](screenshots/design-migration-card.png), [mobile details](screenshots/design-migration-details.png), and [footer](screenshots/design-migration-footer.png). All verification counts in the historical record below apply only to those earlier iterations.

## Historical Airbnb integration record — superseded visual rules

The remaining sections retain the earlier design decisions and verification history. Their palette, font, layout tokens and source-file references describe the earlier implementation and do not override the current `DESIGN.md` migration above.

The user supplied the complete reference on 2026-10-15. It is preserved in [Design.md](../DESIGN.md), including contradictory source descriptions, examples, and both CSS snippets. The latest implementation request authorizes scaffolding and UI work and satisfies the prior design-review gate. Flight AI remains an independent product; reference branding and proprietary assets are not product assets.

## Extracted visual contract

| Area | Implementation rule |
| --- | --- |
| Core colors | Exact values: Rausch `#ff385c`, Rausch 600 `#e00b41`, Hof `#222222`, Foggy `#6a6a6a`, Grey 500 `#c1c1c1`, Bebe `#ebebeb`, Deco `#dddddd`, Faint `#f7f7f7`, White `#ffffff`. |
| Typography | Body 14px/400 at 1.43; UI labels 16px/500 at 1.25; section headings 22px/500 at 1.18; page titles 28px/700 at 1.43. Preserve source 11px caption, 20px subheading, and tracking tokens for their defined roles. Text under 12px is reserved for badges. |
| Typeface | Self-hosted open-source Vazirmatn Variable for Persian and its supported Latin glyphs, with system sans fallbacks. Preserve 400/500/600/700 weights and enable `salt` only to the extent supported by the font. No Cereal or proprietary font file is loaded. |
| Spacing | 4px base; exact source scale 4/8/12/16/20/24/28/32/40/44/48px. Section gap 48px; flight-card padding and element gap 12px. |
| Shape | Flat cards 12px; inputs 8px; explicitly defined outline/inverse buttons 8px; badges, generic pill controls, circular buttons, and desktop search capsule 9999px. |
| Surfaces | Faint canvas; white navigation, search, cards and overlays; Deco disabled/skeleton surfaces; Hof inverse actions. |
| Elevation | Search: `0 0 0 1px rgba(0,0,0,.02), 0 2px 6px rgba(0,0,0,.04), 0 4px 8px rgba(0,0,0,.10)`; overlay `0 8px 28px rgba(0,0,0,.28)`; menu `0 6px 20px rgba(0,0,0,.2)`; tooltip `0 2px 4px rgba(0,0,0,.18)`. No card shadows. |
| Layout | Fixed white 80px navigation; centered search capsule up to 880px; page up to 1440px with 40px desktop padding, 24px tablet padding, and 16px mobile padding. Results use a filter column and a fluid list; sections keep the 48px gap. |
| Icons | Sparse outlined monochrome icons around 16–20px; a coral flight mark is permitted by the logo exception. No reference logo, property imagery, wishlist heart, gradient, illustration, or decorative secondary hue. |

The implementation lives in [globals.css](../src/app/globals.css) and exports reusable tokens through CSS variables and Tailwind v4 `@theme`. Source spacing numbers are literal pixel values: `--spacing-4` is 4px, so `p-4` differs from Tailwind's default 16px. Explicit aliases such as `p-px-16` and semantic component classes avoid that ambiguity. Unused source generic radii remain available as tokens without introducing extra component shapes.

## Contradictions and chosen resolutions

| Conflict or ambiguity | Resolution |
| --- | --- |
| Color table calls Rausch decorative and excludes primary CTA use; the search specification and Do list explicitly require coral search submit; Don't prohibits decorative/text coral. | The specific search rule controls: coral is used for the search icon action and the independent flight mark. Other primary actions are Hof inverse buttons. Headings, metadata, backgrounds, and decorations remain neutral. |
| Layout table limits pages to 1440px; Layout prose says no fixed max-width. | The explicit token `--page-max-width: 1440px` controls. Header/footer surfaces span the viewport while their content uses the same centered 1440px container and source desktop gutters. |
| Named radii specify 8px inputs and full-pill buttons; explicit ghost/inverse components specify 8px buttons; Don't claims all interactive controls are pill-shaped; Quick Start adds many radii. | Named/component-specific rules control their roles: 12px cards, 8px inputs and outline/inverse actions, full-pill generic/round controls. Generic Quick Start radii do not determine an unrelated component's shape. |
| The shadow table is truncated and Search prose mentions a different layer sequence. | Complete Elevation and Quick Start values control; all four complete elevation tokens are preserved. |
| Navigation component defines 16px/500 labels; reconstructed navigation prompt uses 12px/400 labels. | Component definition controls desktop navigation. Mobile labels use 14px to fit without hiding navigation or introducing horizontal page overflow. |
| The font description requests negative tracking; Persian joined glyphs require different treatment; font role names a proprietary family. | Preserve source tracking values as tokens and apply the section tracking to explicitly Latin headings. Persian heading tracking is normal to preserve joining and readability. Substitute self-hosted Vazirmatn; the legacy source-family variable aliases this accessible font instead of referencing an unavailable asset. |
| Token table uses Grey 500 for placeholders; search component explicitly uses Foggy. | Search and general readable form hints use Foggy. Grey 500 remains a disabled/de-emphasis token and is not used for meaningful helper text that needs ordinary contrast. |
| Photography-led 7-up accommodation cards conflict with flight schedule, fare, and evidence comparison. | Adapt whitespace, rounded white surfaces, metadata hierarchy, and internal hairlines to data-first flight cards. Use a vertical flight list with a filter column. No accommodation content or decorative photos are added. |

## Intentional adaptations and accessibility

- Desktop search has four fields—origin, destination, departure date, adults—rather than the reference's three property fields. It preserves segmented labels, vertical hairlines, 880px maximum width, exact layered shadow, and the 48px coral icon action. At 760px and below, it becomes a two-column white search surface with 12px radius and full-width 48px search action; the full-pill outer shape cannot accommodate labeled controls at narrow widths. This is a responsive exception.
- Results and comparison are information layouts rather than property carousels. Cards preserve 12px radius, 12px padding, no outer border, no shadow, and white-on-Faint separation. Internal sections may use Bebe hairline dividers.
- On narrow screens, filters expand through a labeled button with `aria-expanded` and `aria-controls`, keeping the first results close to the search. Native selects preserve platform keyboard behavior. The former native Gregorian date input is replaced by an accessible Jalali picker for the authorized localization scope; its trigger, month/year controls, day grid, and modal reuse the exact existing tokens, neutral controls, radii, and overlay elevation.
- Header/footer links navigate to implemented sections or destinations. Controls without product behavior are omitted. The footer uses actual product information rather than invented social, host, locale, or booking controls.
- RTL uses logical inline/block properties, explicit LTR islands for airport codes/times, and the Persian font. Persian Toman amounts and unit text remain together in RTL; all visible dates use Persian month names and numerals. Source directional positioning mirrors with reading direction. Inputs have associated labels; icon actions need accessible names; statuses always include Persian text.
- Focus has a visible 2px Hof outline with 4px offset. Buttons and indicator triggers have at least 40px targets; form fields are at least 44px; search is 48px. The coral action uses a white icon with an accessible label, rather than small white text whose contrast would be insufficient.
- Reusable `Dialog` uses native modal `<dialog>` with an accessible title, focus containment, inert background, Escape dismissal, explicit close button, backdrop dismissal, scrollable content, and focus restoration. Elevated comparisons use the documented menu elevation; ordinary cards do not acquire a shadow.
- Scroll behavior respects reduced-motion preferences. There are no motion-dependent interactions.

## Jalali and Toman localization

The localization request changes date/price content and the calendar interaction without adding a decorative style. The Jalali picker uses the existing white modal, 12px card radius, 8px input/outline-action radius, neutral text/dividers, existing spacing, visible focus ring, and monochrome controls. Month/year navigation and calendar-day selection remain keyboard accessible in RTL; selected and unavailable states use existing neutral tokens. No calendar color is added to the coral or semantic-risk palettes.

All date labels, including history evidence and fixed source reference timestamps, use Jalali Persian formatting. API date-only values remain Gregorian ISO and are not displayed as user-facing dates. Every price uses the same Persian-number Toman formatter; budget input normalizes Persian digits at the boundary. [LOCALIZATION.md](LOCALIZATION.md) records canonical rial storage, exact division by ten, and the deliberate replacement of synthetic USD fixtures with newly authored Toman fares. Cancellation colors, history calculations, and source disclosure remain unchanged.

## Cancellation risk: required semantic exception

Semantic history colors are an explicit user-authorized exception to the single-accent rule. They are restricted to cancellation indicators and history controls; they do not style unrelated decoration or general error copy.

| Status | Persian label | Unrounded retrospective rate | Text/icon token | Surface token |
| --- | --- | --- | --- | --- |
| Low | کم | `< 10%` | `--color-risk-low: #166534` | `--color-risk-low-surface: #f0fdf4` |
| Medium | متوسط | `>= 10%` and `< 25%` | `--color-risk-medium: #854d0e` | `--color-risk-medium-surface: #fffbeb` |
| High | زیاد | `>= 25%` | `--color-risk-high: #991b1b` | `--color-risk-high-surface: #fef2f2` |
| Unknown | داده ناکافی | Missing/invalid history or insufficient evidence | `--color-risk-unknown: #6a6a6a` | `--color-risk-unknown-surface: #f7f7f7` |

These exact additional status values are chosen dark foregrounds over pale semantic surfaces for legible normal-size text; the core palette is unchanged. The user's latest 10%/25% policy supersedes the former proposed 2%/5% categories. Classification uses unrounded fractions. Every flight card must show its Persian label and sufficient leg-level historical percentage, or a clear insufficient-data state. Connections retain each leg's evidence; no aggregate journey cancellation probability is created.

Indicators open a detail dialog with expected scheduled flights, valid known outcomes, cancellation count, excluded/missing evidence, coverage, previous 30 completed origin-local calendar days, synthetic source, fixed source reference/last update, and the retrospective limitation. Ten valid observations are mandatory; the architecture's verified-roster and 80% coverage checks also remain in force. Available diagnostic fractions on insufficient data are explicitly described as incomplete evidence in detail, rather than a representative rate.

History filters and sorting share the reusable domain calculation and summary categories. Ranking may consume historical evidence through a versioned factor; history remains a retrospective observation and never a calibrated future probability. All prices, flight details, history dialogs, and comparisons disclose synthetic demo data independently.

## Acceptance review

Visual review should cover a narrow phone, tablet, and wide desktop; RTL flow; search and results at full and empty states; each of the four history states; leg-level history dialogs; seller offers and comparison; keyboard focus through search/filter/result actions; Escape and focus restoration; loading/errors; and readable data disclosure. Automated verification is reported by the implementation owner after lint, typecheck, production build, domain tests, and available browser checks are run.

### Previous design iteration verification — 2026-10-15

These recorded results apply to the earlier design/search/cancellation implementation. They are not verification of the subsequent Jalali/Toman changes; the localization iteration requires a new run of the checks and browser flows.

- `npm run lint`: passed with zero warnings.
- `npm run typecheck`: passed after production route types were generated.
- `npm run build`: passed; Next.js 16.4.1, React 19.3.1, and Tailwind CSS 4.3.3 are resolved in the lockfile.
- `npm test`: 73 tests passed, including history-window/reconciliation/threshold gates, sanitized presentation evidence, same-offer eligibility, sorting, and API validation.
- `npm run test:e2e`: nine installed-Chrome production-browser checks passed. These cover Persian/RTL tokens, search, history filtering/sorting, keyboard-contained dialogs and Escape/focus return, comparison, API rejection, comparison-state races, alternate-seller removal, and the 390px mobile viewport.
- Desktop and mobile screenshots were inspected. The local preview responds; it is not a published or live-data service. Automated browser-server sessions are stopped after verification.

## Provider-readiness iteration

The existing tokens, search capsule, RTL grid, Jalali picker, cards, filters and dialogs remain. New provider readiness uses existing neutral cards/badges, 12px element gaps and 24px section spacing, a two-column desktop/one-column mobile grid, and no new colors, shadows or imagery. Demo disclosures are mode-aware; existing per-offer surfaces now show provider attribution, cached/fresh retrieval provenance and an approved booking link only when supplied. The authorized semantic history-color exception is unchanged; unavailable history remains neutral gray with text. Default empty inventory is a truthful access state, not a design substitute for offers.
