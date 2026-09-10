"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Ban, PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { CompanyStatus } from "@/lib/status";
import { updateCompanyStatus } from "@/app/(admin)/companies/[id]/actions";

type Transition = {
  target: CompanyStatus;
  label: string;
  message: string;
  icon: typeof CheckCircle2;
  tone: "default" | "danger";
};

/**
 * Approve/Block/Suspend/Reactivate for `companies.status`. Block/Suspend are
 * access-affecting (00037's status-lockout RLS signs the tenant out on its
 * next request), so every transition here is behind a confirm dialog — same
 * discipline as the Flutter reference's `CompanyStatusActions`, same copy.
 */
export function CompanyStatusActions({
  companyId,
  status,
  onChanged,
  onError,
}: {
  companyId: string;
  status: CompanyStatus;
  onChanged: (status: CompanyStatus) => void;
  onError: (message: string) => void;
}) {
  const [pendingTransition, setPendingTransition] = useState<Transition | null>(null);
  const [isPending, startTransition] = useTransition();

  const transitions: Transition[] = [];
  if (status !== "approved") {
    transitions.push({
      target: "approved",
      label: "Approve",
      icon: CheckCircle2,
      tone: "default",
      message:
        "Approve this company? It will gain full access based on its assigned plan and features.",
    });
  }
  if (status !== "blocked") {
    transitions.push({
      target: "blocked",
      label: "Block",
      icon: Ban,
      tone: "danger",
      message:
        "Block this company? Its admin and all employees will be signed out and denied access until reactivated.",
    });
  }
  if (status !== "suspended") {
    transitions.push({
      target: "suspended",
      label: "Suspend",
      icon: PauseCircle,
      tone: "danger",
      message:
        "Suspend this company? Its admin and all employees will be signed out and denied access until reactivated.",
    });
  }
  if (status === "blocked" || status === "suspended") {
    transitions.push({
      target: "approved",
      label: "Reactivate",
      icon: PlayCircle,
      tone: "default",
      message: "Reactivate this company? Access will be restored immediately.",
    });
  }

  function confirm() {
    if (!pendingTransition) return;
    const target = pendingTransition.target;
    startTransition(async () => {
      const result = await updateCompanyStatus(companyId, target);
      setPendingTransition(null);
      if ("error" in result) onError(result.error);
      else onChanged(target);
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => (
          <Button
            key={t.label}
            variant="secondary"
            size="sm"
            onClick={() => setPendingTransition(t)}
          >
            <t.icon size={14} />
            {t.label}
          </Button>
        ))}
      </div>

      <ConfirmDialog
        open={pendingTransition !== null}
        title={`${pendingTransition?.label ?? ""} company?`}
        description={pendingTransition?.message}
        confirmLabel={pendingTransition?.label}
        tone={pendingTransition?.tone}
        pending={isPending}
        onConfirm={confirm}
        onCancel={() => setPendingTransition(null)}
      />
    </>
  );
}
