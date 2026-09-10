"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CompanyStatus } from "@/lib/status";

type ActionResult = { error: string } | { success: true };

/**
 * Mirrors `SuperAdminService.updateEmployeeLimit` + `updateCompanyPlan` +
 * `setCompanyFeatures` (fieldforce/lib/core/services/super_admin_service.dart)
 * fired together, same as the Flutter Save button's `Future.wait` — a
 * partial edit never lands half-committed from the user's perspective.
 */
export async function saveCompanySubscription(
  companyId: string,
  input: { plan: string; employeeLimit: number; features: Record<string, boolean> },
): Promise<ActionResult> {
  const supabase = await createClient();

  const featureRows = Object.entries(input.features).map(([feature_key, enabled]) => ({
    company_id: companyId,
    feature_key,
    enabled,
  }));

  const [subResult, featuresResult] = await Promise.all([
    supabase
      .from("subscriptions")
      .update({ plan: input.plan, employee_limit: input.employeeLimit })
      .eq("company_id", companyId),
    featureRows.length > 0
      ? supabase
          .from("company_features")
          .upsert(featureRows, { onConflict: "company_id,feature_key" })
      : Promise.resolve({ error: null }),
  ]);

  if (subResult.error || featuresResult.error) {
    return {
      error:
        subResult.error?.message ??
        featuresResult.error?.message ??
        "Could not save changes.",
    };
  }

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/companies");
  return { success: true };
}

export async function updateCompanyStatus(
  companyId: string,
  status: CompanyStatus,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ status })
    .eq("id", companyId);

  if (error) return { error: error.message };

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/companies");
  return { success: true };
}

/**
 * `super_admin_delete_company` (00038) — irreversible, also removes
 * `user_profiles`/`auth.users` rows for the company. The caller (the
 * type-the-company-name dialog) is responsible for confirming first.
 */
export async function deleteCompany(companyId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("super_admin_delete_company", {
    p_company_id: companyId,
  });

  if (error) return { error: error.message };

  revalidatePath("/companies");
  redirect("/companies");
}
