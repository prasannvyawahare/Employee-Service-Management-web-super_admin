import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-2 py-16 text-center">
      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-ink-faint">
        <Icon size={22} />
      </div>
      <div className="text-sm font-semibold text-ink">{title}</div>
      {description && (
        <p className="max-w-sm text-sm text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}
