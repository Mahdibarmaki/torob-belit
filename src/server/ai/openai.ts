import "server-only";
import type { AssistantDateContext, TravelIntent } from "@/domain/assistant-intent";
import type { AssistantInterpretRequest, AssistantInterpretation, AssistantProviderStatus } from "@/domain/assistant-provider";
import { AIRPORTS } from "@/data/airports";
import { IRANIAN_AIRLINES } from "@/data/airlines";
import { TRAVEL_INTERPRETATION_INSTRUCTIONS, TRAVEL_PATCH_SCHEMA } from "./contract";
import { normalizeModelInterpretation } from "./validation";

const ENDPOINT = "https://api.openai.com/v1/responses";
const TIMEOUT_MS = 12_000;
const MAX_RESPONSE_BYTES = 64 * 1024;
interface ProviderConfiguration { apiKey: string; model: string }

export function openAIConfiguration(env: Record<string, string | undefined> = process.env): ProviderConfiguration | null {
  const apiKey = env.OPENAI_API_KEY?.trim(); const model = env.OPENAI_MODEL?.trim();
  return apiKey && apiKey.length <= 4096 && model && /^[a-zA-Z0-9._:-]{1,100}$/u.test(model) ? { apiKey, model } : null;
}

export function assistantProviderStatus(): AssistantProviderStatus {
  const config = openAIConfiguration();
  return { provider: "openai", configured: !!config, model: config?.model ?? null };
}

/** No IP/user identifiers or prompt text are retained. This is a local-process guard only. */
export function createInterpretationLimiter(maxPerMinute = 20, maxConcurrent = 2) {
  let windowStart = 0; let count = 0; let active = 0;
  return {
    acquire(now = Date.now()): (() => void) | null {
      if (now - windowStart >= 60_000) { windowStart = now; count = 0; }
      if (active >= maxConcurrent || count >= maxPerMinute) return null;
      active++; count++; let released = false;
      return () => { if (!released) { active--; released = true; } };
    },
  };
}
const processLimiter = createInterpretationLimiter();

const MESSAGES = {
  unavailable: "تفسیر زبان طبیعی در دسترس نیست؛ ترجیحات ساختاریافته و پیشنهادهای محاسبه‌شده همچنان قابل استفاده‌اند.",
  authentication: "احراز هویت سرویس هوش مصنوعی انجام نشد؛ کلید API باید در تنظیمات سرور بررسی شود. انتخاب‌های دستی حفظ شده‌اند.",
  quota: "اعتبار یا سقف هزینه سرویس هوش مصنوعی کافی نیست؛ اعتبار و محدودیت پروژه باید بررسی شود. پیشنهادهای ساختاریافته فعال‌اند.",
  configuration: "دسترسی مدل یا تنظیمات درخواست سرویس هوش مصنوعی نیاز به بررسی دارد؛ می‌توانی با ترجیحات دستی ادامه بدهی.",
  error: "ارتباط با سرویس تفسیر انجام نشد؛ پیام و انتخاب‌هایت حفظ شده‌اند. دوباره تلاش کن یا ترجیحات را دستی تنظیم کن.",
  timeout: "زمان پاسخ سرویس تفسیر تمام شد؛ انتخاب‌هایت حفظ شده‌اند و می‌توانی دستی ادامه بدهی.",
  invalid: "پاسخ سرویس با ساختار معتبر سفر سازگار نبود؛ هیچ تغییری در انتخاب‌هایت اعمال نشد.",
  refused: "سرویس این پیام را تفسیر نکرد؛ فقط ترجیحات پرواز را بنویس یا از انتخاب‌های دستی استفاده کن.",
  limited: "تعداد درخواست‌های تفسیر فعلاً به سقف رسیده؛ کمی بعد تلاش کن یا ترجیحات را دستی تنظیم کن.",
} as const;

function unchanged(state: keyof typeof MESSAGES, intent: TravelIntent, model: string | null): AssistantInterpretation {
  return { state, intent, patch: {}, conflicts: [], question: null, message: MESSAGES[state], needsClarification: false, model };
}

async function boundedJson(response: Response): Promise<unknown> {
  if (Number(response.headers.get("content-length")) > MAX_RESPONSE_BYTES || !response.body) throw new TypeError("Invalid provider response");
  const reader = response.body.getReader(); const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0; let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new TypeError("Provider response too large"); }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { reader.releaseLock(); }
}

/** Inspect bounded error codes only; never return or log the provider's raw message/body. */
async function httpFailureState(response: Response): Promise<keyof typeof MESSAGES> {
  if (response.status === 401) { await response.body?.cancel(); return "authentication"; }
  if (response.status === 403 || response.status === 404) { await response.body?.cancel(); return "configuration"; }
  if (response.status !== 429 && response.status !== 400) { await response.body?.cancel(); return "error"; }
  let code: unknown; let type: unknown;
  try {
    const body = await boundedJson(response);
    if (body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object") {
      code = "code" in body.error ? body.error.code : undefined;
      type = "type" in body.error ? body.error.type : undefined;
    }
  } catch { /* An absent, malformed or oversized error body is never surfaced. */ }
  const quotaCodes = ["insufficient_quota", "billing_hard_limit_reached", "billing_not_active", "usage_limit_reached",
    "organization_spend_limit_exceeded", "project_spend_limit_exceeded", "organization_usage_limit_exceeded"];
  if (quotaCodes.includes(String(code)) || type === "insufficient_quota") return "quota";
  if (response.status === 429) return "limited";
  return code === "invalid_json_schema" ? "invalid" : "configuration";
}

function responseText(value: unknown): { refused: boolean; text: string | null } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Invalid response");
  const row = value as Record<string, unknown>;
  if (row.status !== "completed" || !Array.isArray(row.output) || row.output.length > 10) throw new TypeError("Incomplete response");
  const texts: string[] = [];
  for (const output of row.output) {
    if (!output || typeof output !== "object" || Array.isArray(output)) throw new TypeError("Invalid output");
    const item = output as Record<string, unknown>;
    // Reasoning items carry no user-facing data. Tool calls are never allowed.
    if (item.type === "reasoning") continue;
    if (item.type !== "message" || item.role !== "assistant" || !Array.isArray(item.content)) throw new TypeError("Unexpected output item");
    for (const block of item.content) {
      if (!block || typeof block !== "object" || Array.isArray(block)) throw new TypeError("Invalid content");
      const content = block as Record<string, unknown>;
      if (content.type === "refusal") return { refused: true, text: null };
      if (content.type !== "output_text" || typeof content.text !== "string") throw new TypeError("Unexpected content");
      texts.push(content.text);
    }
  }
  if (texts.length !== 1 || texts[0].length > 16_000) throw new TypeError("One bounded structured result required");
  return { refused: false, text: texts[0] };
}

interface InterpretationDependencies {
  config?: ProviderConfiguration | null;
  fetch?: typeof globalThis.fetch;
  limiter?: ReturnType<typeof createInterpretationLimiter>;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/** One interpretation call, no retries, tools, flight data, booking data, logging or stored conversation. */
export async function interpretTravelRequest(input: AssistantInterpretRequest, context: AssistantDateContext, dependencies: InterpretationDependencies = {}): Promise<AssistantInterpretation> {
  const config = dependencies.config === undefined ? openAIConfiguration() : dependencies.config;
  if (!config) return unchanged("unavailable", input.intent, null);
  const release = (dependencies.limiter ?? processLimiter).acquire();
  if (!release) return unchanged("limited", input.intent, config.model);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const onAbort = () => controller.abort();
  dependencies.signal?.addEventListener("abort", onAbort, { once: true });
  if (dependencies.signal?.aborted) controller.abort();
  try {
    const work = async (): Promise<AssistantInterpretation> => {
      const { mode: _, ...preferences } = input.intent; void _;
      const data = {
        currentDateContext: context, userBudgetConvention: { defaultUnit: "toman", scope: "whole-party" }, preferences, confirmedFields: input.confirmedFields,
        airportAllowlist: AIRPORTS.map(({ code, city, name }) => ({ code, city, name })),
        airlineAllowlist: IRANIAN_AIRLINES.map(({ id, name, englishName }) => ({ id, name, englishName })),
        conversation: input.history ?? [], latestMessage: input.message,
      };
      let response: Response;
      try { response = await (dependencies.fetch ?? globalThis.fetch)(ENDPOINT, {
        method: "POST", headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.model, store: false, max_output_tokens: 2500,
          ...(config.model === "gpt-5.6-luna" ? { reasoning: { effort: "none" } } : {}),
          instructions: TRAVEL_INTERPRETATION_INSTRUCTIONS,
          input: [{ role: "user", content: [{ type: "input_text", text: JSON.stringify(data) }] }],
          text: { format: { type: "json_schema", name: "travel_preference_patch", strict: true, schema: TRAVEL_PATCH_SCHEMA } },
        }), signal: controller.signal, cache: "no-store", redirect: "error",
      }); } catch { throw new Error("Provider transport unavailable"); }
      if (!response.ok) {
        return unchanged(await httpFailureState(response), input.intent, config.model);
      }
      const result = responseText(await boundedJson(response));
      if (result.refused) return unchanged("refused", input.intent, config.model);
      return normalizeModelInterpretation(JSON.parse(result.text!), input, context, config.model);
    };
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { timedOut = true; controller.abort(); reject(new Error("Interpretation deadline")); }, dependencies.timeoutMs ?? TIMEOUT_MS);
    });
    return await Promise.race([work(), deadline]);
  } catch (error) {
    if (timedOut) return unchanged("timeout", input.intent, config.model);
    if (controller.signal.aborted) return unchanged("error", input.intent, config.model);
    return unchanged(error instanceof TypeError || error instanceof RangeError || error instanceof SyntaxError ? "invalid" : "error", input.intent, config.model);
  } finally {
    if (timer) clearTimeout(timer);
    controller.abort(); dependencies.signal?.removeEventListener("abort", onAbort); release();
  }
}
