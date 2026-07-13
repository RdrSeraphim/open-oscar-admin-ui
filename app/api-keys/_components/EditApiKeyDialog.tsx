"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";
import { updateApiKey } from "@/app/lib/api-client";
import { useToast } from "@/app/components/ui/ToastProvider";
import type { WebAPIKey } from "@/app/lib/types";

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export function EditApiKeyDialog({
  apiKey,
  onClose,
  onSaved,
}: {
  apiKey: WebAPIKey;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [appName, setAppName] = useState(apiKey.app_name);
  const [isActive, setIsActive] = useState(apiKey.is_active);
  const [rateLimit, setRateLimit] = useState(String(apiKey.rate_limit));
  const [allowedOrigins, setAllowedOrigins] = useState(apiKey.allowed_origins.join(", "));
  const [capabilities, setCapabilities] = useState(apiKey.capabilities.join(", "));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await updateApiKey(apiKey.dev_id, {
        app_name: appName,
        is_active: isActive,
        rate_limit: Number(rateLimit),
        allowed_origins: parseList(allowedOrigins),
        capabilities: parseList(capabilities),
      });
      showToast(`Updated key "${appName}"`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update key");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Edit Web API key">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Dev ID
          <input
            disabled
            value={apiKey.dev_id}
            className="rounded-md border border-border bg-border/20 px-2 py-1.5 font-mono text-sm text-foreground/60"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          App name
          <input
            required
            autoFocus
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 accent-aim-blue"
          />
          Active
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Rate limit (requests/min)
          <input
            required
            type="number"
            min={1}
            value={rateLimit}
            onChange={(e) => setRateLimit(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Allowed origins
          <input
            value={allowedOrigins}
            onChange={(e) => setAllowedOrigins(e.target.value)}
            placeholder="https://example.com, https://app.example.com"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <span className="text-xs text-foreground/50">
            Comma-separated. Leave blank to allow all origins.
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Capabilities
          <input
            value={capabilities}
            onChange={(e) => setCapabilities(e.target.value)}
            placeholder="aim.session, presence.get, im.send"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <span className="text-xs text-foreground/50">
            Comma-separated. Leave blank to allow all capabilities.
          </span>
        </label>
        {error && <p className="text-sm text-aim-danger">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
