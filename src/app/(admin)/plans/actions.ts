"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string } | { success: true };

type PlanInput = {
  name: string;
  description: string | null;
  price: number;
  billingPeriod: string;
  featureKeys: string[];
};

/** Mirrors `SuperAdminService.createPlan` — plan row + bundled features in one call. */
export async function createPlan(input: PlanInput): Promise<ActionResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("plans")
    .insert({
      name: input.name,
      description: input.description,
      price: input.price,
      billing_period: input.billingPeriod,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not create plan." };

  if (input.featureKeys.length > 0) {
    const { error: featuresError } = await supabase
      .from("plan_features")
      .insert(input.featureKeys.map((feature_key) => ({ plan_id: data.id, feature_key })));
    if (featuresError) return { error: featuresError.message };
  }

  revalidatePath("/plans");
  return { success: true };
}

/**
 * Mirrors `SuperAdminService.updatePlan` — updates the plan's own fields and
 * replaces its feature bundle wholesale (delete-then-insert).
 */
export async function updatePlan(
  planId: string,
  input: PlanInput & { isActive: boolean },
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("plans")
    .update({
      name: input.name,
      description: input.description,
      price: input.price,
      billing_period: input.billingPeriod,
      is_active: input.isActive,
    })
    .eq("id", planId);
  if (error) return { error: error.message };

  const { error: deleteError } = await supabase
    .from("plan_features")
    .delete()
    .eq("plan_id", planId);
  if (deleteError) return { error: deleteError.message };

  if (input.featureKeys.length > 0) {
    const { error: insertError } = await supabase
      .from("plan_features")
      .insert(input.featureKeys.map((feature_key) => ({ plan_id: planId, feature_key })));
    if (insertError) return { error: insertError.message };
  }

  revalidatePath("/plans");
  return { success: true };
}

export async function deletePlan(planId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("plans").delete().eq("id", planId);
  if (error) return { error: error.message };
  revalidatePath("/plans");
  return { success: true };
}
