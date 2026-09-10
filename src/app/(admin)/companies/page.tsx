import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Banner } from "@/components/ui/Banner";
import { CompaniesExplorer } from "@/components/companies/CompaniesExplorer";
import type { Company } from "@/types/db";

export default async function CompaniesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*, subscriptions(*)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="Every tenant on the platform, newest first."
      />
      {error ? (
        <Banner variant="error">Could not load companies: {error.message}</Banner>
      ) : (
        <CompaniesExplorer companies={(data as Company[]) ?? []} />
      )}
    </div>
  );
}
