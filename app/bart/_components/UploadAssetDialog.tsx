"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { md5 } from "js-md5";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";
import { uploadBartAsset } from "@/app/lib/api-client";
import { useToast } from "@/app/components/ui/ToastProvider";

export function UploadAssetDialog({
  open,
  type,
  onClose,
  onUploaded,
}: {
  open: boolean;
  type: number;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  function reset() {
    setFile(null);
    setHash("");
    setError(null);
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected) {
      const bytes = await selected.arrayBuffer();
      setHash(md5(bytes));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setPending(true);
    setError(null);
    try {
      await uploadBartAsset(hash, type, file);
      showToast(`Uploaded asset "${hash}"`);
      reset();
      onUploaded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload asset");
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
      title="Upload asset"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          File
          <input
            required
            type="file"
            onChange={handleFileChange}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Hash
          <input
            required
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            pattern="[0-9a-fA-F]+"
            className="rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm"
          />
          <span className="text-xs text-foreground/50">
            Auto-filled with the MD5 of the selected file. Edit only if you need a
            different hash.
          </span>
        </label>
        {error && <p className="text-sm text-aim-danger">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={pending || !file}>
            {pending ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
