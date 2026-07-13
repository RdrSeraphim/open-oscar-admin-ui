"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/ToastProvider";
import { bartAssetUrl, deleteBartAsset } from "@/app/lib/api-client";
import { isImageType } from "@/app/lib/bart-types";
import type { BartAsset } from "@/app/lib/types";

export function AssetList({
  assets,
  onChanged,
}: {
  assets: BartAsset[];
  onChanged: () => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBartAsset(deleteTarget);
      showToast(`Deleted asset "${deleteTarget}"`);
      setDeleteTarget(null);
      onChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete asset", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (assets.length === 0) {
    return <p className="text-sm text-foreground/50">No assets of this type.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {assets.map((asset) => (
        <div
          key={asset.hash}
          className="flex flex-col items-center gap-2 rounded-md border border-border bg-surface p-3"
        >
          {isImageType(asset.type) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bartAssetUrl(asset.hash)}
              alt=""
              className="h-16 w-16 rounded border border-border object-cover"
            />
          ) : (
            <a
              href={bartAssetUrl(asset.hash)}
              download
              className="text-sm text-aim-blue hover:underline dark:text-aim-blue-light"
            >
              Download
            </a>
          )}
          <span
            className="w-full truncate text-center font-mono text-xs text-foreground/60"
            title={asset.hash}
          >
            {asset.hash}
          </span>
          <Button variant="danger" onClick={() => setDeleteTarget(asset.hash)}>
            Delete
          </Button>
        </div>
      ))}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete asset"
        description={`Delete asset "${deleteTarget}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        pending={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
