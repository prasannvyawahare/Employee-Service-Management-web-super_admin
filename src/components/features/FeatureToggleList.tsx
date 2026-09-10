import { Checkbox } from "@/components/ui/Checkbox";
import type { Feature } from "@/types/db";

/**
 * `core` features render checked + disabled — a tenant is non-functional
 * without them (fieldforce/supabase/migrations/00034). `optional` entries
 * drive `onChange`. Mirrors `FeatureToggleList` in the Flutter reference.
 */
export function FeatureToggleList({
  catalog,
  enabled,
  onChange,
}: {
  catalog: Feature[];
  enabled: Record<string, boolean>;
  onChange: (updated: Record<string, boolean>) => void;
}) {
  const core = catalog.filter((f) => f.category === "core");
  const optional = catalog.filter((f) => f.category !== "core");

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Included in every plan
        </div>
        {core.map((f) => (
          <Checkbox key={f.key} label={f.label} description={f.description} checked disabled />
        ))}
      </div>
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Optional features
        </div>
        {optional.map((f) => (
          <Checkbox
            key={f.key}
            label={f.label}
            description={f.description}
            checked={enabled[f.key] ?? false}
            onChange={(e) => onChange({ ...enabled, [f.key]: e.target.checked })}
          />
        ))}
      </div>
    </div>
  );
}
