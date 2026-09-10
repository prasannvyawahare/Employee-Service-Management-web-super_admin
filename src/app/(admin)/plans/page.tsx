import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Banner } from "@/components/ui/Banner";
import { PlansManager } from "@/components/plans/PlansManager";
import type { Feature, Plan } from "@/types/db";

export default async function PlansPage() {
  const supabase = await createClient();

  const [{ data: plans, error: plansError }, { data: catalog, error: catalogError }] =
    await Promise.all([
      supabase
        .from("plans")
        .select("*, plan_features(feature_key)")
        .order("created_at", { ascending: false }),
      supabase.from("features").select().order("sort_order"),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Plans" description="Pricing/feature-bundle catalog for sales pitches." />
      {plansError || catalogError ? (
        <Banner variant="error">
          Could not load plans: {plansError?.message ?? catalogError?.message}
        </Banner>
      ) : (
        <PlansManager plans={(plans as Plan[]) ?? []} catalog={(catalog as Feature[]) ?? []} />
      )}
    </div>
  );
}
