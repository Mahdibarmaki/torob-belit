import type { IntentConflict, IntentField, IntentPatch, TravelIntent } from "./assistant-intent";

/** Client-safe protocol. Provider credentials and transport never cross this boundary. */
export interface AssistantInterpretRequest {
  message: string;
  intent: TravelIntent;
  confirmedFields: IntentField[];
  history?: { role: "user" | "assistant"; content: string }[];
}

export interface AssistantInterpretation {
  state: "interpreted" | "unavailable" | "authentication" | "quota" | "configuration" | "error" | "timeout" | "invalid" | "refused" | "limited";
  intent: TravelIntent;
  patch: IntentPatch;
  conflicts: IntentConflict[];
  question: string | null;
  message: string;
  needsClarification: boolean;
  model: string | null;
}

export interface AssistantProviderStatus {
  provider: "openai";
  /** Configuration readiness, never evidence of a successful real provider request. */
  configured: boolean;
  model: string | null;
}
