"use client";

import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";
import { useToast } from "@/app/components/ui/ToastProvider";

export function KeyRevealDialog({
  devKey,
  onClose,
}: {
  devKey: string | null;
  onClose: () => void;
}) {
  const { showToast } = useToast();

  async function handleCopy() {
    if (!devKey) return;
    await navigator.clipboard.writeText(devKey);
    showToast("Copied to clipboard");
  }

  return (
    <Dialog open={devKey !== null} onClose={onClose} title="Key created">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-aim-danger">
          Copy this key now — it won&apos;t be shown again.
        </p>
        <div className="break-all rounded-md border border-border bg-background p-2 font-mono text-sm">
          {devKey}
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={handleCopy}>
            Copy
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
