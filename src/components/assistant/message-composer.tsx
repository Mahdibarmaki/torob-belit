"use client";

import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Button, Icon } from "../ui";
import styles from "./assistant.module.css";

export function MessageComposer({ value, onChange, onSend, busy, mode }: { value: string; onChange: (text: string) => void; onSend: () => void; busy: boolean; mode: "demo" | "live" | "fixture" }) {
  const id = useId();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const sync = () => {
      const focused = document.activeElement === textarea.current;
      const inset = focused ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
      dock.current?.style.setProperty("--assistant-keyboard-inset", `${inset}px`);
      if (focused && inset > 80) textarea.current?.scrollIntoView({ block: "nearest" });
    };
    viewport.addEventListener("resize", sync); viewport.addEventListener("scroll", sync);
    const field = textarea.current;
    field?.addEventListener("focus", sync); field?.addEventListener("blur", sync);
    return () => { viewport.removeEventListener("resize", sync); viewport.removeEventListener("scroll", sync); field?.removeEventListener("focus", sync); field?.removeEventListener("blur", sync); };
  }, []);
  useLayoutEffect(() => {
    const input = textarea.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(160, Math.max(44, input.scrollHeight))}px`;
  }, [value]);
  return <div className={styles.composerDock} ref={dock}>
    <form className={styles.composer} aria-label="پیام به دستیار سفر" onSubmit={(event) => { event.preventDefault(); if (!busy && value.trim()) onSend(); }}>
      <label htmlFor={id} className="visually-hidden">پیام سفر</label>
      <textarea id={id} ref={textarea} value={value} rows={1} maxLength={2000} placeholder="سفرت رو توصیف کن..." onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) { event.preventDefault(); if (!busy && value.trim()) onSend(); } }} />
      <Button type="submit" variant="coral" disabled={busy || !value.trim()} aria-label="ارسال پیام"><Icon icon={Send} size={20} /></Button>
    </form>
    <p className={styles.caption}>اطلاعات مسافر، کد ملی و گذرنامه را در پیام ننویسید. {mode === "demo" ? "پروازها و سوابق این نسخه آزمایشی‌اند." : mode === "fixture" ? "پاسخ مرجع، قیمت و سابقه تأییدشده ندارد." : "منابع واقعی بلیت و سابقه عملیاتی مستقل‌اند."}</p>
  </div>;
}
