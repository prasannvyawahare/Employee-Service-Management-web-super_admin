"use client";

import { useMemo, useState } from "react";
import { Search, Users as UsersIcon } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { UserRow } from "./UserRow";
import type { UserProfile } from "@/types/db";

export function UsersExplorer({ users }: { users: UserProfile[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (u) =>
        (u.full_name ?? "").toLowerCase().includes(query) ||
        (u.email ?? "").toLowerCase().includes(query) ||
        (u.companies?.name ?? "").toLowerCase().includes(query),
    );
  }, [users, search]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or company…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={users.length === 0 ? "No users yet" : "No users match your search"}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}
