# PromptDialog Extraction + useApiResource Stale-Data Fix — Design

## Context

Two follow-up items flagged during earlier feature reviews, now picked up as an app-wide polish pass now that all nine nav sections exist. Both are internal cleanup — no user-facing behavior changes except one bug fix (stale dialog state surviving Cancel).

## 1. PromptDialog extraction

### Problem

Seven dialog components are structural clones — a form with one or a few
controlled text/password/number inputs, a submit/cancel footer, inline error
display, and a pending state — differing only in field labels, the
api-client call, and toast text:

- `app/users/_components/CreateUserDialog.tsx` (2 fields: screen name, password)
- `app/users/[screenname]/_components/SetPasswordDialog.tsx` (1 field: password)
- `app/feedbag/[screenname]/_components/AddGroupDialog.tsx` (1 field: group name)
- `app/feedbag/[screenname]/_components/AddLinkedAccountDialog.tsx` (1 field: screen name)
- `app/chat-rooms/_components/CreateRoomDialog.tsx` (1 field: room name)
- `app/directory/_components/AddCategoryDialog.tsx` (1 field: category name)
- `app/api-keys/_components/CreateApiKeyDialog.tsx` (4 fields: app name, rate limit, allowed origins, capabilities)

All seven have the same bug: the `Dialog`'s `onClose` prop is wired to
`() => { reset(); onClose(); }` (fires on backdrop click / Escape), but the
Cancel button's `onClick` is wired to bare `onClose` — so Cancel leaves
stale field values and error state behind for the next time the dialog
opens. `SetPasswordDialog` is worse: it has no `reset()` at all, so a
typed-but-not-submitted password and any error message persist
indefinitely.

`UploadAssetDialog` (`app/bart/_components/`) has the same clone shape plus
a file input. It stays a one-off — not folded into the shared primitive —
but gets the same reset-on-any-close fix applied locally.

`EditApiKeyDialog` is excluded: it's conditionally mounted per-key, so it
has no stale-state issue, and its multi-field edit-form shape doesn't match
this primitive.

### Design

New file: `app/components/ui/PromptDialog.tsx`.

```ts
export interface PromptDialogField {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password" | "number";
  required?: boolean; // default true
  min?: number; // only meaningful for type="number"
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
}): JSX.Element
```

- Field *values* stay controlled by the caller (existing per-field
  `useState` + setters at each call site are unchanged) — `PromptDialog`
  only owns rendering, `pending`, and `error`.
- The first field in `fields` gets `autoFocus`; no caller specifies it.
- `onSubmit` is the caller's async action (api-client call + toast +
  `onCreated`/`onAdded` callback, in that order) — it does **not** reset
  fields or close the dialog itself.
- `onClose` is the caller's single close handler, wired to reset that
  caller's field `useState`s and then call the page's real `onClose`.
- Internally, one `handleClose` does `setError(null)` then calls the
  caller's `onClose` — used for the `Dialog`'s `onClose` prop, the Cancel
  button's `onClick`, **and** the post-submit-success path. Because every
  close path funnels through this single function, the Cancel/backdrop
  inconsistency is fixed by construction, not by patching each of the 7
  call sites separately.
- `handleSubmit`: `e.preventDefault(); setPending(true); setError(null);
  try { await onSubmit(); handleClose(); } catch (err) { setError(...) }
  finally { setPending(false); }`.
- Submit button disabled state is `pending` only (matches every existing
  dialog except `UploadAssetDialog`, which isn't migrating).
- Rendering: same structure/classes as the current dialogs (label wrapper,
  `rounded-md border border-border bg-background px-2 py-1.5 text-sm`
  input, optional `<span className="text-xs text-foreground/50">` for
  `helperText`, error in `text-sm text-aim-danger`, footer with
  Cancel/secondary + Submit/primary buttons).

### Migration

Each of the 7 call sites keeps its own `useState`s for field values (and,
for `CreateUserDialog`/`CreateApiKeyDialog`, whatever it passes to
`onCreated`), but drops its own `reset()`-wrapped `Dialog` JSX in favor of
rendering `<PromptDialog>` with the field list, `onSubmit` doing the
api-client call + toast + callback, and `onClose` doing its local reset
then calling the prop `onClose`.

`CreateApiKeyDialog` keeps its `parseList` helper and `rateLimit` default
`"60"`; its `allowedOrigins`/`capabilities` fields pass `required: false`.

`UploadAssetDialog` is **not** migrated — only gets its `Dialog`'s
`onClose` wiring duplicated onto its Cancel button (same one-line fix
pattern, applied locally, no new abstraction).

## 2. useApiResource stale-data fix

### Problem

`app/lib/use-api-resource.ts`'s `useApiResource(fetcher)` re-runs its fetch
when `fetcher`'s identity changes (it's a `useCallback` dependency), but
`data`/`error` aren't cleared first — the previous fetcher's result stays
visible until the new fetch resolves. Flagged during the ICQ Profile
review; confirmed not currently reachable (this app doesn't enable
`cacheComponents`, so `[screenname]`-param navigation fully remounts the
page today), but worth closing since a future feature could rely on
`useApiResource` surviving a same-page param change.

### Design

Use React's documented "reset state when a prop changes" pattern — compare
`fetcher` against a `useRef` during render, and call `setState`
synchronously in the render body (not inside a `useEffect`), to avoid
retripping the `react-hooks/set-state-in-effect` rule this project hit
earlier:

```ts
export function useApiResource<T>(fetcher: () => Promise<T>): ApiResource<T> {
  const [state, setState] = useState<ApiResourceState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const prevFetcher = useRef(fetcher);
  if (prevFetcher.current !== fetcher) {
    prevFetcher.current = fetcher;
    setState({ data: null, loading: true, error: null });
  }

  // ...load/useEffect/refresh unchanged
}
```

The existing `useEffect(() => { load(); }, [load])` already re-runs when
`fetcher` (and therefore `load`) changes, so no new effect is needed — the
render-phase reset just ensures `data` doesn't linger stale while that
re-fetch is in flight.

## Testing

- `yarn lint` and `npx tsc --noEmit` clean.
- Manual click-through: for each of the 7 migrated dialogs, open it, type
  into a field, click Cancel, reopen — fields and any error should be
  blank/cleared (this is the regression test for the bug being fixed).
  Then do one successful submit end-to-end per dialog type (a plain
  create, and `CreateApiKeyDialog`'s multi-field create) to confirm
  `onSubmit`/`onCreated`/toast still fire correctly.
- `useApiResource`: no user-visible manual test currently possible (the
  gap isn't reachable via any existing page), so verification is
  type-check + lint + confirming existing consumers (`Users`, `Sessions`,
  etc.) still load/refresh correctly.

## Non-goals

- No changes to `EditApiKeyDialog` or `UploadAssetDialog`'s field shape.
- No changes to any api-client function signatures or `docs/api.yml`.
- No server-side (`open-oscar-server`) changes — explicitly out of scope.
