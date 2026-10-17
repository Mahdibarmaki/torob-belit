import { parseTravelIntent } from "@/domain/assistant-intent";
import { recommendAssistantFlights } from "@/application/assistant-recommendations";
import { executeSearch } from "@/server/search";
import { assistantDateContext } from "@/server/assistant-context";
import { assistantHttpFailure, assistantJson, AssistantHttpError, readAssistantJson } from "@/server/assistant-http";

export async function POST(request: Request) {
  try {
    const body = await readAssistantJson(request);
    if (!body || typeof body !== "object" || Array.isArray(body) || !("intent" in body) || Object.keys(body).some((key) => !["intent", "pinnedOutbound"].includes(key))) throw new AssistantHttpError("ترجیحات ساختاریافته سفر لازم است.");
    const intent = parseTravelIntent(body.intent);
    const context = assistantDateContext(intent.mode);
    let pinnedOutbound: { flightId: string; offerId: string } | undefined;
    if ("pinnedOutbound" in body && body.pinnedOutbound !== undefined && body.pinnedOutbound !== null) {
      const value = body.pinnedOutbound;
      if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((key) => !["flightId", "offerId"].includes(key)) || !("flightId" in value) || !("offerId" in value)
        || typeof value.flightId !== "string" || typeof value.offerId !== "string" || !value.flightId || !value.offerId || value.flightId.length > 500 || value.offerId.length > 500) throw new AssistantHttpError("انتخاب پرواز رفت معتبر نیست.");
      pinnedOutbound = { flightId: value.flightId, offerId: value.offerId };
    }
    const data = await recommendAssistantFlights(intent, { context, search: executeSearch, ...(pinnedOutbound ? { pinnedOutbound } : {}) });
    return assistantJson({ ok: true, data, context });
  } catch (error) { return assistantHttpFailure(error); }
}
