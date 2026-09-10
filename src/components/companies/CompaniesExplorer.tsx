"use client";

import { useMemo, useState } from "react";
import { Search, Building2 } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { COMPANY_STATUS, type CompanyStatus } from "@/lib/status";
import { CompanyRow } from "./CompanyRow";
import type { Company } from "@/types/db";

const STATUS_FILTERS = Object.keys(COMPANY_STATUS) as CompanyStatus[];

export function CompaniesExplorer({ companies }: { companies: Company[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return companies.filter((c) => {
      const matchesQuery =
        query.length === 0 ||
        c.name.toLowerCase().includes(query) ||
        (c.company_code ?? "").toLowerCase().includes(query);
      const matchesStatus = !statusFilter || c.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [companies, search, statusFilter]);

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
          placeholder="Search by name or company code…"
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip active={statusFilter === null} onClick={() => setStatusFilter(null)}>
          All
        </Chip>
        {STATUS_FILTERS.map((s) => (
          <Chip
            key={s}
            active={statusFilter === s}
            onClick={() => setStatusFilter(statusFilter === s ? null : s)}
          >
            {COMPANY_STATUS[s].label}
          </Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={companies.length === 0 ? "No companies yet" : "No companies match your filters"}
          description={
            companies.length === 0
              ? "Companies appear here once a prospect self-registers."
              : "Try a different search term or clear the status filter."
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((company) => (
            <CompanyRow key={company.id} company={company} />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-border-strong text-ink-muted hover:bg-surface-sunken",
      )}
    >
      {children}
    </button>
  );
}
