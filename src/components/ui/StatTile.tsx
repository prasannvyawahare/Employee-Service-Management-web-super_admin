import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";
import { formatNumber } from "@/lib/format";

const TONE_CLASSES: Record<string, string> = {
  accent: "bg-accent text-accent-ink",
  good: "bg-good text-white",
  warn: "bg-warn text-white",
  bad: "bg-bad text-white",
  neutral: "bg-neutral text-white",
};

export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "accent",
  formattedValue,
  caption,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: keyof typeof TONE_CLASSES;
  formattedValue?: string;
  caption?: string;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full ${TONE_CLASSES[tone]}`}
      >
        <Icon size={20} strokeWidth={2.25} />
      </div>
      <div>
        <div className="text-2xl font-bold tabular-nums text-ink">
          {formattedValue ?? formatNumber(value)}
        </div>
        <div className="text-[13px] text-ink-muted">{label}</div>
        {caption && <div className="mt-1 text-xs text-ink-faint">{caption}</div>}
      </div>
    </Card>
  );
}
