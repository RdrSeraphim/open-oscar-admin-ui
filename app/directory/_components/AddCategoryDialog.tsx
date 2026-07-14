"use client";

import { useState } from "react";
import { PromptDialog } from "@/app/components/ui/PromptDialog";
import { createCategory } from "@/app/lib/api-client";
import { useToast } from "@/app/components/ui/ToastProvider";

export function AddCategoryDialog({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const { showToast } = useToast();

  return (
    <PromptDialog
      open={open}
      title="Add category"
      submitLabel="Add"
      pendingLabel="Adding…"
      fields={[{ label: "Category name", value: name, onChange: setName }]}
      onSubmit={async () => {
        await createCategory(name);
        showToast(`Added category "${name}"`);
        onAdded();
      }}
      onClose={() => {
        setName("");
        onClose();
      }}
    />
  );
}
