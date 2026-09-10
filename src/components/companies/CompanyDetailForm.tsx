"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { Label, Input, Select } from "@/components/ui/Field";
import { SUBSCRIPTION_PLAN_OPTIONS, type CompanyStatus } from "@/lib/status";
import type { SubscriptionPlan } from "@/types/db";
import { titleCase } from "@/lib/format";
import { firstOrSelf } from "@/lib/db";
import { FeatureToggleList } from "@/components/features/FeatureToggleList";
import { CompanyStatusActions } from "./CompanyStatusActions";
import { DangerZone } from "./DangerZone";
import { saveCompanySubscription } from "@/app/(admin)/companies/[id]/actions";
import type { CompanyDetail, Feature } from "@/types/db";

export function CompanyDetailForm({
  company,
  catalog,
}: {
  company: CompanyDetail;
  catalog: Feature[];
}) {
  const subscription = firstOrSelf(company.subscriptions);

  const [plan, setPlan] = useState(subscription?.plan ?? "basic");
  const [employeeLimit, setEmployeeLimit] = useState(
    String(subscription?.employee_limit ?? company.employee_limit ?? 10),
  );
  const [features, setFeatures] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(company.company_features.map((f) => [f.feature_key, f.enabled])),
  );
  const [status, setStatus] = useState<CompanyStatus>(company.status);

  const [banner, setBanner] = useState<{ variant: "success" | "error"; text: string } | null>(
    null,
  );
  const [isSaving, startSave] = useTransition();

  function handleSave() {
    const limit = Number.parseInt(employeeLimit, 10);
    startSave(async () => {
      const result = await saveCompanySubscription(company.id, {
        plan,
        employeeLimit: Number.isFinite(limit) ? limit : 10,
        features,
      });
      setBanner(
        "error" in result
          ? { variant: "error", text: result.error }
          : { variant: "success", text: "Saved." },
      );
    });
  }

  return (
    <div className="max-w-2xl space-y-4">
      {banner && <Banner variant={banner.variant}>{banner.text}</Banner>}

      <Card>
        <div className="mb-3 text-sm font-bold text-ink">Company info</div>
        <InfoRow label="Name" value={company.name} />
        <InfoRow label="Owner" value={company.owner_name} />
        <InfoRow label="Email" value={company.email} />
        <InfoRow label="Mobile" value={company.mobile} />
        <InfoRow label="Company code" value={company.company_code} />
      </Card>

      <Card>
        <div className="mb-3 text-sm font-bold text-ink">Subscription</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Plan</Label>
            <Select
              value={plan}
              onChange={(e) => setPlan(e.target.value as SubscriptionPlan)}
            >
              {SUBSCRIPTION_PLAN_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {titleCase(p)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Employee limit</Label>
            <Input
              type="number"
              min={0}
              value={employeeLimit}
              onChange={(e) => setEmployeeLimit(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-3 text-sm font-bold text-ink">Feature entitlements</div>
        <FeatureToggleList catalog={catalog} enabled={features} onChange={setFeatures} />
      </Card>

      <Card>
        <div className="mb-3 text-sm font-bold text-ink">Status</div>
        <CompanyStatusActions
          companyId={company.id}
          status={status}
          onChanged={(next) => {
            setStatus(next);
            setBanner({ variant: "success", text: "Status updated." });
          }}
          onError={(message) => setBanner({ variant: "error", text: message })}
        />
      </Card>

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving ? "Saving…" : "Save"}
      </Button>

      <DangerZone companyId={company.id} companyName={company.name} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-4 py-1 text-sm">
      <div className="w-28 shrink-0 text-ink-muted">{label}</div>
      <div className="font-medium text-ink">{value || "—"}</div>
    </div>
  );
}
