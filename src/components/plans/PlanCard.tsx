import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/format";
import type { Feature, Plan } from "@/types/db";

export function PlanCard({
  plan,
  catalog,
  onEdit,
  onDelete,
}: {
  plan: Plan;
  catalog: Feature[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const featureKeys = new Set(plan.plan_features.map((f) => f.feature_key));
  const labels = catalog.filter((f) => featureKeys.has(f.key)).map((f) => f.label);

  return (
    <Card className="flex w-full max-w-sm flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-base font-bold text-ink">{plan.name}</div>
        {!plan.is_active && <Badge tone="neutral">Inactive</Badge>}
      </div>

      {plan.description && <p className="text-xs text-ink-muted">{plan.description}</p>}

      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-extrabold text-accent">
          {formatCurrency(plan.price)}
        </span>
        <span className="text-xs text-ink-muted">/ {plan.billing_period}</span>
      </div>

      {labels.length === 0 ? (
        <p className="text-xs text-ink-muted">No features selected.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {labels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-accent-soft px-2 py-1 text-[11px] font-semibold text-accent"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="mt-1 flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onEdit}>
          <Pencil size={14} />
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete plan">
          <Trash2 size={16} className="text-bad" />
        </Button>
      </div>
    </Card>
  );
}
