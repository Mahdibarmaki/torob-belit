import { executeSearch } from "../../../server/search";
import { validateSearchRequest, ValidationError } from "../../../server/validation";
import { searchModeFromParam } from "@/application/search-mode";

const MAX_JSON_BYTES = 16 * 1024;

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

async function readJson(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new ValidationError("بدنه درخواست باید application/json باشد.", { code: "UNSUPPORTED_CONTENT_TYPE", status: 415 });
  }
  const declaredSize = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_JSON_BYTES) {
    throw new ValidationError("بدنه درخواست از ۱۶ کیبی‌بایت بزرگ‌تر است.", { code: "REQUEST_TOO_LARGE", status: 413 });
  }
  if (request.body === null) throw new ValidationError("بدنه JSON معتبر لازم است.", { code: "INVALID_JSON" });
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_JSON_BYTES) {
        await reader.cancel();
        throw new ValidationError("بدنه درخواست از ۱۶ کیبی‌بایت بزرگ‌تر است.", { code: "REQUEST_TOO_LARGE", status: 413 });
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError("بدنه JSON خوانا و معتبر لازم است.", { code: "INVALID_JSON" });
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await readJson(request);
    const mode = searchModeFromParam(typeof payload === "object" && payload !== null && "mode" in payload ? payload.mode : undefined);
    const input = validateSearchRequest(payload, { mode });
    return json({ ok: true, data: await executeSearch(input) });
  } catch (error) {
    if (error instanceof ValidationError) {
      return json({ ok: false, error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) } }, error.status);
    }
    return json({ ok: false, error: { code: "INTERNAL_ERROR", message: "جستجوی منابع انجام نشد؛ دوباره تلاش کنید." } }, 500);
  }
}
