import { Sparkles } from "lucide-react";
import { Icon } from "../ui";
import styles from "./assistant.module.css";

export interface AssistantMessage { id: number; role: "user" | "assistant"; text: string; contextEligible?: boolean }

export function Conversation({ messages, busy }: { messages: AssistantMessage[]; busy: boolean }) {
  return <section aria-label="گفت‌وگوی سفر" aria-busy={busy}>
    <ol className={styles.messages}>{messages.map((message) => <li key={message.id} aria-label={message.role === "user" ? "پیام شما" : "پیام دستیار سفر"} className={`${styles.message} ${styles[message.role]}`}><p dir="auto">{message.text}</p></li>)}</ol>
    {busy && <p role="status" className={styles.busy}><Icon icon={Sparkles} size={18} />در حال بررسی درخواستت...</p>}
  </section>;
}
