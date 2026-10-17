import Image from "next/image";

/** The supplied emblem is displayed intact; the wordmark is separate UI text. */
export function Brand({
  className = "",
  compact = false,
  priority = false,
}: {
  className?: string;
  compact?: boolean;
  priority?: boolean;
}) {
  return (
    <span className={`brand-lockup ${compact ? "brand-lockup-compact" : ""} ${className}`.trim()}>
      <Image
        src="/branding/torob-belit-logo.png"
        alt=""
        width={compact ? 40 : 48}
        height={compact ? 40 : 48}
        sizes={compact ? "40px" : "48px"}
        className="brand-emblem"
        priority={priority}
      />
      <span className="brand-wordmark">ترب بلیط</span>
    </span>
  );
}
