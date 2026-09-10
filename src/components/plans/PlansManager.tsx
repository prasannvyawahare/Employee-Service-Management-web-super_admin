"use client";

import { useState, useTransition } from "react";
import { Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PlanCard } from "./PlanCard";
import { PlanFormDialog } from "./PlanFormDialog";
import { deletePlan } from "@/app/(admin)/plans/actions";
import type { Feature, Plan } from "@/types/db";

export function PlansManager({ plans, catalog }: { plans: Plan[]; catalog: Feature[] }) {
  const [formTarget, setFormTarget] = useState<{ open: boolean; plan: Plan | null }>({
    open: false,
    plan: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [banner, setBanner] = useState<{ variant: "success" | "error"; text: string } | null>(
    null,
  );
  const [isDeleting, startDelete] = useTransition();

  function confirmDelete() {
    if (!deleteTarget) return;
    const plan = deleteTarget;
    startDelete(async () => {
      const result = await deletePlan(plan.id);
      setDeleteTarget(null);
      setBanner(
        "error" in result
          ? { variant: "error", text: result.error }
          : { variant: "success", text: "Plan deleted." },
      );
    });
  }

  return (
    <div className="space-y-5">
      {banner && <Banner variant={banner.variant}>{banner.text}</Banner>}

      <div className="flex items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-ink-muted">
          Sell these to prospective clients — bundle features into a named, priced plan.
        </p>
        <Button onClick={() => setFormTarget({ open: true, plan: null })}>
          <Plus size={16} />
          New plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No plans yet"
          description="Create one to start building a pricing sheet."
        />
      ) : (
        <div className="flex flex-wrap gap-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              catalog={catalog}
              onEdit={() => setFormTarget({ open: true, plan })}
              onDelete={() => setDeleteTarget(plan)}
            />
          ))}
        </div>
      )}

      <PlanFormDialog
        key={formTarget.plan?.id ?? "new"}
        open={formTarget.open}
        catalog={catalog}
        existing={formTarget.plan}
        onClose={() => setFormTarget({ open: false, plan: null })}
        onSaved={() => setBanner({ variant: "success", text: "Plan saved." })}
        onError={(message) => setBanner({ variant: "error", text: message })}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete plan?"
        description={`Removes "${deleteTarget?.name}" from the pricing sheet. This does not affect any company already using it.`}
        confirmLabel="Delete"
        tone="danger"
        pending={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
