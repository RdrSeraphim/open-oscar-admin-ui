# PromptDialog Extraction + useApiResource Stale-Data Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a shared `PromptDialog` primitive and migrate the 7 near-duplicate single/few-field dialogs onto it (fixing a Cancel-doesn't-reset bug in all 7 as a side effect of the new architecture), apply the same reset-on-any-close fix locally to `UploadAssetDialog`, and fix `useApiResource` to reset stale data when its fetcher identity changes.

**Architecture:** `PromptDialog` (`app/components/ui/PromptDialog.tsx`) renders a form from a caller-supplied `fields` array, owns `pending`/`error` state internally, and funnels every close path (Cancel button, Escape, backdrop click, post-submit-success) through one internal `handleClose` that clears its own error state and calls the caller's `onClose`. Field *values* remain controlled by each call site's own `useState`s — only rendering/plumbing moves into the shared component. `useApiResource` gets a `useRef`-based render-phase reset (React's documented "reset state when a prop changes" pattern) so it doesn't retrip the `react-hooks/set-state-in-effect` lint rule.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, yarn.

## Global Constraints

- No new dependencies.
- No changes to any `app/lib/api-client.ts` function signatures or `docs/api.yml`.
- No `open-oscar-server` (server-side) changes — explicitly out of scope for this pass.
- `yarn lint` and `npx tsc --noEmit` must both pass after every task, clean (no new warnings or errors).
- No test framework exists in this project (`package.json` has no test script) — verification is lint + typecheck + manual click-through, matching how every prior feature in this project was verified.
- Match existing Tailwind class strings exactly where a pattern already exists (input styling, button variants, error text, helper text) — no visual/styling changes are intended, only structural deduplication.
- Every `PromptDialog` close path (Cancel button, Escape, backdrop click, post-submit-success) must go through the same internal `handleClose` function — this is the mechanism that fixes the stale-state bug, not a per-call-site patch.
- `PromptDialog` field values stay controlled by the caller; `PromptDialog` itself only owns `pending` and `error`.

---

### Task 1: Create the shared `PromptDialog` component

**Files:**
- Create: `app/components/ui/PromptDialog.tsx`

**Interfaces:**
- Produces: `PromptDialogField` interface (`label: string; value: string; onChange: (value: string) => void; type?: "text" | "password" | "number"; required?: boolean; min?: number; placeholder?: string; helperText?: string;`) and `PromptDialog` component (`{ open: boolean; title: string; fields: PromptDialogField[]; submitLabel: string; pendingLabel: string; onSubmit: () => Promise<void>; onClose: () => void; }`) — both exported for use by Tasks 2-8.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";

export interface PromptDialogField {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password" | "number";
  required?: boolean;
  min?: number;
  placeholder?: string;
  helperText?: string;
}

export function PromptDialog({
  open,
  title,
  fields,
  submitLabel,
  pendingLabel,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  fields: PromptDialogField[];
  submitLabel: string;
  pendingLabel: string;
  onSubmit: () => Promise<void>;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onSubmit();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <label key={field.label} className="flex flex-col gap-1 text-sm">
            {field.label}
            <input
              required={field.required ?? true}
              autoFocus={index === 0}
              type={field.type ?? "text"}
              min={field.type === "number" ? field.min : undefined}
              placeholder={field.placeholder}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
            {field.helperText && (
              <span className="text-xs text-foreground/50">{field.helperText}</span>
            )}
          </label>
        ))}
        {error && <p className="text-sm text-aim-danger">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? pendingLabel : submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && yarn lint`
Expected: both clean. (Nothing imports `PromptDialog` yet, so there's no runtime way to exercise it until Task 2 — type-check + lint is the full verification for this task.)

- [ ] **Step 3: Commit**

```bash
git add app/components/ui/PromptDialog.tsx
git commit -m "Add shared PromptDialog component"
```

---

### Task 2: Migrate `CreateUserDialog` onto `PromptDialog`

**Files:**
- Modify: `app/users/_components/CreateUserDialog.tsx` (full rewrite)

**Interfaces:**
- Consumes: `PromptDialog`, `PromptDialogField` from Task 1 (`@/app/components/ui/PromptDialog`).

- [ ] **Step 1: Replace the file contents**

```tsx
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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && yarn lint`
Expected: both clean.

Run: `yarn dev`, navigate to `/users`, click "Create user".
Expected: dialog opens with an empty, focused "Screen name" field. Type into both fields, click Cancel, reopen — both fields must be blank (this is the bug-fix regression check). Then fill both fields and submit with a valid, not-already-existing screen name — expect a success toast and the new user to appear in the list after the dialog closes.
Stop the dev server when done.

- [ ] **Step 3: Commit**

```bash
git add app/users/_components/CreateUserDialog.tsx
git commit -m "Migrate CreateUserDialog onto PromptDialog"
```

---

### Task 3: Migrate `SetPasswordDialog` onto `PromptDialog`

**Files:**
- Modify: `app/users/[screenname]/_components/SetPasswordDialog.tsx` (full rewrite)

**Interfaces:**
- Consumes: `PromptDialog` from Task 1.

- [ ] **Step 1: Replace the file contents**

```tsx
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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && yarn lint`
Expected: both clean.

Run: `yarn dev`, navigate to any user detail page, click "Set password".
Expected: type a password, click Cancel, reopen — field must be blank (this dialog previously had **no** reset at all, so this is the most important regression check in this task). Then set a real password and confirm the success toast fires.
Stop the dev server when done.

- [ ] **Step 3: Commit**

```bash
git add "app/users/[screenname]/_components/SetPasswordDialog.tsx"
git commit -m "Migrate SetPasswordDialog onto PromptDialog"
```

---

### Task 4: Migrate `AddGroupDialog` onto `PromptDialog`

**Files:**
- Modify: `app/feedbag/[screenname]/_components/AddGroupDialog.tsx` (full rewrite)

**Interfaces:**
- Consumes: `PromptDialog` from Task 1.

- [ ] **Step 1: Replace the file contents**

```tsx
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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && yarn lint`
Expected: both clean.

Run: `yarn dev`, navigate to a user's buddy list page (`/feedbag/{screenname}`), click "Add group".
Expected: type a name, click Cancel, reopen — field must be blank. Note: if your server build predates the `PUT /feedbag/{screen_name}/group/{group_name}` handler, submitting will show the existing "Adding a group isn't supported on this server version." message instead of succeeding — that's expected, unrelated to this refactor; the Cancel-reset check is what matters here.
Stop the dev server when done.

- [ ] **Step 3: Commit**

```bash
git add "app/feedbag/[screenname]/_components/AddGroupDialog.tsx"
git commit -m "Migrate AddGroupDialog onto PromptDialog"
```

---

### Task 5: Migrate `AddLinkedAccountDialog` onto `PromptDialog`

**Files:**
- Modify: `app/feedbag/[screenname]/_components/AddLinkedAccountDialog.tsx` (full rewrite)

**Interfaces:**
- Consumes: `PromptDialog` from Task 1.

- [ ] **Step 1: Replace the file contents**

```tsx
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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && yarn lint`
Expected: both clean.

Run: `yarn dev`, navigate to a user's buddy list page, click "Link account".
Expected: type a screen name, click Cancel, reopen — field must be blank. As with Task 4, if your server build predates this endpoint, submitting will show the "Linked accounts aren't supported on this server version." message — expected, unrelated to this refactor.
Stop the dev server when done.

- [ ] **Step 3: Commit**

```bash
git add "app/feedbag/[screenname]/_components/AddLinkedAccountDialog.tsx"
git commit -m "Migrate AddLinkedAccountDialog onto PromptDialog"
```

---

### Task 6: Migrate `CreateRoomDialog` onto `PromptDialog`

**Files:**
- Modify: `app/chat-rooms/_components/CreateRoomDialog.tsx` (full rewrite)

**Interfaces:**
- Consumes: `PromptDialog` from Task 1.

- [ ] **Step 1: Replace the file contents**

```tsx
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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && yarn lint`
Expected: both clean.

Run: `yarn dev`, navigate to `/chat-rooms`, click "Create room".
Expected: type a name, click Cancel, reopen — field must be blank. Then create a real room and confirm the success toast and list refresh.
Stop the dev server when done.

- [ ] **Step 3: Commit**

```bash
git add app/chat-rooms/_components/CreateRoomDialog.tsx
git commit -m "Migrate CreateRoomDialog onto PromptDialog"
```

---

### Task 7: Migrate `AddCategoryDialog` onto `PromptDialog`

**Files:**
- Modify: `app/directory/_components/AddCategoryDialog.tsx` (full rewrite)

**Interfaces:**
- Consumes: `PromptDialog` from Task 1.

- [ ] **Step 1: Replace the file contents**

```tsx
"use client";

import { useState } from "react";
import { PromptDialog } from "@/app/components/ui/PromptDialog";
import { createCategory } from "@/app/lib/api-client";
import { useToast } from "@/app/components/ui/ToastProvider";

export function AddCategoryDialog({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const { showToast } = useToast();

  return (
    <PromptDialog
      open={open}
      title="Add category"
      submitLabel="Add"
      pendingLabel="Adding…"
      fields={[{ label: "Category name", value: name, onChange: setName }]}
      onSubmit={async () => {
        await createCategory(name);
        showToast(`Added category "${name}"`);
        onAdded();
      }}
      onClose={() => {
        setName("");
        onClose();
      }}
    />
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && yarn lint`
Expected: both clean.

Run: `yarn dev`, navigate to `/directory`, click "Add category".
Expected: type a name, click Cancel, reopen — field must be blank. Then add a real category and confirm the success toast and list refresh.
Stop the dev server when done.

- [ ] **Step 3: Commit**

```bash
git add app/directory/_components/AddCategoryDialog.tsx
git commit -m "Migrate AddCategoryDialog onto PromptDialog"
```

---

### Task 8: Migrate `CreateApiKeyDialog` onto `PromptDialog`

**Files:**
- Modify: `app/api-keys/_components/CreateApiKeyDialog.tsx` (full rewrite)

**Interfaces:**
- Consumes: `PromptDialog` from Task 1.
- Consumes: `createApiKey` from `@/app/lib/api-client`, `CreatedWebAPIKey` from `@/app/lib/types` (both already exist; unchanged signatures).

- [ ] **Step 1: Replace the file contents**

```tsx
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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && yarn lint`
Expected: both clean.

Run: `yarn dev`, navigate to `/api-keys`, click "Create Web API key".
Expected: all four fields render (App name, Rate limit defaulting to 60, Allowed origins, Capabilities), with "Allowed origins" and "Capabilities" NOT marked required (form should submit fine leaving them blank). Type into a couple fields, click Cancel, reopen — every field must be back to its original state (App name/Allowed origins/Capabilities blank, Rate limit back to "60"). Then create a real key and confirm the one-time secret reveal dialog still appears.
Stop the dev server when done.

- [ ] **Step 3: Commit**

```bash
git add app/api-keys/_components/CreateApiKeyDialog.tsx
git commit -m "Migrate CreateApiKeyDialog onto PromptDialog"
```

---

### Task 9: Fix `UploadAssetDialog`'s Cancel button to reset on close

**Files:**
- Modify: `app/bart/_components/UploadAssetDialog.tsx:95` (Cancel button only — this dialog is NOT migrated to `PromptDialog`, per the design doc, since it has a file input `PromptDialog` doesn't support)

**Interfaces:**
- None — this is a local, one-line-handler fix with no new exports.

- [ ] **Step 1: Update the Cancel button's `onClick`**

In `app/bart/_components/UploadAssetDialog.tsx`, find:

```tsx
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
```

Replace with:

```tsx
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={pending}
          >
            Cancel
          </Button>
```

(This mirrors the `Dialog`'s own `onClose={() => { reset(); onClose(); }}` a few lines above in the same file — both paths now reset identically.)

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && yarn lint`
Expected: both clean.

Run: `yarn dev`, navigate to `/bart`, click "Upload asset" for any type.
Expected: select a file (hash auto-fills), click Cancel, reopen — file input and hash field must both be blank (previously the selected file and hash would persist). Then do one real upload and confirm the success toast and list refresh still work.
Stop the dev server when done.

- [ ] **Step 3: Commit**

```bash
git add app/bart/_components/UploadAssetDialog.tsx
git commit -m "Reset UploadAssetDialog fields when Cancel is clicked"
```

---

### Task 10: Fix `useApiResource` to reset stale data when the fetcher changes

**Files:**
- Modify: `app/lib/use-api-resource.ts` (full rewrite)

**Interfaces:**
- No change to the exported `useApiResource<T>(fetcher: () => Promise<T>): ApiResource<T>` signature or `ApiResource<T>` shape — every existing caller (`Users`, `Sessions`, `Buddy Lists`, `Chat Rooms`, `Directory`, `BART Assets`, `Web API Keys`, `ICQ Profile`, etc.) is unaffected at the call-site level.

- [ ] **Step 1: Replace the file contents**

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ApiResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface ApiResource<T> extends ApiResourceState<T> {
  refresh: () => void;
}

/**
 * Fetches on mount, exposing a manual `refresh()` for post-mutation
 * revalidation. No background polling. `fetcher` must be a stable
 * reference (a module-level function, or wrapped in `useCallback` at
 * the call site) so refetching only happens when its real inputs change.
 */
export function useApiResource<T>(fetcher: () => Promise<T>): ApiResource<T> {
  const [state, setState] = useState<ApiResourceState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  // If the fetcher's identity changes (e.g. a route param it closes over),
  // reset synchronously during render rather than in an effect, so the
  // previous fetcher's stale data never renders alongside the new fetch.
  const prevFetcher = useRef(fetcher);
  if (prevFetcher.current !== fetcher) {
    prevFetcher.current = fetcher;
    setState({ data: null, loading: true, error: null });
  }

  // Only ever settles state from an async callback, never synchronously,
  // so it's safe to invoke directly from the mount effect below.
  const load = useCallback(() => {
    fetcher()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: unknown) =>
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : "Something went wrong",
        }),
      );
  }, [fetcher]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    load();
  }, [load]);

  return { ...state, refresh };
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && yarn lint`
Expected: both clean — in particular, confirm `react-hooks/set-state-in-effect` does NOT fire (the `setState` call is in the render body, not inside a `useEffect`).

Run: `yarn dev`, click through `/`, `/users`, `/sessions`, `/chat-rooms`, `/directory`, `/bart`, `/api-keys`, and a user detail page (`/users/{screenname}`) plus its ICQ profile page if the account is ICQ.
Expected: every page loads its data exactly as before (no infinite refetch loop, no stuck "loading" state, no console errors). This is a regression check — the fetcher identity doesn't currently change on any of these pages (per the design doc, `cacheComponents` isn't enabled so `[screenname]` navigation fully remounts), so behavior should be pixel-identical to before this change.
Stop the dev server when done.

- [ ] **Step 3: Commit**

```bash
git add app/lib/use-api-resource.ts
git commit -m "Reset useApiResource data when the fetcher identity changes"
```

---

## Final Step: Whole-branch review

After Task 10 is complete and committed, dispatch the final whole-branch code reviewer (per superpowers:subagent-driven-development) covering all 10 tasks' combined diff against the commit before Task 1 started. Pay particular attention to:

- Every one of the 7 migrated dialogs: confirm Cancel now resets exactly like backdrop/Escape did before (or, for `SetPasswordDialog`, now resets at all).
- No dialog's visual output changed (same Tailwind classes, same field order, same labels/placeholders/helper text as the originals).
- `CreateApiKeyDialog`'s `allowed_origins`/`capabilities` are still sent as `parseList(...)` results (not raw strings) to `createApiKey`.
- `useApiResource`'s render-phase `setState` doesn't create a render loop and doesn't fire the `set-state-in-effect` lint rule.

Then proceed to superpowers:finishing-a-development-branch.
