import { describe, expect, it, vi } from "vitest";
import { AssistantHttpError, assistantHttpFailure, assistantJson, readAssistantJson } from "@/server/assistant-http";

const url = "http://localhost:3000/api/assistant/recommend";
const encoder = new TextEncoder();
function request(body: string | ReadableStream<Uint8Array> = "{}", extraHeaders: Record<string, string> = {}, target = url): Request {
  const init: RequestInit & { duplex?: "half" } = { method: "POST", body, headers: { "Content-Type": "application/json", ...extraHeaders } };
  if (body instanceof ReadableStream) init.duplex = "half";
  return new Request(target, init);
}
function chunked(chunks: Uint8Array[], onCancel = () => {}): ReadableStream<Uint8Array> {
  let index = 0;
  return new ReadableStream({ pull(controller) { if (index < chunks.length) controller.enqueue(chunks[index++]); else controller.close(); }, cancel: onCancel });
}

describe("bounded server-side assistant JSON requests", () => {
  it("accepts valid JSON with case-insensitive MIME and charset, without requiring Content-Length", async () => {
    expect(await readAssistantJson(request('{"message":"مشهد"}', { "Content-Type": "Application/JSON; charset=utf-8" }))).toEqual({ message: "مشهد" });
    expect(await readAssistantJson(request("{}"))).toEqual({});
  });
  it.each(["text/plain", "application/x-www-form-urlencoded", "multipart/form-data", "application/json-patch+json", ""]) ("rejects inappropriate content type %s", async (type) => {
    await expect(readAssistantJson(request("{}", { "Content-Type": type }))).rejects.toMatchObject({ status: 415, code: "INVALID_CONTENT_TYPE" });
  });
  it("rejects declared oversized bodies and also counts actual bytes when the declaration lies", async () => {
    await expect(readAssistantJson(request("{}", { "Content-Length": "16385" }))).rejects.toMatchObject({ status: 413, code: "REQUEST_TOO_LARGE" });
    const oversized = JSON.stringify({ text: "ا".repeat(10_000) });
    expect(oversized.length).toBeLessThan(16_384);
    expect(encoder.encode(oversized).byteLength).toBeGreaterThan(16_384);
    await expect(readAssistantJson(request(oversized, { "Content-Length": "1" }))).rejects.toMatchObject({ status: 413, code: "REQUEST_TOO_LARGE" });
  });
  it("accepts exactly 16KiB and rejects one additional byte in a chunked body", async () => {
    const exact = JSON.stringify({ x: "a".repeat(16_384 - 8) });
    expect(encoder.encode(exact).byteLength).toBe(16_384);
    expect((await readAssistantJson(request(exact)) as { x: string }).x.length).toBe(16_384 - 8);
    const cancel = vi.fn();
    await expect(readAssistantJson(request(chunked([encoder.encode(exact), encoder.encode(" "), encoder.encode("further bytes")], cancel)))).rejects.toMatchObject({ status: 413 });
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("decodes multibyte Persian characters split across arbitrary network chunks", async () => {
    const body = encoder.encode('{"message":"فردا به مشهد"}');
    const chunks = [...body].map((byte) => Uint8Array.of(byte));
    expect(await readAssistantJson(request(chunked(chunks)))).toEqual({ message: "فردا به مشهد" });
  });
  it("rejects malformed UTF-8, empty bodies, invalid JSON, and aborted streams with a stable safe error", async () => {
    await expect(readAssistantJson(request(chunked([Uint8Array.of(0xc3, 0x28)])))).rejects.toMatchObject({ status: 400, code: "INVALID_REQUEST" });
    await expect(readAssistantJson(request("{invalid"))).rejects.toMatchObject({ status: 400 });
    await expect(readAssistantJson(new Request(url, { method: "POST", headers: { "Content-Type": "application/json" } }))).rejects.toMatchObject({ status: 400 });
    const broken = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error("secret transport details")); } });
    await expect(readAssistantJson(request(broken))).rejects.toMatchObject({ status: 400, message: "JSON خوانا و معتبر لازم است." });
  });
  it("allows same-origin browser requests and local internalURL localhost with an actual 127.0.0.1 Host", async () => {
    expect(await readAssistantJson(request("{}", { Origin: "http://localhost:3000" }))).toEqual({});
    expect(await readAssistantJson(request("{}", { Origin: "http://127.0.0.1:3000", Host: "127.0.0.1:3000" }))).toEqual({});
    expect(await readAssistantJson(request("{}", { Origin: "https://torob.example", Host: "torob.example" }, "https://torob.example/api/assistant"))).toEqual({});
  });
  const rejectedOriginHeaders: Record<string, string>[] = [
    { Origin: "http://evil.example", Host: "localhost:3000" },
    { Origin: "http://127.0.0.1:3001", Host: "127.0.0.1:3000" },
    { Origin: "https://127.0.0.1:3000", Host: "127.0.0.1:3000" },
    { Origin: "http://evil.example", "X-Forwarded-Host": "evil.example" },
    { Origin: "not a URL", Host: "localhost:3000" },
    { Origin: "null", Host: "localhost:3000" },
    { Origin: "http://localhost:3000/path", Host: "localhost:3000" },
    { Origin: "http://localhost:3000?query=1", Host: "localhost:3000" },
    { Origin: "http://localhost:3000#fragment", Host: "localhost:3000" },
    { Origin: "http://user:pass@localhost:3000", Host: "localhost:3000" },
  ];
  it.each(rejectedOriginHeaders)("rejects cross-origin, spoofed forwarding, or malformed serialized Origin %j", async (headers) => {
    await expect(readAssistantJson(request("{}", headers))).rejects.toMatchObject({ status: 403, code: "INVALID_ORIGIN" });
  });
});

describe("assistant HTTP response safety", () => {
  it("disables caching and sets JSON/nosniff response headers on success", async () => {
    const response = assistantJson({ ok: true }, 201);
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({ ok: true });
  });
  it("preserves only explicitly safe HTTP errors", async () => {
    const response = assistantHttpFailure(new AssistantHttpError("درخواست بیش از حد طولانی است.", 413, "REQUEST_TOO_LARGE"));
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ ok: false, error: { code: "REQUEST_TOO_LARGE", message: "درخواست بیش از حد طولانی است." } });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it.each([new TypeError("secret schema payload"), new RangeError("secret provider token")])("hides private validation error details %s", async (error) => {
    const response = assistantHttpFailure(error);
    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.error.code).toBe("INVALID_PREFERENCES");
    expect(JSON.stringify(data)).not.toContain("secret");
  });
  it("hides unexpected provider errors, stack traces and credentials without claiming model success", async () => {
    const response = assistantHttpFailure(new Error("api_key=SECRET; provider http://private.example failed"));
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toMatchObject({ ok: false, error: { code: "ASSISTANT_ERROR" } });
    expect(JSON.stringify(data)).not.toContain("SECRET"); expect(JSON.stringify(data)).not.toContain("private.example"); expect(data.error.stack).toBeUndefined();
  });
});
