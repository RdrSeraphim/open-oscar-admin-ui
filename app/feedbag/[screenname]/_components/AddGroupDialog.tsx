"use client";

import { useState } from "react";
import { PromptDialog } from "@/app/components/ui/PromptDialog";
import { addGroup } from "@/app/lib/api-client";
import { useToast } from "@/app/components/ui/ToastProvider";

export function AddGroupDialog({
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
  const [groupName, setGroupName] = useState("");
  const { showToast } = useToast();

  return (
    <PromptDialog
      open={open}
      title="Add group"
      submitLabel="Add"
      pendingLabel="Adding…"
      fields={[{ label: "Group name", value: groupName, onChange: setGroupName }]}
      onSubmit={async () => {
        await addGroup(screenName, groupName);
        showToast(`Added group "${groupName}"`);
        onAdded();
      }}
      onClose={() => {
        setGroupName("");
        onClose();
      }}
    />
  );
}
