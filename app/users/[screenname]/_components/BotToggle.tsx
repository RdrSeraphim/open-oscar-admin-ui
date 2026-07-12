"use client";

import { useState } from "react";
import { updateAccount } from "@/app/lib/api-client";
import { useToast } from "@/app/components/ui/ToastProvider";

export function BotToggle({
  screenName,
  isBot,
  onSaved,
}: {
  screenName: string;
  isBot: boolean;
  onSaved: () => void;
}) {
  const [pending, setPending] = useState(false);
  const { showToast } = useToast();

  async function handleChange(checked: boolean) {
    setPending(true);
    try {
      await updateAccount(screenName, { is_bot: checked });
      showToast(checked ? "Marked as bot" : "Unmarked as bot");
      onSaved();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update bot flag", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={isBot}
        disabled={pending}
        onChange={(e) => handleChange(e.target.checked)}
        className="h-4 w-4 accent-aim-blue"
      />
      Bot account
      <span className="text-xs text-foreground/50">
        (exempt from rate limiting)
      </span>
    </label>
  );
}
