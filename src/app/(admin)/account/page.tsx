import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountForms } from "@/components/account/AccountForms";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("user_profiles").select("full_name").eq("id", user.id).maybeSingle()
    : { data: null };

  return (
    <div className="space-y-6">
      <PageHeader title="Account" description="Your own profile and password." />
      <AccountForms email={user?.email ?? "—"} fullName={profile?.full_name ?? ""} />
    </div>
  );
}
