"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { SearchMode } from "@/application/search-service";
import { Icon } from "./ui";
import styles from "./assistant-entry.module.css";
import identity from "./assistant/ai-identity.module.css";

/** Product navigation, separate from the form's one-way/round-trip tabs. */
export function AssistantEntry({ mode = "demo" }: { mode?: SearchMode }) {
  return <div className={`${identity.identity} ${styles.rail}`}>
    <Link href={mode === "demo" ? "/ai-assistant" : `/ai-assistant?mode=${mode}`} className={styles.entry}>
      <Icon icon={Sparkles} size={20} />
      <span>دستیار هوشمند</span>
    </Link>
  </div>;
}
