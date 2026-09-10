import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { ROLE_COLORS } from "@/lib/roles";
import { titleCase } from "@/lib/format";
import type { UserProfile } from "@/types/db";

export function UserRow({ user }: { user: UserProfile }) {
  const color = ROLE_COLORS[user.role];
  const fullName = user.full_name || "—";

  return (
    <Card className="flex items-center gap-4 p-4">
      <Avatar name={fullName} color={color} size={36} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{fullName}</div>
        <div className="mt-0.5 truncate text-xs text-ink-muted">
          {[user.email, user.companies?.name].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: `${color}1f`, color }}
        >
          {titleCase(user.role)}
        </span>
        {!user.is_active && <span className="text-xs font-semibold text-bad">Inactive</span>}
      </div>
    </Card>
  );
}
