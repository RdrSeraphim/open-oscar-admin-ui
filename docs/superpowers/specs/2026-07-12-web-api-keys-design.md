# Web API Keys

## Context

`/api-keys` is currently a "coming soon" placeholder. This is the last remaining nav section. The underlying API (`docs/api.yml`, `Web API Management` tag) manages credentials for the separate Web AIM API — app name, rate limit, allowed CORS origins, and a capability list, keyed by a `dev_id`.

The one API-shape wrinkle: `POST /admin/webapi/keys` returns the created key plus a `dev_key` field — the actual secret — that is documented as "only shown once at creation time." No other endpoint (`GET`, `PUT`) ever returns it again. This drives the creation flow's UX.

## Scope

- List, create, edit, delete — full CRUD, matching the API.
- Create: app_name (required), allowed_origins and capabilities (both optional string arrays, entered as comma-separated text), rate_limit (number, defaults to 60).
- **One-time secret reveal**: after a successful create, a second dialog shows the returned `dev_key` in a copyable monospace block with a clear "you won't see this again" warning, before returning to the list. This is a two-step flow (create dialog → reveal dialog), not a single toast, because losing this value means the admin has to delete and recreate the key.
- Edit: a single dialog (per explicit choice over a separate inline toggle) covering everything `PUT` supports — app_name, is_active (checkbox), rate_limit, allowed_origins, capabilities. `dev_id` shown read-only; `dev_key` is never re-shown (the API doesn't return it outside creation).
- Delete: `ConfirmDialog` → `DELETE`.

## Route

`app/api-keys/page.tsx` (replaces the current placeholder), a client component with a single `useApiResource(listApiKeys)` call for the list.

## Shared lib additions

`app/lib/types.ts`:
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

`app/lib/api-client.ts` — same conventions as existing functions:
- `listApiKeys(): Promise<WebAPIKey[]>` → `GET /admin/webapi/keys`
- `createApiKey(patch: {app_name: string; allowed_origins?: string[]; rate_limit?: number; capabilities?: string[]}): Promise<CreatedWebAPIKey>` → `POST /admin/webapi/keys`
- `updateApiKey(devId: string, patch: {app_name?: string; is_active?: boolean; rate_limit?: number; allowed_origins?: string[]; capabilities?: string[]}): Promise<WebAPIKey>` → `PUT /admin/webapi/keys/{devId}`
- `deleteApiKey(devId: string): Promise<void>` → `DELETE /admin/webapi/keys/{devId}`

## Components (new)

`app/api-keys/_components/`:
- `CreateApiKeyDialog.tsx` — the four create fields; on success, calls back up to the page with the full `CreatedWebAPIKey` (not just a refresh signal — the page needs the `dev_key` to open the reveal dialog).
- `KeyRevealDialog.tsx` — displays one `dev_key` with a copy-to-clipboard button (native `navigator.clipboard.writeText`, no new dependency) and the one-time warning.
- `EditApiKeyDialog.tsx` — pre-filled with a key's current values, all five editable fields.

Reuses existing primitives (`Dialog`, `ConfirmDialog`, `Button`, `Badge`, `PageHeader`, `useToast`, `useApiResource`) — no new UI primitives.

## Verification

- `npm run lint` and `npx tsc --noEmit` pass.
- Against the live open-oscar-server: create a throwaway key, confirm the reveal dialog shows a real `dev_key` and copy works, edit the key (toggle inactive, change rate limit), confirm the list reflects it, delete it. Same throwaway-and-cleanup approach as prior verification passes.
