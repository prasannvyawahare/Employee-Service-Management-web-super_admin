import { Card } from "@/components/ui/Card";
import { titleCase } from "@/lib/format";

export function BreakdownCard({
  title,
  counts,
}: {
  title: string;
  counts: Record<string, number>;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <Card className="flex-1">
      <div className="mb-3 text-sm font-bold text-ink">{title}</div>
      {entries.length === 0 ? (
        <p className="text-xs text-ink-muted">No data yet.</p>
      ) : (
        <div className="space-y-3">
          {entries.map(([key, value]) => (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-ink">{titleCase(key)}</span>
                <span className="font-semibold text-ink">{value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: total === 0 ? "0%" : `${(value / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
