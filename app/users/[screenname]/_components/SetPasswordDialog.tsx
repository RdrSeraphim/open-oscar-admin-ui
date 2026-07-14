"use client";

import { useState } from "react";
import { PromptDialog } from "@/app/components/ui/PromptDialog";
import { setPassword } from "@/app/lib/api-client";
import { useToast } from "@/app/components/ui/ToastProvider";

export function SetPasswordDialog({
  open,
  screenName,
  onClose,
}: {
  open: boolean;
  screenName: string;
  onClose: () => void;
}) {
  const [password, setPasswordValue] = useState("");
  const { showToast } = useToast();

  return (
    <PromptDialog
      open={open}
      title="Set password"
      submitLabel="Save"
      pendingLabel="Saving…"
      fields={[
        { label: "New password", value: password, onChange: setPasswordValue, type: "password" },
      ]}
      onSubmit={async () => {
        await setPassword(screenName, password);
        showToast(`Password updated for "${screenName}"`);
      }}
      onClose={() => {
        setPasswordValue("");
        onClose();
      }}
    />
  );
}
