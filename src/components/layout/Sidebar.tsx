import {
  LayoutDashboard,
  Building2,
  Tags,
  LineChart,
  Users,
  UserCircle,
} from "lucide-react";
import { NavLink } from "./NavLink";
import SignOutButton from "@/app/(admin)/sign-out-button";

const ICON_PROPS = { size: 17, strokeWidth: 2.25 } as const;

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: <LayoutDashboard {...ICON_PROPS} /> },
  { href: "/companies", label: "Companies", icon: <Building2 {...ICON_PROPS} /> },
  { href: "/plans", label: "Plans", icon: <Tags {...ICON_PROPS} /> },
  { href: "/sales", label: "Sales", icon: <LineChart {...ICON_PROPS} /> },
  { href: "/users", label: "Users", icon: <Users {...ICON_PROPS} /> },
  { href: "/account", label: "Account", icon: <UserCircle {...ICON_PROPS} /> },
];

export function Sidebar({ userEmail }: { userEmail?: string | null }) {
  return (
    <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-border bg-surface-raised px-4 py-6">
      <div>
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-control bg-accent text-sm font-bold text-accent-ink">
            F
          </div>
          <div className="text-sm font-bold text-ink">Fieldforce Admin</div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
      </div>
      <div className="space-y-2 px-2">
        <div className="truncate text-xs text-ink-faint">{userEmail}</div>
        <SignOutButton />
      </div>
    </aside>
  );
}
