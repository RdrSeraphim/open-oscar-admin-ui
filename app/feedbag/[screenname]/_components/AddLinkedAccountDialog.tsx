"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";
import { addLinkedAccount } from "@/app/lib/api-client";
import { useToast } from "@/app/components/ui/ToastProvider";

export function AddLinkedAccountDialog({
  open,
  screenName,
  onClose,
  onAdded,
}: {
  open: boolean;
  screenName: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [linkedScreenName, setLinkedScreenName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  function reset() {
    setLinkedScreenName("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await addLinkedAccount(screenName, linkedScreenName);
      showToast(`Linked "${linkedScreenName}"`);
      reset();
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link account");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Link account"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Screen name to link
          <input
            required
            autoFocus
            value={linkedScreenName}
            onChange={(e) => setLinkedScreenName(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        {error && <p className="text-sm text-aim-danger">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Linking…" : "Link"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
