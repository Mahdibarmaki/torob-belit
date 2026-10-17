# Six UI and airline-branding refinements

> **Historical ticketing scope — 2026-10-17:** [METASEARCH.md](METASEARCH.md) removes the issued-ticket UI, ticket-license actions and PDF/QR export described in this dated refinement record. About/source-linked logo credits and the central/public license records remain active; other branding and responsive refinements are preserved. The PDF test outcomes and artifacts below are historical evidence.

The 2026-10-16 six-item request is implemented incrementally on the existing
Next.js application. Current `DESIGN.md`, local Yekan Bakh FaNum, RTL, Jalali
dates, canonical rial amounts/Toman presentation and existing responsive
breakpoints remain authoritative. No dependency, flight record, price,
historical observation, provider transport, routing or booking rule changed.

## Checklist and intentional limits

| Request | Result |
| --- | --- |
| 1. Remove the issued-ticket attribution block | Removed the inline section and its reserved space. CC BY-SA tickets retain only a small **مجوز نشان‌ها** action outside the document, opening the shared native dialog. CC0/PD-only tickets have no extra action. PDFs retain visible credits for the actual logos. |
| 2. Space the search validation summary | Uses 12px above / 20px below, with 24px desktop/tablet and 16px mobile horizontal inset matching the form grid. Existing alert, field validation and valid submission are unchanged. |
| 3. Oppose mobile price and seller summary | At the existing ≤700px breakpoint, an equal-column RTL grid places the prominent price on the right and left-aligned passenger/seller text on the left. Long summaries wrap within their column. Tablet/desktop stack and seller-dialog headers retain their existing styles. |
| 4. Audit and extend airline logos | All 11 demo and 18 reference name/code pairs checked; six verified logo identities now installed, including newly added Air1Air/اروان. Stable-code-first lookup normalizes known aliases and Unicode typography while rejecting conflicting identities. **Qeshm Air and 14 others remain generic because usable rights-backed artwork was not verified. This portion is incomplete.** |
| 5. Rightmost footer Instagram icon | Replaces only the first RTL icon, using the original filled Bootstrap Icons Instagram path under MIT. Existing three neighbors, 18px glyphs and 40px controls are preserved. No official account is configured; the native button opens the truthful local information dialog without external navigation. |
| 6. Softer social icons | All four use Graphite `#666666`, Carbon hover, Mist hover surface and visible Graphite keyboard focus. Styles are scoped to the footer social controls. |

The logo exception follows the user's express instruction to retain mandatory
credit. It does not remove license metadata or pretend that a public image is
licensed for this application. [AIRLINE_LOGOS.md](AIRLINE_LOGOS.md) records each
installed asset, missing identity, evidence URL and Qeshm-specific permission
gap. [LOCAL-TICKETING.md](LOCAL-TICKETING.md) records the offscreen export clone:
the real ticket stays clean, and the temporary inert document appends actual
credits for PDF capture and is removed on success or failure. The screen remains
semantic HTML; the existing raster PDF limitation remains.

Remaining fallback identities: Mahan, Aseman, Qeshm, Kish, Caspian, Varesh,
Sepehran, FlyPersia, Mehr, J Sky, Iran Airtour, Nasim, Ava, Asajet and Pars Air.
Replacing one needs an authentic file with permission covering local storage,
web display and ticket/PDF export, or a compatible verified repository license.
No logo is invented, reconstructed, borrowed from a different carrier or loaded
from an uncertain remote endpoint. All existing branded UI locations reuse
`AirlineIdentity`; name-only native filter options remain text.

Taban and Air1Air occur only in unavailable stored-reference records. Their new
or existing local artwork does not make those records eligible inventory. Four
verified identities appear in current eligible demo/reference results; all six
original assets are independently checked for HTTP delivery and browser image
decoding without inserting fabricated cards.

Instagram's source, original SVG and complete MIT notice are preserved in
`public/social/`. No package was installed. Airline assets, dimensions, sources,
authors, licenses and hashes remain in the central mapping, public notice and
audit, with accessible About credits.

## Files

- `src/components/issued-ticket.tsx`, `booking-flow.module.css`: clean ticket,
  conditional license access and export-only credits.
- `src/components/flight-explorer.tsx`, `src/app/globals.css`: validation inset
  and footer-only colors/states.
- `src/components/flight-card.tsx`, `flight-card.module.css`: mobile-only row.
- `src/components/site-footer.tsx`, `instagram-icon.tsx`, `public/social/*`:
  actual Instagram glyph, retained original and MIT license.
- `src/data/airline-branding.ts`, `public/airlines/air1air.png`,
  `public/airlines/NOTICE.md`, `tests/airline-branding.test.ts`: reviewed logo
  addition, aliases, identity guard and full dataset/asset audit.
- `tests/e2e/branding-{price,search-footer,ticket}.spec.ts`: responsive behavior,
  valid/invalid search, dynamic party/long seller, original larger-screen/modal
  layouts, social ordering/focus, clean issued pages, real PDF credits/downloads
  and export failure cleanup.
- `tests/e2e/branding-assets.spec.ts`: all actually displayed mappings, all six
  original local files, unavailable-record exclusion and failed-image recovery.
- This document, `AIRLINE_LOGOS.md`, `LOCAL-TICKETING.md`, `README.md` and
  `AGENTS.md`: current behavior, limitations and verification.

## Verification

Combined ESLint, TypeScript, **513 unit tests across 22 files**, production
build and **all 121 production-browser tests** pass. The final browser run
includes 20 new cases alongside the existing 101 regression cases. New checks
cover 375/430/768/1024/1440px, valid/invalid searches, dynamic nine-adult prices
and long seller names, unchanged larger-screen/seller-modal geometry, all six
local image files, honest generic recovery, required license access and actual
PDF downloads/failure cleanup. Existing tests also cover 1920px, comparisons,
Jalali selection, numeric price filtering, cancellation history, one-way and
round-trip issuance and persistent My Tickets.

The first browser run found two ambiguous test selectors that also matched
Next.js's empty route announcer; restricting them to the actual export-error
message fixed the tests. Downloaded PDFs already contained their proper
credits, and no production behavior changed to address this test ambiguity.
The final complete run passes with those corrections.

Responsive cards, form errors, footer icons, clean issued documents and both
Iran Air/Zagros PDF files were visually reviewed. Evidence is saved under
[`screenshots/branding-fixes/`](screenshots/branding-fixes/), including the five
widths and rendered PDF previews. Example artifacts:

- [375px mobile price/summary](screenshots/branding-fixes/branding-price-375.png)
- [768px validation spacing](screenshots/branding-fixes/branding-validation-768.png)
- [1440px issued ticket](screenshots/branding-fixes/branding-ticket-1440.png)
- [430px footer icons](screenshots/branding-fixes/branding-footer-socials-430.png)
- [Zagros actual PDF](screenshots/branding-fixes/branding-ticket-IZG.pdf) and
  [rendered preview](screenshots/branding-fixes/pdf-preview-IZG.png)

Mobile checks use real Chrome with emulated viewports rather than a physical
phone. No check certifies provider access or permission for missing logos.
