import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { COMPANY_STATUS } from "@/lib/status";
import { titleCase } from "@/lib/format";
import { firstOrSelf } from "@/lib/db";
import type { Company } from "@/types/db";

export function CompanyRow({ company }: { company: Company }) {
  const subscription = firstOrSelf(company.subscriptions);
  const plan = subscription?.plan ?? null;
  const employeeLimit = subscription?.employee_limit ?? company.employee_limit ?? 0;
  const status = COMPANY_STATUS[company.status];

  return (
    <Link href={`/companies/${company.id}`}>
      <Card className="flex items-center gap-4 p-4 transition-colors hover:border-border-strong">
        <Avatar name={company.name} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{company.name}</div>
          <div className="mt-0.5 truncate text-xs text-ink-muted">
            {[company.company_code, plan ? titleCase(plan) : null].filter(Boolean).join(" · ")}
          </div>
          <div className="mt-0.5 text-xs font-medium text-accent">
            Employee limit: {employeeLimit}
          </div>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </Card>
    </Link>
  );
}
