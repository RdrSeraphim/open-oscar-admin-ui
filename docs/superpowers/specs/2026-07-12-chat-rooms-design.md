# Chat Rooms

## Context

The admin UI foundation, Users, Sessions, and Buddy Lists are built and committed. `/chat-rooms` is currently a "coming soon" placeholder. This spec fleshes it out: managing public AIM chat rooms (exchange 5) and viewing private rooms (exchange 4).

Unlike Buddy Lists, the underlying API (`docs/api.yml`) here is global, not per-screen-name — `GET /chat/room/public` and `GET /chat/room/private` each return the full list directly, no search/entry-point needed.

## Scope

- **Public rooms** (exchange 5): list, create, delete. Full CRUD the API supports.
- **Private rooms** (exchange 4): list only. The API has no create/delete endpoints for private rooms — they're presumably created by AIM clients directly — so the UI is view-only for this section.
- Room deletion uses the app's established single-row pattern (Delete button + `ConfirmDialog` per row), calling the bulk `DELETE /chat/room/public` endpoint with a one-element `names` array. No multi-select/bulk-delete UI, even though the API supports a multi-name array — consistent with every other delete flow in the app so far (Users, Sessions, Buddy Lists).
- Participants are shown via an expandable row (click to toggle), matching the Sessions page's `SessionRow` pattern — collapsed rows show a count, expanded rows show the full list of screen names.

## Route

`app/chat-rooms/page.tsx` (replaces the current placeholder), a client component with two independent `useApiResource` calls — one for public rooms, one for private rooms — so either section can refresh without affecting the other:

- **Public Rooms**: `listPublicRooms()` → `GET /chat/room/public`. Table columns: Name, Created, Participants (count + expand toggle), Actions (Delete). A "Create room" button in the section header opens a `Dialog` for the room name (`createPublicRoom` → `POST /chat/room/public`). Delete opens `ConfirmDialog` → `deletePublicRooms([name])` → `DELETE /chat/room/public` with `{names: [name]}` → refresh.
- **Private Rooms**: `listPrivateRooms()` → `GET /chat/room/private`. Same expandable-row table shape, but read-only: Name, Created, Creator, participants on expand. No header actions.

## Shared component: one `RoomRow`, not two

Public and private rows differ only in: an extra "Creator" column for private rooms, and whether a Delete action exists. Rather than duplicating the expand-row logic (as flagged in the last review re: the three near-duplicate dialogs), build a single `RoomRow` component parameterized by an optional `creatorId?: string` and an optional `onDelete?: (name: string) => void` — when `onDelete` is absent, no Delete button renders; when `creatorId` is absent, no Creator column renders.

## Shared lib additions

`app/lib/types.ts`:
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

`app/lib/api-client.ts` — same conventions as existing functions:
- `listPublicRooms(): Promise<PublicRoom[]>` → `GET /chat/room/public`
- `createPublicRoom(name: string): Promise<void>` → `POST /chat/room/public`
- `deletePublicRooms(names: string[]): Promise<void>` → `DELETE /chat/room/public`
- `listPrivateRooms(): Promise<PrivateRoom[]>` → `GET /chat/room/private`

## Components (new)

`app/chat-rooms/_components/`:
- `CreateRoomDialog.tsx` — room-name dialog, mirrors `CreateUserDialog.tsx`/`AddGroupDialog.tsx`'s structure.
- `RoomRow.tsx` — one expandable row; shared by both sections as described above.
- `RoomsTable.tsx` — table wrapper (header + `RoomRow` list), reused for both sections with different props (whether to show the Creator column / Delete action).

All reuse existing primitives (`Table`, `Dialog`, `ConfirmDialog`, `Button`, `Badge`, `PageHeader`, `useToast`, `useApiResource`) — no new UI primitives.

## Verification

- `npm run lint` and `npx tsc --noEmit` pass.
- Against the live open-oscar-server: list public and private rooms, create a throwaway public room, expand it to confirm participant rendering (likely empty for a freshly created room), delete it, confirm private rooms render read-only with no delete affordance. Same throwaway-and-cleanup approach as prior verification passes. If the live test server doesn't implement some of these endpoints (as happened with Buddy Lists' linked-account endpoints), confirm the UI degrades to a clear error state rather than crashing, and note the gap rather than treating it as a code defect.
