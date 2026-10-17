# AI interpretation provider

The assistant uses deterministic search and recommendation services for every
flight, fare and explanation. An optional server-side OpenAI Responses adapter
only interprets travel preferences. It cannot invent inventory, alter source mode,
call tools, book flights or generate the flight-ranking explanation.

## Configuration and current verification

Set `OPENAI_API_KEY` and `OPENAI_MODEL` in a local server environment such as
`.env.local`. Both are required; there is no inferred model or client-side key.
Choose a model available to the configured OpenAI project that supports the
Responses API and strict JSON-schema structured outputs. Restart the server after
changing environment variables. No new SDK dependency is required.

The initial implementation had no credentials. In the subsequent activation
check on 2026-10-16, the user-supplied key authenticated against the official
model-list endpoint; `gpt-5.6-luna` was listed and selected explicitly in the
ignored local environment. The real Persian interpretation request returned a
quota/billing failure, **not a successful model interpretation**. No extracted
intent or successful inference is claimed. [OPENAI_ACTIVATION.md](OPENAI_ACTIVATION.md)
records the actual check and remaining account-side requirement. Mocked provider
tests do not establish model quality or successful real operation.
`configured: true` means the required variables are present,
not that the model has answered successfully. With either variable missing,
the API returns `unavailable`, an empty patch and unchanged preferences; it does
not simulate a successful language interpretation. Manual controls and the
deterministic recommendation endpoint remain available.

## API contract

`GET /api/assistant/interpret` returns a safe configuration-status object.

`POST /api/assistant/interpret` accepts only:

```ts
{
  message: string; // 1–2000 characters
  intent: TravelIntent;
  confirmedFields: IntentField[];
  history?: { role: "user" | "assistant"; content: string }[];
}
```

Its successful HTTP response is `{ ok: true, data: AssistantInterpretation,
context: AssistantDateContext }`. Semantic states are `interpreted`, `unavailable`,
`authentication`, `quota`, `configuration`, `error`, `timeout`, `invalid`,
`refused` and `limited`; failures preserve current
preferences. Invalid requests use the shared typed HTTP failure envelope. Responses
are `no-store`. Only safe, locally authored messages/questions are displayed;
raw provider prose, errors and refusal text are never returned to the browser.

HTTP 401 becomes `authentication`; 403/404 becomes `configuration` (access/model).
Bounded error-code/type inspection separates 429 billing/quota failures from
transient `limited` rate limits. HTTP 400 `invalid_json_schema` becomes `invalid`;
other request-setting errors become `configuration`. HTTP 5xx/network failures
remain `error`; deadlines are `timeout`. Only locally authored messages are
exposed, without the raw provider message, body or key. Failures are not retried.
The existing UI displays these messages and preserves structured recommendations.

## Interpretation and state boundaries

The fixed schema requires every transport field. Null means **no change**.
`clearFields` is a separate allowlist for explicit removal of a preference.
Nested unknown fields, unsupported currencies, invalid numeric limits, mismatched
dates and source changes fail runtime validation. Contradictory clear-and-set
operations fail validation instead of silently choosing one.

The model receives a bounded airport/airline allowlist, current structured travel
preferences, confirmed field names, an explicit server clock with `Asia/Tehran`,
date bounds, the latest message and at most the last six history items. Source
mode is omitted. Messages are supplied as untrusted data, separate from fixed
instructions. No flight records, passenger records, booking documents or tools
are supplied. The server normalizes city/code mentions against the existing
airport list; Tehran can require an explicit airport. Date mentions are converted
by the shared deterministic Jalali/ISO/relative-date utility. Bare weekdays and
weekends ask for clarification instead of choosing an arbitrary date. Unknown or
past dates cannot quietly replace the prior valid date. Consumers must honor
`needsClarification` before searching.

The UI's user-budget convention is explicitly **Toman**, matching all existing
price and budget controls. Thus «زیر سه میلیون» means 3,000,000 Toman for the
default single adult, and the editable summary exposes that interpretation.
This user-input convention never changes the rule against guessing unknown
provider price units from amounts. Budgets carry a `rial`, `toman` or `unspecified`
transport tag. Toman numeric text uses the existing lossless parser exactly once;
explicit rial text becomes safe canonical rials without conversion. Unsupported
foreign currencies, mixed currencies and ambiguous multiple-passenger
total/per-person scope require a question; no exchange rate or magnitude-based
unit inference is permitted. Unsupported children/infants
remain explicit and block the adult-only flow rather than becoming adults.

Confirmed manual selections remain locked. A model proposal that changes one
returns its patch and typed conflicts, preserving the current selected value.
The UI must obtain explicit acceptance before applying the conflicting proposal.
Unmentioned fields remain untouched during conversational refinement.

## Transport and privacy controls

- The only destination is the fixed `https://api.openai.com/v1/responses`; redirects
  are rejected and no custom base URL is accepted.
- Strict `text.format` JSON-schema output, `store: false`, no tools, a bounded
  output-token setting and a 12-second total deadline apply. There are no automatic
  retries, preventing duplicate billed requests.
- Every enum/constant has an explicit schema type. The selected `gpt-5.6-luna`
  requests `reasoning.effort: none` for bounded extraction latency/cost. This
  setting is not sent to arbitrary configured models. There is no silent model
  switch or fallback when access/quota fails.
- Responses are streamed into a maximum 64 KiB buffer. Incomplete output, invalid
  JSON/schema, tool output, refusals and oversized output cannot change preferences.
- The existing shared request reader caps actual bytes at 16 KiB and validates
  content type/origin. Message content is at most 2000 characters. Accepted history
  is at most 20 items; only six are sent, each truncated to 1000 characters.
- A process-local guard permits at most 20 model calls per minute and two in flight.
  It retains counts only, without IP addresses, prompt text or user identifiers.
  This is a local-demo protection; it is not distributed rate limiting,
  authentication or production abuse protection. Shared user-account limits,
  distributed throttling and budget monitoring are required before public rollout.
- A conservative server screen rejects obvious identity-document, contact and
  payment content in the latest message **and all accepted history**, before any
  provider request. This heuristic cannot detect every form of personal data;
  the UI must continue warning users to send travel preferences only.
- No request text, raw provider body, API key, passenger document or conversation
  is logged or persisted by this adapter. `store: false` is a Responses setting;
  it does not make broader promises about provider policy or account retention.

## Sources

The request shape follows the official [OpenAI Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses),
reviewed 2026-10-16. It specifies Responses `text.format` with `json_schema`, strict
validation-compatible schemas, required properties with nullable optional values,
and separate refusal handling. [Responses API reference](https://developers.openai.com/api/reference/resources/responses/methods/create)
documents response creation and storage controls. Future model selection and
account-specific availability must be checked against current official guidance.

Activation also checked the official [GPT-5.6 Luna model page](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
for Responses/Structured Outputs support, `none` reasoning and cost-sensitive
positioning, and the [API error guide](https://developers.openai.com/api/docs/guides/error-codes)
for authentication, quota and rate-limit distinctions. The user's successful
model-list request confirmed account visibility, not funded inference capacity.

## Verification

`tests/assistant-provider.test.ts` covers normalization, calendar and explicit
money units, locked multi-turn updates, invalid/unknown data, privacy screening,
transport shape, refusal/HTTP/network failures, response limits, timeouts,
process limits and the actual unavailable API route. All provider calls in this
suite are mocked. The activation follow-up passes lint, TypeScript, 675 unit
tests, production build and all 138 browser tests, including safe quota fallback.
The real call's separate quota outcome is recorded in [OPENAI_ACTIVATION.md](OPENAI_ACTIVATION.md);
this document does not claim successful live interpretation.
