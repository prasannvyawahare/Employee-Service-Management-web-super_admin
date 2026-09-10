"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Label, Input, Textarea, Select } from "@/components/ui/Field";
import { Checkbox } from "@/components/ui/Checkbox";
import { FeatureToggleList } from "@/components/features/FeatureToggleList";
import { createPlan, updatePlan } from "@/app/(admin)/plans/actions";
import type { Feature, Plan } from "@/types/db";

export function PlanFormDialog({
  open,
  catalog,
  existing,
  onClose,
  onSaved,
  onError,
}: {
  open: boolean;
  catalog: Feature[];
  existing: Plan | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const isEdit = existing !== null;

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [price, setPrice] = useState(String(existing?.price ?? 0));
  const [billingPeriod, setBillingPeriod] = useState(existing?.billing_period ?? "monthly");
  const [isActive, setIsActive] = useState(existing?.is_active ?? true);
  const [features, setFeatures] = useState<Record<string, boolean>>(() => {
    const existingKeys = new Set((existing?.plan_features ?? []).map((f) => f.feature_key));
    return Object.fromEntries(
      catalog.map((f) => [f.key, f.category === "core" || existingKeys.has(f.key)]),
    );
  });
  const [isPending, startTransition] = useTransition();

  const priceValue = Number.parseFloat(price);
  const isValid = name.trim().length > 0 && Number.isFinite(priceValue);

  function handleSave() {
    if (!isValid) return;
    const featureKeys = Object.entries(features)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key);
    const input = {
      name: name.trim(),
      description: description.trim() || null,
      price: priceValue,
      billingPeriod,
      featureKeys,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updatePlan(existing!.id, { ...input, isActive })
        : await createPlan(input);

      if ("error" in result) {
        onError(result.error);
      } else {
        onSaved();
      }
      onClose();
    });
  }

  return (
    <ConfirmDialog
      open={open}
      title={isEdit ? "Edit plan" : "New plan"}
      confirmLabel={isEdit ? "Save" : "Create"}
      pending={isPending}
      confirmDisabled={!isValid}
      onConfirm={handleSave}
      onCancel={onClose}
    >
      <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        <div>
          <Label>Plan name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Description (optional)</Label>
          <Textarea
            rows={2}
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Price (₹)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div>
            <Label>Billing</Label>
            <Select
              value={billingPeriod}
              onChange={(e) =>
                setBillingPeriod(e.target.value as Plan["billing_period"])
              }
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </div>
        </div>
        {isEdit && (
          <Checkbox
            label="Active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
        )}
        <div>
          <div className="mb-1 text-sm font-semibold text-ink">Included features</div>
          <FeatureToggleList catalog={catalog} enabled={features} onChange={setFeatures} />
        </div>
      </div>
    </ConfirmDialog>
  );
}
