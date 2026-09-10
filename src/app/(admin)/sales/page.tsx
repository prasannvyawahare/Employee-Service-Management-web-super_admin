import { IndianRupee, Building2, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { Banner } from "@/components/ui/Banner";
import { BreakdownCard } from "@/components/sales/BreakdownCard";
import { formatCurrency } from "@/lib/format";
import { firstOrSelf } from "@/lib/db";
import type { Company } from "@/types/db";

/**
 * Real-data-only — deliberately does not fabricate revenue trend charts or
 * invented percentage deltas. Billing isn't wired up yet (plan.md §7.6), so
 * "recorded revenue" honestly sums `subscriptions.amount`, which is $0 until
 * that's built. Mirrors the Flutter reference's `SalesSection` exactly.
 */
export default async function SalesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*, subscriptions(*)")
    .order("created_at", { ascending: false });

  const companies = (data as Company[]) ?? [];
  const subscriptions = companies
    .map((c) => firstOrSelf(c.subscriptions))
    .filter((s): s is NonNullable<typeof s> => s !== null);

  let recordedRevenue = 0;
  const byStatus: Record<string, number> = {};
  const byPlan: Record<string, number> = {};
  for (const s of subscriptions) {
    recordedRevenue += s.amount ?? 0;
    byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
    byPlan[s.plan] = (byPlan[s.plan] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Sales" description="Real aggregates over the current subscription base." />

      {error ? (
        <Banner variant="error">Could not load sales data: {error.message}</Banner>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              label="Recorded revenue"
              value={recordedRevenue}
              formattedValue={formatCurrency(recordedRevenue)}
              icon={IndianRupee}
              tone="good"
              caption={
                recordedRevenue === 0
                  ? "No payment gateway is wired up yet — sums subscriptions.amount, set manually until billing exists."
                  : undefined
              }
            />
            <StatTile
              label="Companies with a subscription"
              value={subscriptions.length}
              icon={Building2}
              tone="accent"
            />
            <StatTile
              label="Active subscriptions"
              value={byStatus.active ?? 0}
              icon={TrendingUp}
              tone="accent"
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <BreakdownCard title="By subscription status" counts={byStatus} />
            <BreakdownCard title="By plan" counts={byPlan} />
          </div>
        </>
      )}
    </div>
  );
}
