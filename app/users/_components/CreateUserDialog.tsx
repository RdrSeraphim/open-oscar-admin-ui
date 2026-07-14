"use client";

import { useState } from "react";
import { PromptDialog } from "@/app/components/ui/PromptDialog";
import { createUser } from "@/app/lib/api-client";
import { useToast } from "@/app/components/ui/ToastProvider";

export function CreateUserDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [screenName, setScreenName] = useState("");
  const [password, setPassword] = useState("");
  const { showToast } = useToast();

  function reset() {
    setScreenName("");
    setPassword("");
  }

  return (
    <PromptDialog
      open={open}
      title="Create user"
      submitLabel="Create"
      pendingLabel="Creating…"
      fields={[
        { label: "Screen name", value: screenName, onChange: setScreenName },
        { label: "Password", value: password, onChange: setPassword, type: "password" },
      ]}
      onSubmit={async () => {
        await createUser(screenName, password);
        showToast(`Created user "${screenName}"`);
        onCreated();
      }}
      onClose={() => {
        reset();
        onClose();
      }}
    />
  );
}
