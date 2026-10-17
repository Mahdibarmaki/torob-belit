import "server-only";

export class AssistantHttpError extends Error {
  constructor(message: string, readonly status = 400, readonly code = "INVALID_REQUEST") { super(message); }
}

export function assistantJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

/** Bound the bytes actually read, including chunked requests without Content-Length. */
export async function readAssistantJson(request: Request): Promise<unknown> {
  const origin = request.headers.get("origin");
  if (origin) {
    const target = new URL(request.url);
    let sameOrigin = origin === target.origin;
    try {
      // Next's local server may expose an internal localhost URL while the browser uses 127.0.0.1.
      // Host is the actual browser target; do not trust an arbitrary forwarded-host header.
      const browserOrigin = new URL(origin);
      sameOrigin ||= browserOrigin.origin === origin && browserOrigin.host === request.headers.get("host") && browserOrigin.protocol === target.protocol;
    } catch { /* An invalid Origin cannot be authorized. */ }
    if (!sameOrigin) throw new AssistantHttpError("درخواست از این مبدأ مجاز نیست.", 403, "INVALID_ORIGIN");
  }
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") throw new AssistantHttpError("بدنه JSON لازم است.", 415, "INVALID_CONTENT_TYPE");
  const limit = 16 * 1024;
  if (Number(request.headers.get("content-length")) > limit) throw new AssistantHttpError("درخواست بیش از حد طولانی است.", 413, "REQUEST_TOO_LARGE");
  if (!request.body) throw new AssistantHttpError("بدنه درخواست خالی است.");
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0; let text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new AssistantHttpError("درخواست بیش از حد طولانی است.", 413, "REQUEST_TOO_LARGE"); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof AssistantHttpError) throw error;
    throw new AssistantHttpError("JSON خوانا و معتبر لازم است.");
  } finally { reader.releaseLock(); }
}

export function assistantHttpFailure(error: unknown) {
  if (error instanceof AssistantHttpError) return assistantJson({ ok: false, error: { code: error.code, message: error.message } }, error.status);
  if (error instanceof TypeError || error instanceof RangeError) return assistantJson({ ok: false, error: { code: "INVALID_PREFERENCES", message: "ترجیحات سفر معتبر نیست؛ انتخاب‌ها را بررسی کنید." } }, 422);
  return assistantJson({ ok: false, error: { code: "ASSISTANT_ERROR", message: "بررسی سفر انجام نشد؛ انتخاب‌ها و پیام شما حفظ شده‌اند. دوباره تلاش کنید." } }, 500);
}
