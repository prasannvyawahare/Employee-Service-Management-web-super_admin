import { Building2, Clock, CheckCircle2, Ban, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { Banner } from "@/components/ui/Banner";
import type { PlatformStats } from "@/types/db";

/**
 * `super_admin_platform_stats()` (00035) can come back either as a single
 * jsonb object or as a one-row table, depending on how Postgrest serializes
 * it — the Flutter reference (`SuperAdminService.fetchPlatformStats`)
 * defends against both shapes, so this does too.
 */
function normalizeStats(result: unknown): PlatformStats | null {
  if (Array.isArray(result)) return (result[0] as PlatformStats) ?? null;
  if (result && typeof result === "object") return result as PlatformStats;
  return null;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("super_admin_platform_stats");
  const stats = normalizeStats(data);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Platform-wide overview across every tenant."
      />

      {error ? (
        <Banner variant="error">Could not load platform stats: {error.message}</Banner>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile
            label="Total companies"
            value={stats?.total_companies ?? 0}
            icon={Building2}
            tone="accent"
          />
          <StatTile
            label="Pending approval"
            value={stats?.pending_companies ?? 0}
            icon={Clock}
            tone="warn"
          />
          <StatTile
            label="Approved"
            value={stats?.approved_companies ?? 0}
            icon={CheckCircle2}
            tone="good"
          />
          <StatTile
            label="Blocked/Suspended"
            value={(stats?.blocked_companies ?? 0) + (stats?.suspended_companies ?? 0)}
            icon={Ban}
            tone="bad"
          />
          <StatTile
            label="Total employees"
            value={stats?.total_employees ?? 0}
            icon={Users}
            tone="accent"
          />
        </div>
      )}
    </div>
  );
}
