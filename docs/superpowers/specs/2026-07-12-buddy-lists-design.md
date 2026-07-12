# Buddy Lists (feedbag + linked accounts)

## Context

The admin UI foundation (nav shell, proxy, Users, Sessions) is built and committed. `/feedbag` is currently a "coming soon" placeholder. This spec fleshes it out: viewing and editing a user's buddy-list feedbag (groups and buddies), and managing linked accounts, which share a page since both are per-screen-name account-adjacent data with no natural home elsewhere.

The underlying API (`docs/api.yml`) is per-screen-name — there's no "list all feedbags" endpoint — so entry into this section always starts from a screen name, either typed directly or reached from a user's detail page.

## Scope

- Buddy list: view groups + buddies, add a group, add a buddy to a group, remove a buddy from a group.
- **Not building**: group delete/rename. The API has no endpoints for either (`PUT .../group/{group_name}` only creates-or-no-ops; there's no `DELETE .../group/{group_id}`), so the UI won't pretend to support it.
- Linked accounts: list, add, remove — full CRUD, since the API supports all three.

## Routes

- `app/feedbag/page.tsx` (replaces the current placeholder): a simple form — screen-name input + "View" button — that navigates to `/feedbag/[screenname]`. No API call on this page itself.
- `app/feedbag/[screenname]/page.tsx` (new, client component, `use(params)` per the established dynamic-route pattern): two independent sections, each with its own `useApiResource` call so one can refresh without affecting the other:
  - **Buddy List** — `getFeedbag(screenname)` → `GET /feedbag/{screenname}/group`. Renders each group as a card: group name heading, buddy list with a Remove button per buddy (`removeBuddy` → `DELETE .../group/{group_id}/buddy/{buddy}`, confirmed via `ConfirmDialog`), and an inline add-buddy field at the bottom of the card (`addBuddy` → `PUT .../group/{group_id}/buddy/{buddy}`). An "Add group" button in the section header opens a `Dialog` for the group name (`addGroup` → `PUT .../group/{group_name}`).
    - **Empty/new-feedbag handling**: `GET .../group` 404s when the user has no feedbag yet (brand new account). Detect this case (rather than showing a generic error banner) and render an empty state — "No groups yet" — that still surfaces the "Add group" action, since creating the first group is what bootstraps the feedbag server-side.
  - **Linked Accounts** — `listLinkedAccounts(screenname)` → `GET /user/{screenname}/linked-account`. Renders as a simple list with a Remove button per entry (`removeLinkedAccount`, confirmed via `ConfirmDialog`) and a "Link account" button opening a `Dialog` for the screen name to link (`addLinkedAccount` → `POST .../linked-account`).
- `app/users/[screenname]/page.tsx`: add a "Buddy list" secondary button next to the existing header actions, linking to `/feedbag/[screenname]`.

## Shared lib additions

`app/lib/types.ts`:
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

`app/lib/api-client.ts` — same shape/conventions as the existing functions (thin wrappers over `apiFetch`, hitting `/api/...`):
`getFeedbag`, `addGroup`, `addBuddy`, `removeBuddy`, `listLinkedAccounts`, `addLinkedAccount`, `removeLinkedAccount`.

## Components (new)

`app/feedbag/[screenname]/_components/`:
- `AddGroupDialog.tsx` — group-name dialog, mirrors `CreateUserDialog.tsx`'s structure.
- `GroupCard.tsx` — one group's buddies + inline add-buddy field + per-buddy remove.
- `LinkedAccountsSection.tsx` — list + remove actions.
- `AddLinkedAccountDialog.tsx` — screen-name dialog.

All reuse existing primitives (`Dialog`, `ConfirmDialog`, `Button`, `Badge`, `PageHeader`, `useToast`, `useApiResource`) — no new UI primitives needed.

## Verification

- `npm run lint` and `npx tsc --noEmit` pass.
- Against the live open-oscar-server: view an existing user's feedbag, add a group, add a buddy, remove a buddy, confirm a brand-new user (no feedbag yet) shows the empty state instead of an error, and exercise linked-account add/remove — using throwaway data, cleaned up afterward, same as the Users verification pass.
