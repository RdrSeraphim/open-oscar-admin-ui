"use client";

import { useState } from "react";
import { PromptDialog } from "@/app/components/ui/PromptDialog";
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
  const { showToast } = useToast();

  return (
    <PromptDialog
      open={open}
      title="Link account"
      submitLabel="Link"
      pendingLabel="Linking…"
      fields={[
        { label: "Screen name to link", value: linkedScreenName, onChange: setLinkedScreenName },
      ]}
      onSubmit={async () => {
        await addLinkedAccount(screenName, linkedScreenName);
        showToast(`Linked "${linkedScreenName}"`);
        onAdded();
      }}
      onClose={() => {
        setLinkedScreenName("");
        onClose();
      }}
    />
  );
}
