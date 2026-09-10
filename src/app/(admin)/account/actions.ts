"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string } | { success: true };

/**
 * Updates the signed-in super admin's own `full_name` — relies on
 * `own_user_profile` (id = auth.uid()) being broad enough for any
 * authenticated user to edit their own row. Mirrors
 * `SuperAdminService.updateOwnProfile`.
 */
export async function updateProfileName(fullName: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("user_profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/account");
  return { success: true };
}

/** Changes the signed-in user's own password via the GoTrue auth API directly. */
export async function changePassword(newPassword: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return { success: true };
}
