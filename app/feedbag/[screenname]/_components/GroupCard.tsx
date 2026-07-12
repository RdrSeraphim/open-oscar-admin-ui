"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/ToastProvider";
import { addBuddy, removeBuddy } from "@/app/lib/api-client";
import type { BuddyGroup } from "@/app/lib/types";

export function GroupCard({
  screenName,
  group,
  onChanged,
}: {
  screenName: string;
  group: BuddyGroup;
  onChanged: () => void;
}) {
  const [buddyName, setBuddyName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const { showToast } = useToast();

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    try {
      await addBuddy(screenName, group.group_id, buddyName);
      showToast(`Added "${buddyName}" to ${group.group_name}`);
      setBuddyName("");
      onChanged();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add buddy");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await removeBuddy(screenName, group.group_id, removeTarget);
      showToast(`Removed "${removeTarget}" from ${group.group_name}`);
      setRemoveTarget(null);
      onChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to remove buddy", "error");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <h3 className="mb-2 text-sm font-semibold">{group.group_name}</h3>

      {group.buddies.length === 0 ? (
        <p className="text-sm text-foreground/50">No buddies in this group.</p>
      ) : (
        <ul className="mb-3 flex flex-col gap-1">
          {group.buddies.map((buddy) => (
            <li
              key={buddy.item_id}
              className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-border/20"
            >
              <span>{buddy.name}</span>
              <Button variant="danger" onClick={() => setRemoveTarget(buddy.name)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs">
          Add buddy
          <input
            required
            value={buddyName}
            onChange={(e) => setBuddyName(e.target.value)}
            placeholder="Screen name"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <Button type="submit" variant="secondary" disabled={adding}>
          {adding ? "Adding…" : "Add"}
        </Button>
      </form>
      {addError && <p className="mt-1 text-sm text-aim-danger">{addError}</p>}

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove buddy"
        description={`Remove "${removeTarget}" from ${group.group_name}?`}
        confirmLabel="Remove"
        danger
        pending={removing}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
      />
    </div>
  );
}
