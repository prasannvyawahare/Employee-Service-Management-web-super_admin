import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";

/**
 * Shared shell for every super-admin page — mirrors the persistent left
 * SideNav in fieldforce's SuperAdminDashboardScreen (same six sections:
 * Dashboard/Companies/Plans/Sales/Users/Account). Auth/role enforcement
 * itself lives in middleware.ts, not here — this layout can assume `user`
 * is always a super_admin by the time it renders.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar userEmail={user?.email} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
