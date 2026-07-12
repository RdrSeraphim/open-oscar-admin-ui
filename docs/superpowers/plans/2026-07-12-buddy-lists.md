# Buddy Lists (feedbag + linked accounts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin view and edit a user's buddy-list feedbag (groups + buddies) and linked accounts, reached either by typing a screen name on a new `/feedbag` landing page or by clicking through from a user's detail page.

**Architecture:** Same client-fetch-through-proxy pattern as Users/Sessions: `app/lib/api-client.ts` gets new thin wrapper functions over the existing `/api/...` proxy, a new dynamic route `app/feedbag/[screenname]/page.tsx` owns two independently-refreshing `useApiResource` calls (one for the feedbag groups, one for linked accounts), and small dialog/card components reuse the existing `Dialog`/`ConfirmDialog`/`Button` primitives.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4. No test runner is configured in this repo (see spec: `docs/superpowers/specs/2026-07-12-buddy-lists-design.md`) — verification is `npm run lint` + `npx tsc --noEmit` per task, plus a final live-server walkthrough against the real open-oscar-server (mirroring how Users/Sessions were verified).

## Global Constraints

- No group delete/rename UI — the API has no endpoints for either. Don't build it.
- Linked accounts: full list/add/remove, since the API supports all three.
- `GET /feedbag/{screenname}/group` 404s for a user with no feedbag yet — treat that as an empty group list (`[]`), not an error.
- Reuse existing primitives (`Dialog`, `ConfirmDialog`, `Button`, `PageHeader`, `useToast`, `useApiResource`) — no new UI primitives.
- All new client components/pages that use hooks need `"use client"` at the top, matching every existing file in `app/users/` and `app/sessions/`.
- Dynamic route `params` are a `Promise`; unwrap with React's `use()` in client component pages, exactly like `app/users/[screenname]/page.tsx:22`.

---

### Task 1: Extend shared lib — types, api-client functions, and the `notFoundValue` apiFetch option

**Files:**
- Modify: `app/lib/types.ts` (append at end of file)
- Modify: `app/lib/api-client.ts`

**Interfaces:**
- Produces: `Buddy { name: string; item_id: number }`, `BuddyGroup { group_id: number; group_name: string; buddies: Buddy[] }`, `LinkedAccountsResponse { linked_accounts: string[] }` (types)
- Produces: `getFeedbag(screenName: string): Promise<BuddyGroup[]>`, `addGroup(screenName: string, groupName: string): Promise<{group_id: number; group_name: string}>`, `addBuddy(screenName: string, groupId: number, buddyScreenName: string): Promise<{name: string; group_id: number; item_id: number}>`, `removeBuddy(screenName: string, groupId: number, buddyScreenName: string): Promise<void>`, `listLinkedAccounts(screenName: string): Promise<LinkedAccountsResponse>`, `addLinkedAccount(screenName: string, linkedScreenName: string): Promise<void>`, `removeLinkedAccount(screenName: string, linkedScreenName: string): Promise<void>` (functions, all consumed by Tasks 2 and 3)

- [ ] **Step 1: Append the new types**

Add to the end of `app/lib/types.ts`:

```ts
export interface Buddy {
  name: string;
  item_id: number;
}

export interface BuddyGroup {
  group_id: number;
  group_name: string;
  buddies: Buddy[];
}

export interface LinkedAccountsResponse {
  linked_accounts: string[];
}
```

- [ ] **Step 2: Add a `notFoundValue` escape hatch to `apiFetch`**

`app/lib/api-client.ts` currently starts like this:

```ts
import type { Account, SessionsResponse, User, VersionInfo } from "./types";

class ApiError extends Error {}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    const text = await res.text();
    if (text) {
      try {
        const body = JSON.parse(text);
        message = body?.message || text;
      } catch {
        message = text;
      }
    }
    throw new ApiError(message);
  }

  if (res.status === 204 || res.status === 304) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
```

Replace the import line and `apiFetch` signature/body with:

```ts
import type {
  Account,
  BuddyGroup,
  LinkedAccountsResponse,
  SessionsResponse,
  User,
  VersionInfo,
} from "./types";

class ApiError extends Error {}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  opts?: { notFoundValue?: T },
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 404 && opts && "notFoundValue" in opts) {
    return opts.notFoundValue as T;
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    const text = await res.text();
    if (text) {
      try {
        const body = JSON.parse(text);
        message = body?.message || text;
      } catch {
        message = text;
      }
    }
    throw new ApiError(message);
  }

  if (res.status === 204 || res.status === 304) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
```

- [ ] **Step 3: Append the new api-client functions**

Add to the end of `app/lib/api-client.ts` (after the existing `getVersion` function):

```ts
export function getFeedbag(screenName: string): Promise<BuddyGroup[]> {
  return apiFetch<BuddyGroup[]>(
    `/feedbag/${encodeURIComponent(screenName)}/group`,
    undefined,
    { notFoundValue: [] },
  );
}

export function addGroup(
  screenName: string,
  groupName: string,
): Promise<{ group_id: number; group_name: string }> {
  return apiFetch(
    `/feedbag/${encodeURIComponent(screenName)}/group/${encodeURIComponent(groupName)}`,
    { method: "PUT" },
  );
}

export function addBuddy(
  screenName: string,
  groupId: number,
  buddyScreenName: string,
): Promise<{ name: string; group_id: number; item_id: number }> {
  return apiFetch(
    `/feedbag/${encodeURIComponent(screenName)}/group/${groupId}/buddy/${encodeURIComponent(buddyScreenName)}`,
    { method: "PUT" },
  );
}

export function removeBuddy(
  screenName: string,
  groupId: number,
  buddyScreenName: string,
): Promise<void> {
  return apiFetch(
    `/feedbag/${encodeURIComponent(screenName)}/group/${groupId}/buddy/${encodeURIComponent(buddyScreenName)}`,
    { method: "DELETE" },
  );
}

export function listLinkedAccounts(screenName: string): Promise<LinkedAccountsResponse> {
  return apiFetch<LinkedAccountsResponse>(
    `/user/${encodeURIComponent(screenName)}/linked-account`,
  );
}

export function addLinkedAccount(
  screenName: string,
  linkedScreenName: string,
): Promise<void> {
  return apiFetch(`/user/${encodeURIComponent(screenName)}/linked-account`, {
    method: "POST",
    body: JSON.stringify({ linked_screen_name: linkedScreenName }),
  });
}

export function removeLinkedAccount(
  screenName: string,
  linkedScreenName: string,
): Promise<void> {
  return apiFetch(
    `/user/${encodeURIComponent(screenName)}/linked-account/${encodeURIComponent(linkedScreenName)}`,
    { method: "DELETE" },
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output (no type errors, no lint errors).

- [ ] **Step 5: Commit**

```bash
git add app/lib/types.ts app/lib/api-client.ts
git commit -m "Add feedbag and linked-account types + api-client functions"
```

---

### Task 2: Buddy List section — `GroupCard`, `AddGroupDialog`, and `app/feedbag/[screenname]/page.tsx`

**Files:**
- Create: `app/feedbag/[screenname]/_components/AddGroupDialog.tsx`
- Create: `app/feedbag/[screenname]/_components/GroupCard.tsx`
- Create: `app/feedbag/[screenname]/page.tsx`

**Interfaces:**
- Consumes: `getFeedbag`, `addGroup`, `addBuddy`, `removeBuddy` from Task 1; `BuddyGroup`, `Buddy` types from Task 1; `Dialog`, `ConfirmDialog`, `Button`, `PageHeader` from `app/components/ui/`; `useToast` from `app/components/ui/ToastProvider.tsx`; `useApiResource` from `app/lib/use-api-resource.ts`
- Produces: `AddGroupDialog({ open, screenName, onClose, onAdded })`, `GroupCard({ screenName, group, onChanged })` — both consumed directly by `page.tsx` in this task; `LinkedAccountsSection` (Task 3) will be added into the same `page.tsx` return block without touching this task's JSX structure.

- [ ] **Step 1: Create `AddGroupDialog.tsx`**

```tsx
"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";
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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  function reset() {
    setGroupName("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await addGroup(screenName, groupName);
      showToast(`Added group "${groupName}"`);
      reset();
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add group");
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
      title="Add group"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Group name
          <input
            required
            autoFocus
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        {error && <p className="text-sm text-aim-danger">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Adding…" : "Add"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create `GroupCard.tsx`**

```tsx
"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/ToastProvider";
import { addBuddy, removeBuddy } from "@/app/lib/api-client";
import type { BuddyGroup } from "@/app/lib/types";

export function GroupCard({
  screenName,
  group,
  onChanged,
}: {
  screenName: string;
  group: BuddyGroup;
  onChanged: () => void;
}) {
  const [buddyName, setBuddyName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const { showToast } = useToast();

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    try {
      await addBuddy(screenName, group.group_id, buddyName);
      showToast(`Added "${buddyName}" to ${group.group_name}`);
      setBuddyName("");
      onChanged();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add buddy");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await removeBuddy(screenName, group.group_id, removeTarget);
      showToast(`Removed "${removeTarget}" from ${group.group_name}`);
      setRemoveTarget(null);
      onChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to remove buddy", "error");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <h3 className="mb-2 text-sm font-semibold">{group.group_name}</h3>

      {group.buddies.length === 0 ? (
        <p className="text-sm text-foreground/50">No buddies in this group.</p>
      ) : (
        <ul className="mb-3 flex flex-col gap-1">
          {group.buddies.map((buddy) => (
            <li
              key={buddy.item_id}
              className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-border/20"
            >
              <span>{buddy.name}</span>
              <Button variant="danger" onClick={() => setRemoveTarget(buddy.name)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs">
          Add buddy
          <input
            required
            value={buddyName}
            onChange={(e) => setBuddyName(e.target.value)}
            placeholder="Screen name"
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <Button type="submit" variant="secondary" disabled={adding}>
          {adding ? "Adding…" : "Add"}
        </Button>
      </form>
      {addError && <p className="mt-1 text-sm text-aim-danger">{addError}</p>}

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove buddy"
        description={`Remove "${removeTarget}" from ${group.group_name}?`}
        confirmLabel="Remove"
        danger
        pending={removing}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create `app/feedbag/[screenname]/page.tsx`**

```tsx
"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { getFeedbag } from "@/app/lib/api-client";
import { useApiResource } from "@/app/lib/use-api-resource";
import { AddGroupDialog } from "./_components/AddGroupDialog";
import { GroupCard } from "./_components/GroupCard";

export default function FeedbagPage({
  params,
}: {
  params: Promise<{ screenname: string }>;
}) {
  const { screenname } = use(params);

  const fetchGroups = useCallback(() => getFeedbag(screenname), [screenname]);
  const { data: groups, loading, error, refresh } = useApiResource(fetchGroups);

  const [addGroupOpen, setAddGroupOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title={`${screenname}'s buddy list`}
        actions={
          <Link href={`/users/${encodeURIComponent(screenname)}`}>
            <Button variant="secondary">View user</Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Buddy List</h2>
            <Button variant="primary" onClick={() => setAddGroupOpen(true)}>
              Add group
            </Button>
          </div>

          {loading && <p className="text-sm text-foreground/70">Loading buddy list…</p>}
          {error && <p className="text-sm text-aim-danger">{error}</p>}

          {groups && groups.length === 0 && !loading && !error && (
            <p className="text-sm text-foreground/50">
              No groups yet. Add a group to get started.
            </p>
          )}

          {groups && groups.length > 0 && (
            <div className="flex flex-col gap-3">
              {groups.map((group) => (
                <GroupCard
                  key={group.group_id}
                  screenName={screenname}
                  group={group}
                  onChanged={refresh}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AddGroupDialog
        open={addGroupOpen}
        screenName={screenname}
        onClose={() => setAddGroupOpen(false)}
        onAdded={refresh}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 5: Commit**

```bash
git add app/feedbag/\[screenname\]/
git commit -m "Add buddy list view: groups, add group, add/remove buddy"
```

---

### Task 3: Linked Accounts section

**Files:**
- Create: `app/feedbag/[screenname]/_components/AddLinkedAccountDialog.tsx`
- Create: `app/feedbag/[screenname]/_components/LinkedAccountsSection.tsx`
- Modify: `app/feedbag/[screenname]/page.tsx`

**Interfaces:**
- Consumes: `listLinkedAccounts`, `addLinkedAccount`, `removeLinkedAccount` from Task 1; `LinkedAccountsResponse` type from Task 1; same shared primitives as Task 2.
- Produces: `LinkedAccountsSection({ screenName })` — a self-contained section (owns its own fetch/refresh), dropped into `page.tsx` below the Buddy List block.

- [ ] **Step 1: Create `AddLinkedAccountDialog.tsx`**

```tsx
"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";
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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  function reset() {
    setLinkedScreenName("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await addLinkedAccount(screenName, linkedScreenName);
      showToast(`Linked "${linkedScreenName}"`);
      reset();
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link account");
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
      title="Link account"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Screen name to link
          <input
            required
            autoFocus
            value={linkedScreenName}
            onChange={(e) => setLinkedScreenName(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        {error && <p className="text-sm text-aim-danger">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Linking…" : "Link"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create `LinkedAccountsSection.tsx`**

```tsx
"use client";

import { useCallback, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/ToastProvider";
import { listLinkedAccounts, removeLinkedAccount } from "@/app/lib/api-client";
import { useApiResource } from "@/app/lib/use-api-resource";
import { AddLinkedAccountDialog } from "./AddLinkedAccountDialog";

export function LinkedAccountsSection({ screenName }: { screenName: string }) {
  const fetchLinked = useCallback(() => listLinkedAccounts(screenName), [screenName]);
  const { data, loading, error, refresh } = useApiResource(fetchLinked);

  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const { showToast } = useToast();

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await removeLinkedAccount(screenName, removeTarget);
      showToast(`Unlinked "${removeTarget}"`);
      setRemoveTarget(null);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to unlink account", "error");
    } finally {
      setRemoving(false);
    }
  }

  const linkedAccounts = data?.linked_accounts ?? [];

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Linked Accounts</h2>
        <Button variant="secondary" onClick={() => setAddOpen(true)}>
          Link account
        </Button>
      </div>

      {loading && <p className="text-sm text-foreground/70">Loading linked accounts…</p>}
      {error && <p className="text-sm text-aim-danger">{error}</p>}

      {!loading && !error && linkedAccounts.length === 0 && (
        <p className="text-sm text-foreground/50">No linked accounts.</p>
      )}

      {linkedAccounts.length > 0 && (
        <ul className="flex flex-col gap-1">
          {linkedAccounts.map((name) => (
            <li
              key={name}
              className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-border/20"
            >
              <span>{name}</span>
              <Button variant="danger" onClick={() => setRemoveTarget(name)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AddLinkedAccountDialog
        open={addOpen}
        screenName={screenName}
        onClose={() => setAddOpen(false)}
        onAdded={refresh}
      />

      <ConfirmDialog
        open={removeTarget !== null}
        title="Unlink account"
        description={`Remove the link between "${screenName}" and "${removeTarget}"?`}
        confirmLabel="Remove"
        danger
        pending={removing}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
      />
    </div>
  );
}
```

- [ ] **Step 3: Wire `LinkedAccountsSection` into `page.tsx`**

In `app/feedbag/[screenname]/page.tsx`, add the import:

```ts
import { LinkedAccountsSection } from "./_components/LinkedAccountsSection";
```

And change the closing of the `<div className="flex flex-col gap-6">` block from:

```tsx
          )}
        </div>
      </div>

      <AddGroupDialog
```

to:

```tsx
          )}
        </div>

        <LinkedAccountsSection screenName={screenname} />
      </div>

      <AddGroupDialog
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 5: Commit**

```bash
git add app/feedbag/\[screenname\]/
git commit -m "Add linked accounts section to buddy list page"
```

---

### Task 4: Replace the `/feedbag` placeholder with a screen-name search landing page

**Files:**
- Modify: `app/feedbag/page.tsx` (full rewrite — currently a `ComingSoon` placeholder)

**Interfaces:**
- Consumes: `PageHeader`, `Button` from `app/components/ui/`; `useRouter` from `next/navigation`.
- Produces: nothing consumed by later tasks — this is a leaf page.

- [ ] **Step 1: Replace the file contents**

Current `app/feedbag/page.tsx`:

```tsx
import { ComingSoon } from "@/app/components/ui/ComingSoon";

export default function FeedbagPage() {
  return (
    <ComingSoon
      title="Buddy Lists"
      description="View and edit a user's feedbag: groups, buddies, and linked accounts. See docs/api.yml (/feedbag/*, /user/{screenname}/linked-account) for the underlying API."
    />
  );
}
```

Replace it entirely with:

```tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";

export default function FeedbagLandingPage() {
  const [screenName, setScreenName] = useState("");
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = screenName.trim();
    if (!trimmed) return;
    router.push(`/feedbag/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div>
      <PageHeader title="Buddy Lists" />
      <div className="rounded-md border border-border bg-surface p-4">
        <p className="mb-3 text-sm text-foreground/70">
          Enter a screen name to view and edit its buddy list and linked accounts.
        </p>
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Screen name
            <input
              required
              autoFocus
              value={screenName}
              onChange={(e) => setScreenName(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <Button type="submit" variant="primary">
            View
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 3: Commit**

```bash
git add app/feedbag/page.tsx
git commit -m "Replace Buddy Lists placeholder with screen-name search landing page"
```

---

### Task 5: Link to the buddy list from a user's detail page

**Files:**
- Modify: `app/users/[screenname]/page.tsx:48-60`

**Interfaces:**
- Consumes: nothing new — `Link` and `Button` are already imported in this file.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the "Buddy list" button**

Current block in `app/users/[screenname]/page.tsx`:

```tsx
      <PageHeader
        title={screenname}
        actions={
          <>
            <Link href="/users">
              <Button variant="secondary">Back to users</Button>
            </Link>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Delete user
            </Button>
          </>
        }
      />
```

Replace with:

```tsx
      <PageHeader
        title={screenname}
        actions={
          <>
            <Link href="/users">
              <Button variant="secondary">Back to users</Button>
            </Link>
            <Link href={`/feedbag/${encodeURIComponent(screenname)}`}>
              <Button variant="secondary">Buddy list</Button>
            </Link>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Delete user
            </Button>
          </>
        }
      />
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 3: Commit**

```bash
git add app/users/\[screenname\]/page.tsx
git commit -m "Link to buddy list from user detail page"
```

---

### Task 6: Live-server verification pass

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Start the dev server against a real open-oscar-server**

Ensure `.env.local` has `AIMCTL_API_BASE_URL` pointing at a reachable instance (see `.env.local.example`), then:

```bash
npm run dev
```

Note the port it actually binds (3000 may be taken by something else, as it was during the Users/Sessions verification — Next will print the real port).

- [ ] **Step 2: Exercise the new routes with curl, using an existing real user**

Replace `SCREEN_NAME` and `PORT` below with real values:

```bash
curl -s http://localhost:PORT/api/feedbag/SCREEN_NAME/group
curl -s http://localhost:PORT/api/user/SCREEN_NAME/linked-account
```

Expected: JSON array (possibly empty) for the first, `{"linked_accounts":[...]}` for the second — both 200, no 500s.

- [ ] **Step 3: Exercise the full create/read/delete cycle with a throwaway group + buddy**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X PUT "http://localhost:PORT/api/feedbag/SCREEN_NAME/group/AimctlVerifyGroup"
curl -s http://localhost:PORT/api/feedbag/SCREEN_NAME/group
```

Expected: `200` or `201` from the PUT, and the new group present in the follow-up GET. Note its `group_id` from the response, then:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X PUT "http://localhost:PORT/api/feedbag/SCREEN_NAME/group/GROUP_ID/buddy/aimctlverifybuddy"
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE "http://localhost:PORT/api/feedbag/SCREEN_NAME/group/GROUP_ID/buddy/aimctlverifybuddy"
```

Expected: `200` from the PUT (buddy added), `204` from the DELETE (buddy removed). There's no API to delete the throwaway group afterward (see Global Constraints) — leaving an empty `AimctlVerifyGroup` behind is expected and fine for a local dev/test server.

- [ ] **Step 4: Exercise linked accounts with a throwaway pair**

Use two existing real screen names, or create a second throwaway user first via `POST /api/user` (same as the Users verification pass) if only one exists:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:PORT/api/user/SCREEN_NAME/linked-account \
  -H "Content-Type: application/json" -d '{"linked_screen_name":"OTHER_SCREEN_NAME"}'
curl -s http://localhost:PORT/api/user/SCREEN_NAME/linked-account
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:PORT/api/user/SCREEN_NAME/linked-account/OTHER_SCREEN_NAME
```

Expected: `201` from the POST, the link present in the GET, `204` from the DELETE, and the link gone from a follow-up GET. Clean up any throwaway user created for this step the same way Task's Users verification did (`DELETE /api/user`).

- [ ] **Step 5: Check the dev server log for errors**

```bash
grep -i error /tmp/aimctl-dev.log
```

Expected: no matches from the requests made in this task (pre-existing unrelated lines, if any, are fine).
