"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Field";
import { Banner } from "@/components/ui/Banner";
import { deleteCompany } from "@/app/(admin)/companies/[id]/actions";

export function DangerZone({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setConfirmText("");
  }

  function confirm() {
    startTransition(async () => {
      const result = await deleteCompany(companyId);
      if (result && "error" in result) setError(result.error);
      // On success, deleteCompany() redirects — this line never runs.
    });
  }

  return (
    <Card className="border-bad/30 bg-bad-soft/40">
      <div className="text-sm font-bold text-bad">Danger zone</div>
      <p className="mt-1.5 max-w-2xl text-xs text-ink-muted">
        Permanently deletes this company and everything tied to it — employees, attendance, leave,
        payments, salary records, sites, customers, documents, and the admin/employee login accounts
        themselves. This cannot be undone.
      </p>
      {error && (
        <div className="mt-3">
          <Banner variant="error">Could not delete company: {error}</Banner>
        </div>
      )}
      <div className="mt-3">
        <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
          <Trash2 size={14} />
          Delete company
        </Button>
      </div>

      <ConfirmDialog
        open={open}
        title="Delete company?"
        description={`This permanently deletes "${companyName}" and all its data, including its users' login accounts. There is no undo. Type the company name to confirm:`}
        confirmLabel="Delete permanently"
        tone="danger"
        pending={isPending}
        confirmDisabled={confirmText.trim() !== companyName}
        onConfirm={confirm}
        onCancel={close}
      >
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={companyName}
          autoFocus
        />
      </ConfirmDialog>
    </Card>
  );
}
