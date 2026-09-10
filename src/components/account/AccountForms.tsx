"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { Label, Input } from "@/components/ui/Field";
import { updateProfileName, changePassword } from "@/app/(admin)/account/actions";

export function AccountForms({
  email,
  fullName: initialFullName,
}: {
  email: string;
  fullName: string;
}) {
  return (
    <div className="max-w-lg space-y-4">
      <ProfileCard email={email} initialFullName={initialFullName} />
      <PasswordCard />
    </div>
  );
}

function ProfileCard({ email, initialFullName }: { email: string; initialFullName: string }) {
  const [fullName, setFullName] = useState(initialFullName);
  const [banner, setBanner] = useState<{ variant: "success" | "error"; text: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateProfileName(fullName.trim());
      setBanner(
        "error" in result
          ? { variant: "error", text: result.error }
          : { variant: "success", text: "Saved." },
      );
    });
  }

  return (
    <Card>
      <div className="mb-3 text-sm font-bold text-ink">Profile</div>
      {banner && (
        <div className="mb-3">
          <Banner variant={banner.variant}>{banner.text}</Banner>
        </div>
      )}
      <Label>Email</Label>
      <p className="mb-3 text-sm font-medium text-ink">{email}</p>
      <Label>Full name</Label>
      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={save} disabled={isPending}>
          {isPending ? "Saving…" : "Save name"}
        </Button>
      </div>
    </Card>
  );
}

function PasswordCard() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [banner, setBanner] = useState<{ variant: "success" | "error"; text: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  function save() {
    if (newPassword.length < 6) {
      setBanner({ variant: "error", text: "Password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setBanner({ variant: "error", text: "Passwords do not match." });
      return;
    }
    startTransition(async () => {
      const result = await changePassword(newPassword);
      if ("error" in result) {
        setBanner({ variant: "error", text: result.error });
      } else {
        setBanner({ variant: "success", text: "Password updated." });
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  }

  return (
    <Card>
      <div className="mb-3 text-sm font-bold text-ink">Change password</div>
      {banner && (
        <div className="mb-3">
          <Banner variant={banner.variant}>{banner.text}</Banner>
        </div>
      )}
      <Label>New password</Label>
      <Input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="mb-3"
      />
      <Label>Confirm new password</Label>
      <Input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={save} disabled={isPending}>
          {isPending ? "Updating…" : "Update password"}
        </Button>
      </div>
    </Card>
  );
}
