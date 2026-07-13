# Chat Rooms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin view public and private AIM chat rooms, create/delete public rooms, and see each room's participant list, at `/chat-rooms` (replacing the current "coming soon" placeholder).

**Architecture:** Same pattern as every other section: `app/lib/api-client.ts` gets thin wrapper functions over the `/api/...` proxy, `app/chat-rooms/page.tsx` owns two independent `useApiResource` calls (public rooms, private rooms), and a single shared `RoomRow` component (parameterized by an optional Creator column and an optional Delete action) renders both sections' expandable rows — avoiding two near-identical row components.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4. No test runner configured — verification is `npx tsc --noEmit` + `npm run lint` per task, plus a final live-server walkthrough.

## Global Constraints

- Public rooms (exchange 5): full list/create/delete. Private rooms (exchange 4): list only — the API has no create/delete endpoints for them, so build no such UI.
- Deletion uses the app's established single-row pattern (Delete button + `ConfirmDialog` per row), calling `DELETE /chat/room/public` with a **one-element** `names` array — no multi-select/bulk-delete UI.
- Participants show via an expandable row (click to toggle), matching `app/sessions/_components/SessionRow.tsx`'s pattern.
- One shared `RoomRow` component for both sections, not two — see Task 2.
- Reuse existing primitives (`Table`, `Dialog`, `ConfirmDialog`, `Button`, `PageHeader`, `useToast`, `useApiResource`) — no new UI primitives.
- **Already applied, not part of this plan's tasks:** `apiFetch` (`app/lib/api-client.ts`) was just fixed in commit `6398444` to fall back to `undefined` when a success response body isn't valid JSON (several endpoints, including `POST /chat/room/public`, return a plain-text confirmation message on `201`, not JSON). The code shown as "current" in this plan's tasks already reflects that fix — don't re-apply it or flag its absence.
- All new client components/pages need `"use client"` at the top.

---

### Task 1: Extend shared lib — types and api-client functions

**Files:**
- Modify: `app/lib/types.ts` (append at end of file)
- Modify: `app/lib/api-client.ts`

**Interfaces:**
- Produces: `RoomParticipant { id: string; screen_name: string }`, `PublicRoom { name: string; create_time: string; participants: RoomParticipant[] }`, `PrivateRoom { name: string; create_time: string; creator_id: string; participants: RoomParticipant[] }` (types)
- Produces: `listPublicRooms(): Promise<PublicRoom[]>`, `createPublicRoom(name: string): Promise<void>`, `deletePublicRooms(names: string[]): Promise<void>`, `listPrivateRooms(): Promise<PrivateRoom[]>` (functions, consumed by Task 3)

- [ ] **Step 1: Append the new types**

Add to the end of `app/lib/types.ts`:

```ts
export interface RoomParticipant {
  id: string;
  screen_name: string;
}

export interface PublicRoom {
  name: string;
  create_time: string;
  participants: RoomParticipant[];
}

export interface PrivateRoom {
  name: string;
  create_time: string;
  creator_id: string;
  participants: RoomParticipant[];
}
```

- [ ] **Step 2: Update the import line in `app/lib/api-client.ts`**

Current:

```ts
import type {
  Account,
  BuddyGroup,
  LinkedAccountsResponse,
  SessionsResponse,
  User,
  VersionInfo,
} from "./types";
```

Replace with:

```ts
import type {
  Account,
  BuddyGroup,
  LinkedAccountsResponse,
  PrivateRoom,
  PublicRoom,
  SessionsResponse,
  User,
  VersionInfo,
} from "./types";
```

- [ ] **Step 3: Append the new api-client functions**

Add to the end of `app/lib/api-client.ts` (after the existing `removeLinkedAccount` function):

```ts
export function listPublicRooms(): Promise<PublicRoom[]> {
  return apiFetch<PublicRoom[]>("/chat/room/public");
}

export function createPublicRoom(name: string): Promise<void> {
  return apiFetch("/chat/room/public", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function deletePublicRooms(names: string[]): Promise<void> {
  return apiFetch("/chat/room/public", {
    method: "DELETE",
    body: JSON.stringify({ names }),
  });
}

export function listPrivateRooms(): Promise<PrivateRoom[]> {
  return apiFetch<PrivateRoom[]>("/chat/room/private");
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 5: Commit**

```bash
git add app/lib/types.ts app/lib/api-client.ts
git commit -m "Add chat room types + api-client functions"
```

---

### Task 2: Chat room components — `CreateRoomDialog`, `RoomRow`, `RoomsTable`

**Files:**
- Create: `app/chat-rooms/_components/CreateRoomDialog.tsx`
- Create: `app/chat-rooms/_components/RoomRow.tsx`
- Create: `app/chat-rooms/_components/RoomsTable.tsx`

**Interfaces:**
- Consumes: `createPublicRoom` from Task 1; `RoomParticipant` type from Task 1; `Table`, `Thead`, `Tbody`, `Tr`, `Th`, `Td` from `app/components/ui/Table.tsx`; `Dialog`, `Button` from `app/components/ui/`; `useToast` from `app/components/ui/ToastProvider.tsx`
- Produces: `CreateRoomDialog({ open, onClose, onCreated })`, `RoomRow({ name, createTime, participants, creatorId?, onDelete? })`, `RoomsTable({ rooms, showCreator, onDelete?, emptyMessage })` — all consumed by Task 3's `page.tsx`. `RoomsTable`'s `rooms` prop accepts anything shaped `{ name: string; create_time: string; participants: RoomParticipant[]; creator_id?: string }` — both `PublicRoom[]` and `PrivateRoom[]` satisfy this structurally, no casting needed.

- [ ] **Step 1: Create `CreateRoomDialog.tsx`**

```tsx
"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";
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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  function reset() {
    setName("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await createPublicRoom(name);
      showToast(`Created room "${name}"`);
      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
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
      title="Create room"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Room name
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
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

- [ ] **Step 2: Create `RoomRow.tsx`**

One shared expandable row for both Public and Private rooms. `creatorId` present → renders a Creator cell (used by private rooms). `onDelete` present → renders a Delete button cell (used by public rooms). The column count for the expanded detail row's `colSpan` is `4` (toggle, name, created, participant count) `+ 1` if `creatorId !== undefined` `+ 1` if `onDelete` is present.

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Tr, Td } from "@/app/components/ui/Table";
import type { RoomParticipant } from "@/app/lib/types";

export function RoomRow({
  name,
  createTime,
  participants,
  creatorId,
  onDelete,
}: {
  name: string;
  createTime: string;
  participants: RoomParticipant[];
  creatorId?: string;
  onDelete?: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const columnCount = 4 + (creatorId !== undefined ? 1 : 0) + (onDelete ? 1 : 0);

  return (
    <>
      <Tr
        className="cursor-pointer hover:bg-border/20"
        onClick={() => setExpanded((v) => !v)}
      >
        <Td className="w-4 text-foreground/50">{expanded ? "▾" : "▸"}</Td>
        <Td className="font-medium">{name}</Td>
        <Td>{new Date(createTime).toLocaleString()}</Td>
        {creatorId !== undefined && <Td>{creatorId}</Td>}
        <Td>{participants.length}</Td>
        {onDelete && (
          <Td className="text-right">
            <Button
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(name);
              }}
            >
              Delete
            </Button>
          </Td>
        )}
      </Tr>
      {expanded && (
        <Tr className="bg-border/10">
          <Td colSpan={columnCount}>
            {participants.length === 0 ? (
              <p className="py-1 text-xs text-foreground/50">No participants.</p>
            ) : (
              <ul className="flex flex-wrap gap-x-4 gap-y-1 py-1 text-xs">
                {participants.map((p) => (
                  <li key={p.id}>{p.screen_name}</li>
                ))}
              </ul>
            )}
          </Td>
        </Tr>
      )}
    </>
  );
}
```

- [ ] **Step 3: Create `RoomsTable.tsx`**

```tsx
"use client";

import { Table, Thead, Tbody, Tr, Th, Td } from "@/app/components/ui/Table";
import type { RoomParticipant } from "@/app/lib/types";
import { RoomRow } from "./RoomRow";

interface RoomListItem {
  name: string;
  create_time: string;
  participants: RoomParticipant[];
  creator_id?: string;
}

export function RoomsTable({
  rooms,
  showCreator,
  onDelete,
  emptyMessage,
}: {
  rooms: RoomListItem[];
  showCreator: boolean;
  onDelete?: (name: string) => void;
  emptyMessage: string;
}) {
  const columnCount = 4 + (showCreator ? 1 : 0) + (onDelete ? 1 : 0);

  return (
    <Table>
      <Thead>
        <Tr>
          <Th />
          <Th>Name</Th>
          <Th>Created</Th>
          {showCreator && <Th>Creator</Th>}
          <Th>Participants</Th>
          {onDelete && <Th className="text-right">Actions</Th>}
        </Tr>
      </Thead>
      <Tbody>
        {rooms.length === 0 && (
          <Tr>
            <Td colSpan={columnCount} className="py-6 text-center text-foreground/60">
              {emptyMessage}
            </Td>
          </Tr>
        )}
        {rooms.map((room) => (
          <RoomRow
            key={room.name}
            name={room.name}
            createTime={room.create_time}
            participants={room.participants}
            creatorId={showCreator ? room.creator_id : undefined}
            onDelete={onDelete}
          />
        ))}
      </Tbody>
    </Table>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 5: Commit**

```bash
git add app/chat-rooms/_components/
git commit -m "Add chat room components: CreateRoomDialog, RoomRow, RoomsTable"
```

---

### Task 3: Replace `/chat-rooms` placeholder with the real page

**Files:**
- Modify: `app/chat-rooms/page.tsx` (full rewrite — currently a `ComingSoon` placeholder)

**Interfaces:**
- Consumes: `listPublicRooms`, `createPublicRoom` (via `CreateRoomDialog`), `deletePublicRooms`, `listPrivateRooms` from Task 1; `CreateRoomDialog`, `RoomsTable` from Task 2; `PageHeader`, `Button`, `ConfirmDialog` from `app/components/ui/`; `useToast` from `app/components/ui/ToastProvider.tsx`; `useApiResource` from `app/lib/use-api-resource.ts`.
- Produces: nothing consumed by later tasks — this is a leaf page.

- [ ] **Step 1: Replace the file contents**

Current `app/chat-rooms/page.tsx`:

```tsx
import { ComingSoon } from "@/app/components/ui/ComingSoon";

export default function ChatRoomsPage() {
  return (
    <ComingSoon
      title="Chat Rooms"
      description="Create, list, and delete public and private AIM chat rooms. See docs/api.yml (/chat/room/*) for the underlying API."
    />
  );
}
```

Replace it entirely with:

```tsx
"use client";

import { useState } from "react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/ToastProvider";
import {
  deletePublicRooms,
  listPrivateRooms,
  listPublicRooms,
} from "@/app/lib/api-client";
import { useApiResource } from "@/app/lib/use-api-resource";
import { CreateRoomDialog } from "./_components/CreateRoomDialog";
import { RoomsTable } from "./_components/RoomsTable";

export default function ChatRoomsPage() {
  const {
    data: publicRooms,
    loading: publicLoading,
    error: publicError,
    refresh: refreshPublic,
  } = useApiResource(listPublicRooms);

  const {
    data: privateRooms,
    loading: privateLoading,
    error: privateError,
  } = useApiResource(listPrivateRooms);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePublicRooms([deleteTarget]);
      showToast(`Deleted room "${deleteTarget}"`);
      setDeleteTarget(null);
      refreshPublic();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete room", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Chat Rooms" />

      <div className="flex flex-col gap-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Public Rooms</h2>
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              Create room
            </Button>
          </div>

          {publicLoading && <p className="text-sm text-foreground/70">Loading public rooms…</p>}
          {publicError && <p className="text-sm text-aim-danger">{publicError}</p>}

          {publicRooms && (
            <RoomsTable
              rooms={publicRooms}
              showCreator={false}
              onDelete={setDeleteTarget}
              emptyMessage="No public rooms."
            />
          )}
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold">Private Rooms</h2>

          {privateLoading && <p className="text-sm text-foreground/70">Loading private rooms…</p>}
          {privateError && <p className="text-sm text-aim-danger">{privateError}</p>}

          {privateRooms && (
            <RoomsTable
              rooms={privateRooms}
              showCreator
              emptyMessage="No private rooms."
            />
          )}
        </div>
      </div>

      <CreateRoomDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refreshPublic}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete room"
        description={`Are you sure you want to delete "${deleteTarget}"? This cannot be undone.`}
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
git add app/chat-rooms/page.tsx
git commit -m "Replace Chat Rooms placeholder with public/private room management"
```

---

### Task 4: Live-server verification pass

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Confirm the dev server is up against a real open-oscar-server**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:PORT/
```

(Use whatever port `npm run dev` actually bound — 3000 may be taken by something else, as seen in prior verification passes.)

- [ ] **Step 2: Exercise the list endpoints**

```bash
curl -s http://localhost:PORT/api/chat/room/public
curl -s http://localhost:PORT/api/chat/room/private
```

Expected: JSON arrays (possibly empty), both 200, no 500s. If either 404s directly from the backend (check by comparing against `curl http://<backend-host>:<port>/chat/room/public` directly, bypassing the proxy, the same way the linked-account gap was diagnosed in the Buddy Lists verification pass), treat that as a test-environment version-skew finding, not a code defect — report it, don't try to fix the app around it.

- [ ] **Step 3: Exercise the create/delete cycle with a throwaway room**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:PORT/api/chat/room/public \
  -H "Content-Type: application/json" -d '{"name":"aimctlverifyroom"}'
curl -s http://localhost:PORT/api/chat/room/public
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:PORT/api/chat/room/public \
  -H "Content-Type: application/json" -d '{"names":["aimctlverifyroom"]}'
curl -s http://localhost:PORT/api/chat/room/public
```

Expected: `201` from the POST, the new room present in the follow-up GET, `204` from the DELETE, and the room gone from the final GET.

- [ ] **Step 4: Check the dev server log for errors**

```bash
grep -i error /tmp/aimctl-dev.log
```

Expected: no matches from the requests made in this task (pre-existing unrelated lines, if any, are fine).
