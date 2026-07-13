"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";
import { createApiKey } from "@/app/lib/api-client";
import type { CreatedWebAPIKey } from "@/app/lib/types";

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export function CreateApiKeyDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (key: CreatedWebAPIKey) => void;
}) {
  const [appName, setAppName] = useState("");
  const [allowedOrigins, setAllowedOrigins] = useState("");
  const [capabilities, setCapabilities] = useState("");
  const [rateLimit, setRateLimit] = useState("60");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setAppName("");
    setAllowedOrigins("");
    setCapabilities("");
    setRateLimit("60");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const key = await createApiKey({
        app_name: appName,
        allowed_origins: parseList(allowedOrigins),
        capabilities: parseList(capabilities),
        rate_limit: Number(rateLimit),
      });
      reset();
      onCreated(key);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
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
      title="Create Web API key"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
            {pending ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
