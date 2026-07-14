"use client";

import { useState } from "react";
import { PromptDialog } from "@/app/components/ui/PromptDialog";
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

  function reset() {
    setAppName("");
    setAllowedOrigins("");
    setCapabilities("");
    setRateLimit("60");
  }

  return (
    <PromptDialog
      open={open}
      title="Create Web API key"
      submitLabel="Create"
      pendingLabel="Creating…"
      fields={[
        { label: "App name", value: appName, onChange: setAppName },
        {
          label: "Rate limit (requests/min)",
          value: rateLimit,
          onChange: setRateLimit,
          type: "number",
          min: 1,
        },
        {
          label: "Allowed origins",
          value: allowedOrigins,
          onChange: setAllowedOrigins,
          required: false,
          placeholder: "https://example.com, https://app.example.com",
          helperText: "Comma-separated. Leave blank to allow all origins.",
        },
        {
          label: "Capabilities",
          value: capabilities,
          onChange: setCapabilities,
          required: false,
          placeholder: "aim.session, presence.get, im.send",
          helperText: "Comma-separated. Leave blank to allow all capabilities.",
        },
      ]}
      onSubmit={async () => {
        const key = await createApiKey({
          app_name: appName,
          allowed_origins: parseList(allowedOrigins),
          capabilities: parseList(capabilities),
          rate_limit: Number(rateLimit),
        });
        onCreated(key);
      }}
      onClose={() => {
        reset();
        onClose();
      }}
    />
  );
}
