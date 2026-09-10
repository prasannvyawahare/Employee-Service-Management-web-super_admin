import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Banner } from "@/components/ui/Banner";
import { CompanyDetailForm } from "@/components/companies/CompanyDetailForm";
import type { CompanyDetail, Feature } from "@/types/db";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: company, error: companyError }, { data: catalog, error: catalogError }] =
    await Promise.all([
      supabase
        .from("companies")
        .select("*, subscriptions(*), company_features(*)")
        .eq("id", id)
        .maybeSingle(),
      supabase.from("features").select().order("sort_order"),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/companies"
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={14} />
          Companies
        </Link>
        <PageHeader title={company?.name ?? "Company detail"} />
      </div>

      {companyError || catalogError ? (
        <Banner variant="error">
          Could not load company: {companyError?.message ?? catalogError?.message}
        </Banner>
      ) : !company ? (
        <Banner variant="error">Company not found.</Banner>
      ) : (
        <CompanyDetailForm
          company={company as CompanyDetail}
          catalog={(catalog as Feature[]) ?? []}
        />
      )}
    </div>
  );
}
