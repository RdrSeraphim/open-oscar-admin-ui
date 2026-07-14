"use client";

import { useState } from "react";
import { PromptDialog } from "@/app/components/ui/PromptDialog";
import { createPublicRoom } from "@/app/lib/api-client";
import { useToast } from "@/app/components/ui/ToastProvider";

export function CreateRoomDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const { showToast } = useToast();

  return (
    <PromptDialog
      open={open}
      title="Create room"
      submitLabel="Create"
      pendingLabel="Creating…"
      fields={[{ label: "Room name", value: name, onChange: setName }]}
      onSubmit={async () => {
        await createPublicRoom(name);
        showToast(`Created room "${name}"`);
        onCreated();
      }}
      onClose={() => {
        setName("");
        onClose();
      }}
    />
  );
}
