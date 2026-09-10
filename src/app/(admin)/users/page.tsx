import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Banner } from "@/components/ui/Banner";
import { UsersExplorer } from "@/components/users/UsersExplorer";
import type { UserProfile } from "@/types/db";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, full_name, email, mobile, role, is_active, companies(name)")
    .order("full_name");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Every user across every company, for visibility only."
      />
      {error ? (
        <Banner variant="error">Could not load users: {error.message}</Banner>
      ) : (
        <UsersExplorer users={(data as unknown as UserProfile[]) ?? []} />
      )}
    </div>
  );
}
