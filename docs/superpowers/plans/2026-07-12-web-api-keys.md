# Web API Keys Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin list, create, edit, and delete Web AIM API keys at `/api-keys` (replacing the current "coming soon" placeholder) — the last remaining nav section.

**Architecture:** Same conventions as every other section, plus one new wrinkle: `POST /admin/webapi/keys` returns a `dev_key` secret that is never shown again by any other endpoint, so creation is a two-step UI flow (create dialog → a second "reveal" dialog showing the secret once, with copy-to-clipboard).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4. No test runner configured — verification is `npx tsc --noEmit` + `npm run lint` per task, plus a final live-server walkthrough.

## Global Constraints

- Full CRUD: list, create, edit (all five mutable fields — app_name, is_active, rate_limit, allowed_origins, capabilities — in one dialog, per explicit choice over a separate inline toggle), delete.
- `allowed_origins` and `capabilities` are both entered as comma-separated text and split/trimmed on save (per explicit choice over a textarea or tag input).
- **`EditApiKeyDialog` must NOT use `useEffect` to sync its `apiKey` prop into local form state.** This codebase hit exactly that lint failure once already (`react-hooks/set-state-in-effect`) in an earlier feature and fixed it by switching to conditional-mount-with-`useState`-initializers instead — see `app/directory/_components/CategoryKeywords.tsx` for the established pattern (parent only renders the child when there's a target, optionally keyed for defensive remount-on-change). `EditApiKeyDialog` takes a **non-null** `apiKey: WebAPIKey` prop (not `WebAPIKey | null`) and initializes its `useState` calls directly from it; the page only renders `<EditApiKeyDialog>` inside an `{editTarget && (...)}` block, keyed on `editTarget.dev_id`.
- `KeyRevealDialog` is intentionally shaped differently from every other dialog in this app: instead of a separate `open: boolean` prop, it takes `devKey: string | null` directly and treats `devKey !== null` as its open state. This avoids the page needing two pieces of state (a boolean *and* the revealed value) that would always be set/cleared together — deliberate, not an inconsistency to "fix" to match other dialogs.
- Reuse existing primitives (`Dialog`, `ConfirmDialog`, `Button`, `Badge`, `PageHeader`, `Table`/`Thead`/`Tbody`/`Tr`/`Th`/`Td`, `useToast`, `useApiResource`) — no new UI primitives. Clipboard copy uses the browser's native `navigator.clipboard.writeText` — no new dependency.
- All new client components/pages need `"use client"` at the top.

---

### Task 1: Extend shared lib — types and api-client functions

**Files:**
- Modify: `app/lib/types.ts` (append at end of file)
- Modify: `app/lib/api-client.ts`

**Interfaces:**
- Produces: `WebAPIKey { dev_id: string; app_name: string; created_at: string; last_used: string | null; is_active: boolean; rate_limit: number; allowed_origins: string[]; capabilities: string[] }`, `CreatedWebAPIKey extends WebAPIKey { dev_key: string }` (types)
- Produces: `listApiKeys(): Promise<WebAPIKey[]>`, `createApiKey(patch: {app_name: string; allowed_origins?: string[]; rate_limit?: number; capabilities?: string[]}): Promise<CreatedWebAPIKey>`, `updateApiKey(devId: string, patch: {app_name?: string; is_active?: boolean; rate_limit?: number; allowed_origins?: string[]; capabilities?: string[]}): Promise<WebAPIKey>`, `deleteApiKey(devId: string): Promise<void>` (functions, consumed by Task 2 and Task 3)

- [ ] **Step 1: Append the new types**

Add to the end of `app/lib/types.ts`:

```ts
export interface WebAPIKey {
  dev_id: string;
  app_name: string;
  created_at: string;
  last_used: string | null;
  is_active: boolean;
  rate_limit: number;
  allowed_origins: string[];
  capabilities: string[];
}

export interface CreatedWebAPIKey extends WebAPIKey {
  dev_key: string;
}
```

- [ ] **Step 2: Update the import line in `app/lib/api-client.ts`**

Current:

```ts
import type {
  Account,
  BartAsset,
  BuddyGroup,
  Category,
  Keyword,
  LinkedAccountsResponse,
  PrivateRoom,
  PublicRoom,
  SessionsResponse,
  User,
  VersionInfo,
} from "./types";
```

Replace with:

```ts
import type {
  Account,
  BartAsset,
  BuddyGroup,
  Category,
  CreatedWebAPIKey,
  Keyword,
  LinkedAccountsResponse,
  PrivateRoom,
  PublicRoom,
  SessionsResponse,
  User,
  VersionInfo,
  WebAPIKey,
} from "./types";
```

- [ ] **Step 3: Append the new api-client functions**

Add to the end of `app/lib/api-client.ts` (after the existing `deleteBartAsset` function):

```ts
export function listApiKeys(): Promise<WebAPIKey[]> {
  return apiFetch<WebAPIKey[]>("/admin/webapi/keys");
}

export function createApiKey(patch: {
  app_name: string;
  allowed_origins?: string[];
  rate_limit?: number;
  capabilities?: string[];
}): Promise<CreatedWebAPIKey> {
  return apiFetch<CreatedWebAPIKey>("/admin/webapi/keys", {
    method: "POST",
    body: JSON.stringify(patch),
  });
}

export function updateApiKey(
  devId: string,
  patch: {
    app_name?: string;
    is_active?: boolean;
    rate_limit?: number;
    allowed_origins?: string[];
    capabilities?: string[];
  },
): Promise<WebAPIKey> {
  return apiFetch<WebAPIKey>(`/admin/webapi/keys/${encodeURIComponent(devId)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function deleteApiKey(devId: string): Promise<void> {
  return apiFetch(`/admin/webapi/keys/${encodeURIComponent(devId)}`, {
    method: "DELETE",
  });
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 5: Commit**

```bash
git add app/lib/types.ts app/lib/api-client.ts
git commit -m "Add Web API key types and api-client functions"
```

---

### Task 2: API key components — `CreateApiKeyDialog`, `KeyRevealDialog`, `EditApiKeyDialog`

**Files:**
- Create: `app/api-keys/_components/CreateApiKeyDialog.tsx`
- Create: `app/api-keys/_components/KeyRevealDialog.tsx`
- Create: `app/api-keys/_components/EditApiKeyDialog.tsx`

**Interfaces:**
- Consumes: `createApiKey`, `updateApiKey` from Task 1; `WebAPIKey`, `CreatedWebAPIKey` types from Task 1; `Dialog`, `Button` from `app/components/ui/`; `useToast` from `app/components/ui/ToastProvider.tsx`.
- Produces: `CreateApiKeyDialog({ open, onClose, onCreated: (key: CreatedWebAPIKey) => void })`, `KeyRevealDialog({ devKey: string | null, onClose })`, `EditApiKeyDialog({ apiKey: WebAPIKey, onClose, onSaved })` — all consumed by Task 3's `page.tsx`.

- [ ] **Step 1: Create `CreateApiKeyDialog.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `KeyRevealDialog.tsx`**

```tsx
"use client";

import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";
import { useToast } from "@/app/components/ui/ToastProvider";

export function KeyRevealDialog({
  devKey,
  onClose,
}: {
  devKey: string | null;
  onClose: () => void;
}) {
  const { showToast } = useToast();

  async function handleCopy() {
    if (!devKey) return;
    await navigator.clipboard.writeText(devKey);
    showToast("Copied to clipboard");
  }

  return (
    <Dialog open={devKey !== null} onClose={onClose} title="Key created">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-aim-danger">
          Copy this key now — it won&apos;t be shown again.
        </p>
        <div className="break-all rounded-md border border-border bg-background p-2 font-mono text-sm">
          {devKey}
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={handleCopy}>
            Copy
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create `EditApiKeyDialog.tsx`**

Note the `apiKey` prop is non-null (see Global Constraints) — no `useEffect` sync.

```tsx
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
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 5: Commit**

```bash
git add app/api-keys/_components/
git commit -m "Add Web API key components: CreateApiKeyDialog, KeyRevealDialog, EditApiKeyDialog"
```

---

### Task 3: Replace `/api-keys` placeholder with the real page

**Files:**
- Modify: `app/api-keys/page.tsx` (full rewrite — currently a `ComingSoon` placeholder)

**Interfaces:**
- Consumes: `listApiKeys`, `deleteApiKey` from Task 1; `CreateApiKeyDialog`, `KeyRevealDialog`, `EditApiKeyDialog` from Task 2; `PageHeader`, `Badge`, `Button`, `ConfirmDialog`, `Table`/`Thead`/`Tbody`/`Tr`/`Th`/`Td` from `app/components/ui/`; `useToast` from `app/components/ui/ToastProvider.tsx`; `useApiResource` from `app/lib/use-api-resource.ts`; `CreatedWebAPIKey`, `WebAPIKey` types from `app/lib/types.ts`.
- Produces: nothing consumed by later tasks — this is a leaf page.

- [ ] **Step 1: Replace the file contents**

Current `app/api-keys/page.tsx`:

```tsx
import { ComingSoon } from "@/app/components/ui/ComingSoon";

export default function ApiKeysPage() {
  return (
    <ComingSoon
      title="Web API Keys"
      description="Issue and manage Web AIM API keys, rate limits, and allowed origins. See docs/api.yml (/admin/webapi/keys/*) for the underlying API."
    />
  );
}
```

Replace it entirely with:

```tsx
"use client";

import { useState } from "react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/app/components/ui/Table";
import { useToast } from "@/app/components/ui/ToastProvider";
import { deleteApiKey, listApiKeys } from "@/app/lib/api-client";
import { useApiResource } from "@/app/lib/use-api-resource";
import type { CreatedWebAPIKey, WebAPIKey } from "@/app/lib/types";
import { CreateApiKeyDialog } from "./_components/CreateApiKeyDialog";
import { EditApiKeyDialog } from "./_components/EditApiKeyDialog";
import { KeyRevealDialog } from "./_components/KeyRevealDialog";

export default function ApiKeysPage() {
  const { data: keys, loading, error, refresh } = useApiResource(listApiKeys);

  const [createOpen, setCreateOpen] = useState(false);
  const [revealedKey, setRevealedKey] = useState<CreatedWebAPIKey | null>(null);
  const [editTarget, setEditTarget] = useState<WebAPIKey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WebAPIKey | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  function handleCreated(key: CreatedWebAPIKey) {
    refresh();
    setRevealedKey(key);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteApiKey(deleteTarget.dev_id);
      showToast(`Deleted key "${deleteTarget.app_name}"`);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete key", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Web API Keys"
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            Create key
          </Button>
        }
      />

      {loading && <p className="text-sm text-foreground/70">Loading keys…</p>}
      {error && <p className="text-sm text-aim-danger">{error}</p>}

      {keys && (
        <Table>
          <Thead>
            <Tr>
              <Th>App name</Th>
              <Th>Dev ID</Th>
              <Th>Status</Th>
              <Th>Rate limit</Th>
              <Th>Created</Th>
              <Th>Last used</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {keys.length === 0 && (
              <Tr>
                <Td colSpan={7} className="py-6 text-center text-foreground/60">
                  No API keys yet.
                </Td>
              </Tr>
            )}
            {keys.map((key) => (
              <Tr key={key.dev_id}>
                <Td className="font-medium">{key.app_name}</Td>
                <Td className="font-mono text-xs">{key.dev_id}</Td>
                <Td>
                  <Badge tone={key.is_active ? "green" : "neutral"}>
                    {key.is_active ? "active" : "inactive"}
                  </Badge>
                </Td>
                <Td>{key.rate_limit}/min</Td>
                <Td>{new Date(key.created_at).toLocaleString()}</Td>
                <Td>{key.last_used ? new Date(key.last_used).toLocaleString() : "never"}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setEditTarget(key)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => setDeleteTarget(key)}>
                      Delete
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <CreateApiKeyDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      <KeyRevealDialog devKey={revealedKey?.dev_key ?? null} onClose={() => setRevealedKey(null)} />

      {editTarget && (
        <EditApiKeyDialog
          key={editTarget.dev_id}
          apiKey={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={refresh}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete API key"
        description={`Are you sure you want to delete "${deleteTarget?.app_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        pending={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 3: Commit**

```bash
git add app/api-keys/page.tsx
git commit -m "Replace Web API Keys placeholder with list/create/edit/delete UI"
```

---

### Task 4: Live-server verification pass

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Confirm the dev server is up against a real open-oscar-server**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:PORT/
```

(Use whatever port `npm run dev` actually bound.)

- [ ] **Step 2: Create a throwaway key and capture the `dev_key`**

```bash
curl -s -X POST http://localhost:PORT/api/admin/webapi/keys \
  -H "Content-Type: application/json" \
  -d '{"app_name":"aimctl-verify","rate_limit":60}'
```

Expected: `201` with a JSON body containing `dev_id` and `dev_key`. Note both — this confirms the reveal-once flow has real data to show. Note the `dev_id` for the next steps.

- [ ] **Step 3: List and confirm it appears; update it**

```bash
curl -s http://localhost:PORT/api/admin/webapi/keys
curl -s -X PUT http://localhost:PORT/api/admin/webapi/keys/DEV_ID \
  -H "Content-Type: application/json" \
  -d '{"app_name":"aimctl-verify","is_active":false,"rate_limit":120,"allowed_origins":["https://example.com"],"capabilities":["im.send"]}'
curl -s http://localhost:PORT/api/admin/webapi/keys/DEV_ID
```

Expected: the key present in the list; `200` from the PUT; the follow-up GET reflects `is_active: false`, `rate_limit: 120`, and the updated `allowed_origins`/`capabilities`.

- [ ] **Step 4: Delete it and confirm cleanup**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:PORT/api/admin/webapi/keys/DEV_ID
curl -s http://localhost:PORT/api/admin/webapi/keys
```

Expected: `204` from the delete; the key gone from the follow-up list.

- [ ] **Step 5: Check the dev server log for errors**

```bash
grep -i error /tmp/aimctl-dev.log
```

Expected: no matches from the requests made in this task. If any endpoint in Steps 2-4 isn't implemented on the live test server, treat that as a test-environment finding to report, not a code defect.
