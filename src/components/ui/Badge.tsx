import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/status";

const TONE_CLASSES: Record<Tone, string> = {
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  neutral: "bg-neutral-soft text-neutral",
  accent: "bg-accent-soft text-accent",
};

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}
