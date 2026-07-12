"use client";

import { useCallback, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/ToastProvider";
import { listLinkedAccounts, removeLinkedAccount } from "@/app/lib/api-client";
import { useApiResource } from "@/app/lib/use-api-resource";
import { AddLinkedAccountDialog } from "./AddLinkedAccountDialog";

export function LinkedAccountsSection({ screenName }: { screenName: string }) {
  const fetchLinked = useCallback(() => listLinkedAccounts(screenName), [screenName]);
  const { data, loading, error, refresh } = useApiResource(fetchLinked);

  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const { showToast } = useToast();

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await removeLinkedAccount(screenName, removeTarget);
      showToast(`Unlinked "${removeTarget}"`);
      setRemoveTarget(null);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to unlink account", "error");
    } finally {
      setRemoving(false);
    }
  }

  const linkedAccounts = data?.linked_accounts ?? [];

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Linked Accounts</h2>
        <Button variant="secondary" onClick={() => setAddOpen(true)}>
          Link account
        </Button>
      </div>

      {loading && <p className="text-sm text-foreground/70">Loading linked accounts…</p>}
      {error && <p className="text-sm text-aim-danger">{error}</p>}

      {!loading && !error && linkedAccounts.length === 0 && (
        <p className="text-sm text-foreground/50">No linked accounts.</p>
      )}

      {linkedAccounts.length > 0 && (
        <ul className="flex flex-col gap-1">
          {linkedAccounts.map((name) => (
            <li
              key={name}
              className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-border/20"
            >
              <span>{name}</span>
              <Button variant="danger" onClick={() => setRemoveTarget(name)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AddLinkedAccountDialog
        open={addOpen}
        screenName={screenName}
        onClose={() => setAddOpen(false)}
        onAdded={refresh}
      />

      <ConfirmDialog
        open={removeTarget !== null}
        title="Unlink account"
        description={`Remove the link between "${screenName}" and "${removeTarget}"?`}
        confirmLabel="Remove"
        danger
        pending={removing}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
      />
    </div>
  );
}
