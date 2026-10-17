# Airline identity assets and iconography

> **Attribution update — 2026-10-17:** Internal ticket pages and PDF/QR export are removed under [METASEARCH.md](METASEARCH.md). Required airline-logo attribution remains available in the existing About dialog, source-linked assistant logos, central manifest and public notices. References below to ticket/PDF presentation, export permissions or saved export evidence describe the earlier delivery, not an active export capability. The installed assets, licenses and missing-artwork restrictions remain unchanged.

Reviewed 2026-10-16 for the comprehensive UI refinement. Names and operating
codes remain existing domain/provider data; this change is presentation only.
The [central mapping](../src/data/airline-branding.ts) and
[public notices](../public/airlines/NOTICE.md) retain the asset source, author,
license, original dimensions and file hash. The existing About dialog credits
all installed assets. Issued tickets provide compact access to required image
credits; PDF export retains the used logos’ credits independently of the screen
layout.
These marks identify the named airline without implying affiliation, real
inventory, permission to book, or real ticket issuance.

## Dataset audit

The authored demo imports all **11** entries of `IRANIAN_AIRLINES`. The two
sanitized Alibaba reference files contain **18** distinct name/code pairs. Eight
overlap after typography-only Persian normalization, giving **21 distinct
identities** across the modes. Reference codes remain unverified provider
identifiers; they are not promoted to verified operating codes by logo lookup.
No flight record, source record, price, aircraft association or cancellation
observation was changed.

### Installed assets

| Airline | Reviewed display aliases | Asset and source | License / attribution | Decision |
| --- | --- | --- | --- | --- |
| ایران‌ایر / Iran Air | IRA, IR | [iran-air.jpg](../public/airlines/iran-air.jpg), [Commons original](https://commons.wikimedia.org/wiki/File:Iranair_logo.jpg) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/); Edward Zahrabian (ادوارد زهرابیان) | Original square Homa image; full bird visibly intact. |
| زاگرس / Zagros Airlines | IZG, ZV | [zagros.png](../public/airlines/zagros.png), [Commons file](https://commons.wikimedia.org/wiki/File:Zagros-logo.png), citing the [airline site](https://www.zagrosairlines.com/) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); zagros airline | Original mark; no recoloring or cropping. |
| معراج / Meraj Airlines | MRJ, JI | [meraj.png](../public/airlines/meraj.png), [Commons file](https://commons.wikimedia.org/wiki/File:Meraj_Logo.png) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/); Dreamliner 2012 | Selected CC license from the file's dual license; original mark/wordmark. |
| آتا / ATA Airlines (Iran) | TBZ, I3 | [ata.png](../public/airlines/ata.png), [Commons file](https://commons.wikimedia.org/wiki/File:Logo_text_ATA_Airlines_(Iran)_2025.png), citing [ATA](https://ataair.ir/) | Commons [PD-textlogo](https://commons.wikimedia.org/wiki/Template:PD-textlogo); ATA Airlines (Iran) | Correct Iranian ATA wordmark, not the similarly named US airline. |
| تابان / Taban Airlines | TBN, HH | [taban.png](../public/airlines/taban.png), [Commons file](https://commons.wikimedia.org/wiki/File:Taban_Airlines_official_logo.png) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); Tabanairlines | Original portrait asset includes surrounding white space; preserved as supplied. |
| اروان / Air1Air (Iran) | A1 (stored provider alias) | [air1air.png](../public/airlines/air1air.png), [Commons file](https://commons.wikimedia.org/wiki/File:Logo_Air1Air_(Iran).png), citing [Air1Air](https://en.air1air.com/) | Commons [PD-textlogo](https://commons.wikimedia.org/wiki/Template:PD-textlogo); Air1Air | Added in the six-item follow-up; original local PNG, original navy/red/white. |

All local files remain byte-for-byte copies. `next/image` supplies normal local
image optimization and `object-fit: contain` within a consistent square slot;
there is no remote image dependency. Iran Air intentionally keeps the original
JPEG rather than converting it or using the damaged transparent PNG candidate
with clipped lettering. No suitable license-backed SVG or tighter transparent
Taban source was verified. Existing airline names remain readable independently
of the image, so a small wordmark never becomes the sole identity cue.

Commons license statements are attributed to the file pages, not asserted as an
airline partnership or an independent legal guarantee. Trademark rights remain
separate from copyright licensing. Re-check asset permissions before a public
commercial release; this iteration supplies the requested local demonstration.

### Explicit generic fallbacks

A visible airline name and generic airplane glyph remain when no authentic
reusable asset was verified. Public visibility of an airline mark does not grant
reuse rights. No logo was reconstructed, downloaded from an arbitrary logo
aggregator, recolored to Torob red, or borrowed from a similarly named airline.

| Dataset name / code | Research evidence / limitation | Result |
| --- | --- | --- |
| ماهان / IRM (W5 metadata) | [Airline site](https://www.mahanair.co.ir/en/) did not expose inspectable license text; [Commons PNG](https://commons.wikimedia.org/wiki/File:Mahan_Air_Logo.png) uses an unknown author/vector aggregator and a generic US-expiry claim for a modern logo. | Generic until a clear rights-backed source is supplied. |
| آسمان / IRC, EP | [Official channel](https://t.me/s/asemanairlines/3008) identifies iaa.ir; [Commons JPEG](https://commons.wikimedia.org/wiki/File:Aseman_Airlines_logo.jpg) has an unknown author/image-host source and a generic US-expiry claim. Avoid the unrelated Kyrgyz Asman logo. | Generic. |
| قشم‌ایر / QSM | [Airline site](https://www.qeshm-air.com/web2/) identifies the carrier; a [Commons copyright notice](https://commons.wikimedia.org/wiki/User_talk:Faridsabet) exists for the old Qeshm logo upload. No reviewed open reuse grant found. | Generic. |
| کیش‌ایر / Y9 | [Official channel](https://t.me/s/KishAir) identifies kishairlines.ir; the site was not retrievable during this review. Logo-provider downloads carry separate commercial/noncommercial terms, not an unconditional reuse license. | Generic. |
| کاسپین / CPN, IV in reference | [Airline's company page](https://www.linkedin.com/company/caspianairlines) and [official publication](https://caspian.aero/Files/CaspianFileManager/064718ee62b34fa7b473b002534cbfcb.pdf) identify the company; no reviewed reusable mark license found. | Generic; do not infer identity from reference IV alone. |
| وارش / VRH, VR | [Airline company page](https://www.linkedin.com/company/varesh-airlines) identifies varesh.aero; the site could not be retrieved. No reviewed reusable logo grant found. | Generic. |
| سپهران / SHI, SR | [Official branded publication](https://blog.flysepehran.com/wp-content/uploads/2023/04/flysepehran19.pdf) confirms the mark; [Commons discussion](https://commons.wikimedia.org/wiki/User_talk:Hanooz/Archive_2) records copyright concerns for an older upload. | Generic. |
| فلای پرشیا / FP | [Airline domain](https://flypersia.aero/) appears in airline references. Search also returned an explicitly unused designer proposal and unrelated company trademarks; neither verifies a reusable airline mark. | Generic. |
| هواپیمایی مهر / MH | No license-backed official mark was verified. The stored MH code is not used to load Malaysia Airlines artwork. | Generic. |
| جی اسکای / JS | No license-backed official mark was verified. The reference code/name is retained without assigning a different international airline's logo. | Generic. |
| ایران ایرتور / B9 | [Commons copyright notice](https://commons.wikimedia.org/wiki/User_talk:Faridsabet) for an old upload; an Iran Air Homa mark must not be substituted for Iran Airtour. | Generic. |
| نسیم ایر / NA | [FAA designator list](https://www.faa.gov/air_traffic/publications/atpubs/cnt_html/chap3_section_2.html) identifies Nasim Airlines; no reviewed reusable logo found. | Generic. |
| آوا ایر / AA | No license-backed Iranian AVA logo verified. Do not map AA to American Airlines. | Generic. |
| آساجت / SJ | [Airline company page](https://www.linkedin.com/company/asajetairlines) identifies asajet.ir and discusses new branding; no reusable logo grant verified. | Generic. |
| پارس ایر / PA | No reviewed reusable mark license; multiple historical entities called Pars Air appear in searches. No identity inferred from PA alone. | Generic. |

A failed image load also restores the generic glyph without hiding the name.
`airlineLogoFor(id, name)` first resolves the supplied stable code and then
requires an agreeing reviewed name alias. Persian/Arabic kaf and yeh, alef
maksura, optional diacritics, tatweel, whitespace, zero-width and bidi formatting
characters normalize only for this presentation lookup. Full-width ASCII codes
normalize through Unicode NFKC. Formal reviewed aliases include Iran Air’s
Persian corporate name and Air1Air’s accented Persian name. Unknown/mismatched codes deliberately return no image.
Name-only lookup is allowed only for exact reviewed aliases when the code is
absent; substring, fuzzy, airport and flight-number matching are not used.

## Six-item follow-up audit — 2026-10-16

All 11 authored-demo entries and every record in both imported reference JSON
files were checked against the actual resolver and public files. There were no
existing fixture code/name mismatches hiding one of the original five logos.
The improvement adds **Air1Air / اروان** after completing its Commons rights
review and hardens known Unicode/formal aliases without fuzzy matching. The
result is **six verified local logo identities and 15 explicit fallbacks**.
`A1` remains the stored reference alias; this change does not certify it as an
IATA or ICAO designator. No operating identifiers or fixture values were edited.

### Qeshm Air priority result: access and permission remain missing

Qeshm Air’s authored record is consistently `QSM` / `قشم‌ایر`. Its missing image
is an **asset and reuse-permission gap**, not a whitespace or code mismatch.
It deliberately remains generic in all shared identity presentations. This
portion of requirement 4 is therefore **not claimed as complete**.

Fresh evidence checked for this follow-up:

- The [official website](https://www.qeshm-air.com/web2/) timed out during the
  review, and no inspectable logo reuse grant or licensed downloadable brand
  pack was found. A publicly displayed mark is not itself a grant to redistribute.
- The [old Commons logo warning](https://commons.wikimedia.org/wiki/User_talk:Faridsabet)
  identifies copyright concerns with the old `Qeshm Air Logo.jpg` upload.
  Accessible [CC0 aircraft photography](https://commons.wikimedia.org/wiki/File:Qeshmair_iranian_aircraft.jpg)
  is not a separately verified logo asset or a grant over underlying brand art.
  Neither the photograph nor another Qeshm carrier’s logo was substituted.
- [Airhex’s Qeshm page](https://airhex.com/airline-logos/qeshm-air/) advertises
  personal/editorial evaluation options, but the current [Terms of Use](https://airhex.com/terms/)
  (updated 2026-07-11) require written permission for collecting/copying images
  and limit licensed files to an agreement’s scope. No written grant was provided;
  no preview images, downloads or endpoints were extracted.
- [StickPNG’s Qeshm asset](https://www.stickpng.com/img/icons-logos-emojis/international-airlines/qeshm-airlines-logo)
  states personal use only, disallows commercial use and retains the depicted
  owners’ copyright. It does not establish a suitable redistributable grant for
  this project’s image bundle.

To replace this fallback, provide either a Qeshm Air brand file with explicit
permission for local storage, web display and ticket/PDF export, or a verified
repository asset with a compatible license and required credits. No paid access,
requests to the airline, account agreements or uncertain fair-use assumptions
were initiated. The same explicit-source requirement applies to the 14 other
remaining fallback identities listed above.

The focused suite now contains **36 passing tests**, including every actual
fixture identity, all local file hashes/dimensions, stable-code-first matching,
formal/Unicode aliases, incompatible IDs and unknown-name safeguards. Focused
ESLint passed. These are current targeted results; parent-task combined checks
remain separate.

## Filled icon decisions

The installed Lucide package supplies stroke glyphs rather than a separate solid
set. No extra icon package was installed. `filled-icons.tsx` supplies small
project-authored solid silhouettes on the same 24px coordinate grid for the
existing semantic imports: home, users, cards, tickets, aircraft, takeoff,
landing, menus, calendar, luggage, time, info/help, search, filtering, lock,
download, seller/store and removal. Even-odd paths preserve cutouts; no arbitrary
Lucide path receives blanket fill. Generic Plane keeps the library's northeast
orientation so the existing RTL route rotation remains correct. Takeoff and
landing have distinct sloped silhouettes above their shared runway baseline.

Arrow/chevron, close, check, comparison and other unreviewed imports retain clear
strokes where a convincing solid equivalent is absent. This is the intentional
fallback permitted by requirement 5, preserving meaning and optical clarity.
All icons remain decorative within controls that already own accessible labels;
SVGs are `aria-hidden`, not separately focusable, with stable size/current color.
`data-icon-style` and `data-icon-name` support semantic browser verification.

## Verification boundary

Targeted tests cover reviewed alias lookup, mismatched/unknown identities,
unmodified asset integrity and dimensions, reference-code traps, fallback
presentation, accessible names, and solid/outline icon semantics. Combined lint,
type checks, responsive visual review and build are recorded by the parent task
after integration; this document does not reuse previous iteration counts.

The completed six-item follow-up passed combined lint, TypeScript, 513 unit
tests, production build and all 121 production-browser tests. All six local
image files decode successfully; actually eligible demo/reference results and
failed-image fallbacks were checked without promoting unavailable records.
[UI-BRANDING-FIXES.md](UI-BRANDING-FIXES.md) contains final results, file inventory
and saved visual/PDF evidence. Qeshm's permission gap above remains unresolved.
