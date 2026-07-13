# Instant Message

## Context

`/instant-message` is currently a "coming soon" placeholder. The underlying API (`POST /instant-message`) is a single, stateless action — send a test IM from one screen name to another — with no list/read endpoint at all. This is the smallest section left to build: one form, one action, no CRUD.

## Scope

- Single form: From (sender screen name), To (recipient screen name), Text (message body). All three required in the UI, even though the API's schema doesn't mark them `required` — an empty send isn't meaningful.
- Submit → `POST /instant-message`. Per the API description, no error is raised if the recipient doesn't exist or is offline, and the sender doesn't need to exist either — so a 200 just means "accepted," not "delivered." The UI should reflect that (a plain "Sent" confirmation, not a delivery guarantee).
- On success: toast + full form reset (all three fields clear).
- On error (400, bad request): inline error message above the submit button, matching the form-error pattern used elsewhere in the app (e.g. `CreateUserDialog`).
- No new components — this is small enough to be one page file with local form state. No new types — the request has no meaningful response body (matches the existing `apiFetch` plain-text/empty-body fallback).

## Route

`app/instant-message/page.tsx` (replaces the current placeholder), a client component with local `from`/`to`/`text`/`pending`/`error` state — no `useApiResource` needed since there's nothing to fetch.

## Shared lib addition

`app/lib/api-client.ts`:
- `sendInstantMessage(from: string, to: string, text: string): Promise<void>` → `POST /instant-message` with `{from, to, text}`.

## Verification

- `npm run lint` and `npx tsc --noEmit` pass.
- Against the live open-oscar-server: send a test message between two screen names (existing or not — per the API, neither needs to exist), confirm the success toast and form reset, and confirm a malformed/empty request is rejected with a visible inline error.
