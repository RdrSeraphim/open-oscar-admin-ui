"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { updateAccount } from "@/app/lib/api-client";
import { useToast } from "@/app/components/ui/ToastProvider";

const STATUS_OPTIONS = ["", "deleted", "expired", "suspended", "suspended_age"];

export function SuspendedStatusControl({
  screenName,
  currentStatus,
  onSaved,
}: {
  screenName: string;
  currentStatus: string;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(currentStatus);
  const [pending, setPending] = useState(false);
  const { showToast } = useToast();

  const dirty = value !== currentStatus;

  async function handleSave() {
    setPending(true);
    try {
      await updateAccount(screenName, { suspended_status: value || null });
      showToast("Suspended status updated");
      onSaved();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update status", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt === "" ? "active (none)" : opt}
          </option>
        ))}
      </select>
      <Button variant="primary" disabled={!dirty || pending} onClick={handleSave}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
