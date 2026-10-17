# AI Assistant UI refinements — 2026-10-16

> **Purchase-flow update — 2026-10-17:** [METASEARCH.md](METASEARCH.md) supersedes only the internal checkout, issuance, ticket/PDF credits and related verification references in this record. Those capabilities are removed; flight selection continues through details to verified external seller destinations. Current assistant styling, preference reload/collapse refinements, About/source-linked credits, conversation and recommendation behavior remain in force.

This is a targeted presentation update. The user's latest attachment explicitly
authorizes a soft lavender identity for AI navigation and conversational text,
including one restrained gradient. This is a scoped exception to the existing
visual rules, not a replacement design system. Root `DESIGN.md`, Yekan Bakh,
brand-red CTAs, RTL, spacing/radii, semantic history colors, data and all product
services remain authoritative and unchanged.

## Requirements 01–06

| Requirement | Completed implementation |
| --- | --- |
| 01 — Attached entry | Regular search only: tab shares the search panel's exact outer RTL right edge and meets its top border with a one-pixel seam overlap. A zero-height local rail anchors the tab above the panel; parent overflow stays visible. Space above is reserved with the existing 48px token. The upper-right contour belongs to the tab, with the other three panel corners retaining their radii. Trip-type controls are unchanged and do not overlap it. |
| 02 — AI identity | Shared scoped CSS variables provide the requested 120deg `#F6F1FF` / `#EDE7FF` / `#E8EDFF` gradient, darker hover/pressed variants, `#7956C8` solid Sparkles and `#442879` text. Gap 8px, horizontal padding 24px, minimum 48px height. No red background or underline. Keyboard focus is visible; reduced motion disables the subtle transition. |
| 03 — Conversation | The introductory title remains on welcome only. Text messages are rounded selectable bubbles: neutral user messages on the right, `#F5F0FF` assistant messages on the left. Maximum readable width, multiline preservation and bidi handling remain; visible role headings and avatars are absent. Accessible list-item labels identify roles without visual decoration. Preferences, flight cards, conflicts and booking controls remain full-width independent blocks. |
| 04 — Apply | Existing action now reads `اعمال ترجیحات` and reuses the brand primary button, white text, pill radius, hover, focus and disabled states. `aria-busy` and the existing progress label expose loading. It invokes the same intent validator and deterministic recommendation request; it makes no LLM call. Existing explicit edits, session state and reranking behavior are preserved. |
| 05 — Cleanup | Removed the logo disclaimer/license dialog, all rendered provider configuration/model status lines, unset-budget chip, empty chip wrappers and unused styling. Actual provider failures still arrive as truthful conversation bubbles. Real numeric budgets remain visible and editable; the expanded budget/conditions editor remains available even without a budget. |
| 06 — Destination page | Removed the repeated raised tab, Sparkles and underline from `/ai-assistant`, along with reserved tab space. The content has a clean rounded border. Back navigation, welcome suggestions, chat, composer and all functional result blocks remain. |

## Logo credits

The four existing verified logo files and central metadata are unchanged. Each
welcome logo now links to its actual source page and carries its recorded author,
license and unchanged-use attribution through the accessible link name and title.
The shared image also retains its existing attribution title. These are real
source/credit links, not airline-selection controls or partnership claims.
Required credit access therefore stays available without a separate notice or
dialog interrupting the assistant. Full sources/licenses remain in
`src/data/airline-branding.ts`, `public/airlines/NOTICE.md`, `docs/AIRLINE_LOGOS.md`
and the existing About/ticket/PDF credit locations. No asset was downloaded,
recolored, cropped or substituted; no new permission claim is made.

## Modified files

- `src/components/assistant-entry.tsx`, `assistant-entry.module.css`:
  regular-search-only entry and joined contour/interaction states.
- `src/components/flight-explorer.tsx`: attaches the scoped panel class; ordinary
  form, values, trip tabs and search logic are unchanged.
- `src/components/ai-assistant.tsx`: removes internal tab, active-chat heading and
  rendered diagnostics; existing hooks/state/services remain intact.
- `src/components/assistant/ai-identity.module.css`: shared scoped AI colors.
- `src/components/assistant/assistant-welcome.tsx`: clean introduction and actual
  source-credit links in the logo row.
- `src/components/assistant/conversation.tsx`, `assistant.module.css`: accessible
  opposing chat bubbles, readable mixed text and removal of unused style rules.
- `src/components/assistant/travel-preferences.tsx`, `travel-preferences.module.css`:
  primary Apply, loading semantics and supplied-value-only condition chips.
- `tests/e2e/assistant.spec.ts`, `assistant-booking.spec.ts`: updated accessible
  labels, layout and interaction assertions, preserved booking coverage.
- `AGENTS.md`, `README.md`, `docs/AI_ASSISTANT.md`, this document: current scope,
  design exception and verification.

No provider integration, environment variable, server route, domain model,
natural-language normalization, deterministic score/explanation algorithm,
flight fixture, money/date/history logic, booking service, font or global
stylesheet was changed. No dependency was added. No real OpenAI request was made.

## Verification

ESLint, TypeScript, production build, **675 unit tests across 27 files** and
**all 139 production-browser tests** pass (one worker, 2.8 minutes). This includes
the updated six-width tab/welcome/chat checks, quota/unavailable and controlled
conversational protocol cases, actual comparison/checkout/local issuance flows,
the new functional Apply case and every existing regression.

Responsive checks cover **375, 430, 768, 1024, 1440 and 1920px**. They assert the
exact tab seam/right edge, no trip-control overlap or horizontal overflow,
gradient/color/solid icon, absence of the internal tab and technical placeholders,
loaded logos, multiline Persian/English bubble geometry and actual composer use.
The Apply test validates empty inputs without search, checks primary/enabled/
disabled/loading behavior, requests real deterministic results with the selected
preferences, repeats refinement, and asserts **zero LLM requests**. The isolated
test server continues disabling real credentials; mocked conversation responses
do not certify external model inference.

Screenshots of regular search, welcome and conversation were visually reviewed
at mobile, tablet and desktop widths. All 21 current assistant captures are saved
under `docs/screenshots/ai-ui-refinements/`, including:

- [375px attached tab](screenshots/ai-ui-refinements/assistant-regular-tab-375.png)
- [1440px attached tab](screenshots/ai-ui-refinements/assistant-regular-tab-1440.png)
- [375px welcome](screenshots/ai-ui-refinements/assistant-welcome-375.png)
- [430px conversation](screenshots/ai-ui-refinements/assistant-conversation-430.png)
- [1440px conversation](screenshots/ai-ui-refinements/assistant-conversation-1440.png)

Scoped color calculations give a minimum 8.16:1
tab-text contrast across all declared gradient stops and 15.60:1 assistant-text
contrast on its bubble surface. Existing primary-button color/contrast behavior
is reused exactly. Mobile keyboard behavior remains covered through browser
viewport emulation rather than a physical device.

The prior OpenAI quota/billing limitation is unchanged. This visual iteration
does not assert successful real Persian inference. The [activation report](OPENAI_ACTIVATION.md)
retains the exact external result and required account-side follow-up.

## Follow-up — Hero-to-tab clearance

The only runtime change in this follow-up is the search panel's positive
`margin-block-start: calc(var(--spacing-48) + var(--spacing-24))`: 48px reserves
the protruding tab and 24px supplies visual clearance. Chrome measured a 25px
Hero-bottom-to-tab-top gap at 375/430/768/1024/1440px (including the border seam),
with the same 1px tab/panel seam overlap, exact right-edge alignment and no
horizontal overflow. Switching one-way/round-trip did not change these values.
Mobile and desktop captures were visually reviewed; lint, TypeScript and build
pass. The earlier 675-unit/139-browser totals above belong to the prior UI
delivery and were not rerun for this isolated spacing change. Tab styling,
positioning, controls and functionality remain unchanged.

## Follow-up — Preference reload and collapsed default (2026-10-17)

The assistant now hydrates the latest validated same-mode session snapshot
through React's external-store hydration boundary, instead of restoring an old
component snapshot on an animation frame. Current manual/AI edits remain the
authoritative intent and are persisted through the existing preference-only
store. One canonical intent supplies the summary, controls and recommendation
request. Server-rendered defaults are not presented as restored values while
the browser snapshot is pending; editing waits until it is ready. No reload
triggers an AI call or automatic recommendation search.

Restoration checks date selections against the fresh source context and Tehran
date boundary. Expired/out-of-range selections are cleared without inventing
replacement dates; invalid return ordering clears only the return. The associated
obsolete date locks are removed while valid routes, passengers, canonical budget,
conditions, priorities and manual confirmations remain. Imported reference mode
retains its intentional valid historical date. Corrupt or other-mode snapshots
fall back to honest empty/default preferences; read failures retain manual
recovery and are not silently treated as successful restoration.

The dropdown initializes closed and only its native `ترجیحات سفر` trigger toggles
it. Restoring/synchronizing preferences, validation, AI failures, recommendations
and suggested prompts do not open it. Result refinement returns focus to the
trigger. All editable chips/fields and the primary `اعمال ترجیحات` action are
inside the mounted hidden body; collapsing does not clear them. Existing
`aria-expanded`, chevron rotation, Enter/Space keyboard behavior, request guards,
ranking, conversation, source modes and checkout remain unchanged.

Runtime files: `src/components/ai-assistant.tsx`,
`src/lib/assistant-session.ts`,
`src/components/assistant/travel-preferences.tsx` and its CSS module.
Tests: `tests/assistant-session.test.ts`, `tests/e2e/assistant.spec.ts` and
`tests/e2e/assistant-booking.spec.ts`. No provider, environment, route,
ordinary-search, fixture, money or ranking implementation changed.

Lint, TypeScript, production build and **681 unit tests** pass. The production
browser run passed 142 of 144 cases; two new cases expected the old shortened
Tehran name instead of the existing `تهران (مهرآباد)` catalog label. Correcting
those test expectations and rerunning both cases passed. All 144 cases therefore
passed across the full run and focused rerun, including five new reload/collapse
cases and the existing conversation/manual/booking regressions.

Additional production-browser checks at 375px and 1440px restored saved adult
count and budget, remained collapsed before and after reload, and recorded zero
assistant API POSTs, hydration errors, horizontal overflow or initial cumulative
layout shift. Reviewed captures: [375px](screenshots/preferences-refresh/collapsed-375.png)
and [1440px](screenshots/preferences-refresh/collapsed-1440.png). Keyboard checks
use browser automation; no external model inference was requested.

## Follow-up — Remove the collapsed trip summary (2026-10-17)

The Travel Preferences header now contains only the existing icon, title and
chevron. The route/date/passenger summary, its wrapper and its unused styles
are removed. This supersedes the earlier summary presentation above; canonical
preferences, persistence, collapsed default, editable fields, condition chips
inside the expanded body, Apply and recommendations are unchanged. The outer
surface, padding, RTL alignment and trigger spacing retain existing tokens.

Verification: lint and TypeScript pass. Six focused browser regressions pass
against the local development preview, including Apply, reload, saved edits and
invalid-session recovery. Additional 375px/1440px checks confirm only the
trigger is visible when collapsed, right alignment follows the unchanged
12px/16px padding, the 16px radius remains, Apply appears on expansion, and
reload stays closed with no horizontal overflow or page errors. No model API
requests were made. This presentation-only follow-up did not rerun the earlier
production build or full unit/browser suites.
