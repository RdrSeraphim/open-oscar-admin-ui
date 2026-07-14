"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";

export interface PromptDialogField {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password" | "number";
  required?: boolean;
  min?: number;
  placeholder?: string;
  helperText?: string;
}

export function PromptDialog({
  open,
  title,
  fields,
  submitLabel,
  pendingLabel,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  fields: PromptDialogField[];
  submitLabel: string;
  pendingLabel: string;
  onSubmit: () => Promise<void>;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onSubmit();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <label key={field.label} className="flex flex-col gap-1 text-sm">
            {field.label}
            <input
              required={field.required ?? true}
              autoFocus={index === 0}
              type={field.type ?? "text"}
              min={field.type === "number" ? field.min : undefined}
              placeholder={field.placeholder}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
            {field.helperText && (
              <span className="text-xs text-foreground/50">{field.helperText}</span>
            )}
          </label>
        ))}
        {error && <p className="text-sm text-aim-danger">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? pendingLabel : submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
