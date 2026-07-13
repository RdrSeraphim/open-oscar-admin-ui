"use client";

import { FormEvent, useCallback, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/ToastProvider";
import { createKeyword, deleteKeyword, listKeywords } from "@/app/lib/api-client";
import { useApiResource } from "@/app/lib/use-api-resource";

export function CategoryKeywords({ categoryId }: { categoryId: number }) {
  const fetchKeywords = useCallback(() => listKeywords(categoryId), [categoryId]);
  const { data: keywords, loading, error, refresh } = useApiResource(fetchKeywords);

  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ id: number; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const { showToast } = useToast();

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    try {
      await createKeyword(categoryId, name);
      showToast(`Added keyword "${name}"`);
      setName("");
      refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add keyword");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await deleteKeyword(removeTarget.id);
      showToast(`Removed keyword "${removeTarget.name}"`);
      setRemoveTarget(null);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to remove keyword", "error");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="border-t border-border px-4 py-3">
      {loading && <p className="text-sm text-foreground/70">Loading keywords…</p>}
      {error && <p className="text-sm text-aim-danger">{error}</p>}

      {keywords && keywords.length === 0 && (
        <p className="text-sm text-foreground/50">No keywords in this category.</p>
      )}

      {keywords && keywords.length > 0 && (
        <ul className="mb-3 flex flex-col gap-1">
          {keywords.map((keyword) => (
            <li
              key={keyword.id}
              className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-border/20"
            >
              <span>{keyword.name}</span>
              <Button
                variant="danger"
                onClick={() => setRemoveTarget({ id: keyword.id, name: keyword.name })}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs">
          Add keyword
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
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
        title="Remove keyword"
        description={`Remove keyword "${removeTarget?.name}"?`}
        confirmLabel="Remove"
        danger
        pending={removing}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
      />
    </div>
  );
}
