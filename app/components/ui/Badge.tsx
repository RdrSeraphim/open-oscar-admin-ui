import { ReactNode } from "react";

type Tone = "neutral" | "blue" | "gold" | "danger" | "green";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-border/50 text-foreground",
  blue: "bg-aim-blue text-white",
  gold: "bg-aim-gold text-aim-blue-dark",
  danger: "bg-aim-danger/15 text-aim-danger",
  green: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
