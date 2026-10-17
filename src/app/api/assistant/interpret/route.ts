import { assistantDateContext } from "@/server/assistant-context";
import { assistantHttpFailure, assistantJson, readAssistantJson } from "@/server/assistant-http";
import { assistantProviderStatus, interpretTravelRequest } from "@/server/ai/openai";
import { parseAssistantInterpretRequest } from "@/server/ai/validation";

export function GET() {
  return assistantJson({ ok: true, data: assistantProviderStatus() });
}

export async function POST(request: Request) {
  try {
    const input = parseAssistantInterpretRequest(await readAssistantJson(request));
    const context = assistantDateContext(input.intent.mode);
    const data = await interpretTravelRequest(input, context, { signal: request.signal });
    return assistantJson({ ok: true, data, context });
  } catch (error) { return assistantHttpFailure(error); }
}
