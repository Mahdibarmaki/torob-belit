import type { Metadata } from "next";
import { AIFlightAssistant } from "@/components/ai-assistant";
import { assistantDateContext } from "@/server/assistant-context";
import { searchModeFromParam } from "@/application/search-mode";
import { assistantProviderStatus } from "@/server/ai/openai";

export const metadata: Metadata = { title: "دستیار هوشمند سفر | ترب بلیط" };
export const dynamic = "force-dynamic";

export default async function AssistantPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const mode = searchModeFromParam(params.mode);
  return <AIFlightAssistant key={mode} mode={mode} initialContext={assistantDateContext(mode)} aiConfigured={assistantProviderStatus().configured} />;
}
