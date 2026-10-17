"use client";

import { useEffect, useRef, useState } from "react";
import { mergeIntentPatch, parseTravelIntent, validateAssistantIntent, type AssistantDateContext, type IntentField, type TravelIntent } from "@/domain/assistant-intent";
import type { AssistantInterpretation } from "@/domain/assistant-provider";
import type { AssistantMessage } from "./conversation";

interface ConversationOptions {
  getIntent: () => TravelIntent;
  getConfirmedFields: () => IntentField[];
  onIntent: (intent: TravelIntent) => void;
  onContext: (context: AssistantDateContext) => void;
  onRecommend: (intent: TravelIntent, context: AssistantDateContext) => void;
  context: AssistantDateContext;
  configured: boolean;
  onUnavailable: () => void;
}

/** Conversation coordinates validated intent only. Inventory, scoring and seller referrals stay independent. */
export function useAssistantConversation(options: ConversationOptions) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<AssistantInterpretation | null>(null);
  const [state, setState] = useState<AssistantInterpretation["state"] | "ready">(options.configured ? "ready" : "unavailable");
  const [model, setModel] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const version = useRef(0);
  const locked = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);

  function reply(text: string, contextEligible = false) {
    setMessages((previous) => [...previous, { id: ++sequence.current, role: "assistant", text, contextEligible }]);
    setAnnouncement(text);
  }
  function cancel() {
    version.current += 1; controller.current?.abort(); controller.current = null; locked.current = false; setBusy(false); setPending(null);
  }

  async function send(text = input) {
    const content = text.trim();
    if (!content || content.length > 2000 || locked.current) return;
    locked.current = true; setBusy(true); setPending(null); setInput("");
    const userId = ++sequence.current;
    const history = messages.filter((message) => message.contextEligible).slice(-6).map(({ role, text }) => ({ role, content: text.slice(0, 2000) }));
    setMessages((previous) => [...previous, { id: userId, role: "user", text: content, contextEligible: false }]);
    controller.current?.abort();
    const current = new AbortController(); controller.current = current;
    const requestVersion = ++version.current;
    const timeout = setTimeout(() => current.abort(), 20_000);
    try {
      const response = await fetch("/api/assistant/interpret", { method: "POST", headers: { "Content-Type": "application/json" }, signal: current.signal,
        body: JSON.stringify({ message: content, intent: options.getIntent(), confirmedFields: options.getConfirmedFields(), history }) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message ?? "تفسیر درخواست انجام نشد؛ دوباره تلاش کنید.");
      if (current.signal.aborted || requestVersion !== version.current) return;
      const data: AssistantInterpretation = payload.data;
      const next = parseTravelIntent(data.intent);
      if (next.mode !== options.getIntent().mode) throw new Error("منبع داده تغییر نکرد؛ پاسخ تفسیر معتبر نیست.");
      setState(data.state); setModel(data.model);
      options.onContext(payload.context);
      if (data.state !== "interpreted") {
        options.onUnavailable();
        reply([...new Set([data.message, data.question].filter(Boolean))].join("\n"));
        return;
      }
      setMessages((previous) => previous.map((message) => message.id === userId ? { ...message, contextEligible: true } : message));
      options.onIntent(next);
      reply([...new Set([data.message, data.question].filter(Boolean))].join("\n"), true);
      if (data.conflicts.length) setPending(data);
      else if (!data.needsClarification) options.onRecommend(next, payload.context);
    } catch (failure) {
      if (requestVersion !== version.current) return;
      setState(current.signal.aborted ? "timeout" : "error");
      options.onUnavailable();
      reply(current.signal.aborted ? "زمان تفسیر درخواست تمام شد. انتخاب‌های قبلی حفظ شدند؛ دوباره تلاش کنید یا از ترجیحات ساختاریافته استفاده کنید." : failure instanceof Error ? failure.message : "تفسیر درخواست انجام نشد؛ انتخاب‌های قبلی حفظ شدند.");
      setInput((latest) => latest || content);
    } finally { clearTimeout(timeout); if (controller.current === current) { controller.current = null; locked.current = false; setBusy(false); } }
  }

  function confirmChanges() {
    if (!pending) return;
    const next = mergeIntentPatch(options.getIntent(), pending.patch, options.getConfirmedFields(), "manual").intent;
    setPending(null); options.onIntent(next);
    const validation = validateAssistantIntent(next, options.context);
    reply(validation.question ?? "تغییرات پیشنهادی با تأیید شما اعمال شدند.", true);
    if (validation.ready) options.onRecommend(next, options.context);
  }
  function rejectChanges() { setPending(null); reply("انتخاب‌های تأییدشده قبلی حفظ شدند.", true); }

  const status = state === "interpreted" ? `آخرین تفسیر پیام با مدل${model ? ` ${model}` : " هوش مصنوعی"} انجام شد؛ پیشنهادها جداگانه محاسبه می‌شوند.`
    : state === "ready" ? "سرویس مدل پیکربندی شده است؛ موفقیت تفسیر پس از ارسال پیام مشخص می‌شود."
    : state === "unavailable" ? "تفسیر هوش مصنوعی در دسترس نیست؛ کلید و مدل سرویس تنظیم نشده‌اند. پیشنهادهای ساختاریافته فعال‌اند."
    : "تفسیر هوش مصنوعی این پیام انجام نشد؛ ترجیحات و پیشنهادهای محاسبه‌شده مستقل از مدل در دسترس‌اند.";
  return { messages, input, setInput, busy, pending, send, reply, cancel, confirmChanges, rejectChanges, status, announcement };
}
