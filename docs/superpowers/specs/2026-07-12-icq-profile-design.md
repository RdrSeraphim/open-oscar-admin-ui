# ICQ Profile

## Context

While investigating why a user's AIM "profile"/bio never shows up in the admin API (see `docs/superpowers/specs/` history — resolved separately by removing that dead UI), a diff of open-oscar-server's actual HTTP route table against `docs/api.yml` turned up two real, functioning, but **entirely undocumented** endpoints: `GET /user/{screenname}/icq` and `PUT /user/{screenname}/icq`. These expose a full ICQ profile — nickname, contact info, work info, notes, interests, affiliations, and privacy permissions — for ICQ accounts (`is_icq: true`). aimctl already distinguishes AIM vs ICQ everywhere (the badge on every user list) but has zero ICQ-specific profile visibility or editing. This spec adds that.

Since this project's convention is to build UI from `docs/api.yml` as the source of truth (not tribal knowledge of the server source), documenting these two endpoints there is part of this feature's own implementation work, not a separate pre-step.

## Confirmed API shape (from reading `open-oscar-server`'s `server/http/mgmt_api.go` and `types.go` directly)

`GET /user/{screenname}/icq` — 200 with the full profile below; 404 if the user doesn't exist; 400 if the user exists but `is_icq` is false ("user is not an ICQ account").

`PUT /user/{screenname}/icq` — **replaces the entire profile in one call** (there is no partial-patch support — the handler decodes the full request body into the same struct `GET` returns and writes every section). 204 on success; 404/400 same as `GET`; 400 with a semicolon-joined validation message (`{"message": "field basic_info.nickname exceeds max length of 20 (got ...); ..."}`) if any field fails server-side validation.

Full field list (JSON key, type, and the server's own validated max length where one exists):

**basic_info** — `nickname` (≤20), `first_name` (≤64), `last_name` (≤64), `email` (≤64), `city` (≤64), `state` (≤64), `phone` (≤30), `fax` (≤30), `address` (≤64), `cell_phone` (≤30), `zip` (≤12), `country_code` (uint16, no length check), `gmt_offset` (uint8), `publish_email` (bool), `origin_city` (≤64), `origin_state` (≤64), `origin_country_code` (uint16).

**more_info** — `gender` (uint16, server-validated to 0/1/2 = unspecified/female/male), `homepage` (≤127), `birth_year` (uint16), `birth_month` (uint8, server-validated 0-12), `birth_day` (uint8, server-validated 0-31), `lang1`/`lang2`/`lang3` (uint8 each).

**work_info** — `company` (≤64), `department` (≤64), `position` (≤64), `occupation_code` (uint16), `address` (≤64), `city` (≤64), `state` (≤64), `zip` (≤12), `country_code` (uint16), `phone` (≤30), `fax` (≤30), `web_page` (≤127).

**notes** — a single string (≤450).

**interests** — 4 code/keyword pairs: `code1`/`keyword1` (≤64) ... `code4`/`keyword4` (≤64), codes are uint16.

**affiliations** — 6 code/keyword pairs: `past_code1`/`past_keyword1` (≤64) ... `past_code3`/`past_keyword3`, `current_code1`/`current_keyword1` ... `current_code3`/`current_keyword3`, codes are uint16.

**permissions** — `auth_required`, `web_aware`, `allow_spam` (all bool).

Plus a top-level `uin` (uint32, read-only — the ICQ number, not editable).

## Scope

- Full richness: every field above, in one page, no curation. Since `PUT` is whole-object-replace anyway, there's no meaningful savings in exposing less — the round trip has to carry everything regardless.
- Numeric category-code fields (`gender`, `country_code` ×3, `lang1-3`, `occupation_code`, all `interests`/`affiliations` codes) render as plain `<input type="number">` — no fabricated ICQ code-to-label lookup tables. Admins who know the codes enter them directly; this matches what the API actually stores.
- Text fields get `maxLength` matching the server's validated limits, as a nice-to-have that avoids most round-trip validation failures — not a substitute for server-side validation, which still governs and whose (possibly multi-part, semicolon-joined) error message surfaces through the existing `apiFetch` error-message extraction unchanged.
- No group/edit split — one page, one form, one save action for the whole profile.

## Route

`app/users/[screenname]/icq/page.tsx` (new), a client component:

- `useApiResource(() => getICQProfile(screenname))` fetches the full profile.
- Once loaded, renders `IcqProfileForm`, passing the fetched (non-null) profile as a prop. `IcqProfileForm` initializes all its local state directly from that prop via `useState` initializers — no `useEffect` sync (same established pattern as `EditApiKeyDialog`, since this form needs pre-filled, editable local state derived from an async-loaded value).
- Submitting reassembles the full object and calls `updateICQProfile(screenname, profile)` → on success, toast + `refresh()` (re-fetches and the form remounts with fresh data via a `key` on the loaded value, or simply re-renders with updated defaults) — stays on the page rather than navigating away, so further edits don't require re-navigating.
- `app/users/[screenname]/page.tsx` gets a new "ICQ Profile" button in its header actions, rendered only when `account.is_icq` is true, linking to `/users/{screenname}/icq`.

## Shared lib additions

`docs/api.yml`: add the `/user/{screenname}/icq` path (GET + PUT) with the full schema above, as its own implementation task (see plan).

`app/lib/types.ts`:
```ts
export interface IcqBasicInfo {
  nickname: string;
  first_name: string;
  last_name: string;
  email: string;
  city: string;
  state: string;
  phone: string;
  fax: string;
  address: string;
  cell_phone: string;
  zip: string;
  country_code: number;
  gmt_offset: number;
  publish_email: boolean;
  origin_city: string;
  origin_state: string;
  origin_country_code: number;
}

export interface IcqMoreInfo {
  gender: number;
  homepage: string;
  birth_year: number;
  birth_month: number;
  birth_day: number;
  lang1: number;
  lang2: number;
  lang3: number;
}

export interface IcqWorkInfo {
  company: string;
  department: string;
  position: string;
  occupation_code: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  country_code: number;
  phone: string;
  fax: string;
  web_page: string;
}

export interface IcqInterests {
  code1: number;
  keyword1: string;
  code2: number;
  keyword2: string;
  code3: number;
  keyword3: string;
  code4: number;
  keyword4: string;
}

export interface IcqAffiliations {
  past_code1: number;
  past_keyword1: string;
  past_code2: number;
  past_keyword2: string;
  past_code3: number;
  past_keyword3: string;
  current_code1: number;
  current_keyword1: string;
  current_code2: number;
  current_keyword2: string;
  current_code3: number;
  current_keyword3: string;
}

export interface IcqPermissions {
  auth_required: boolean;
  web_aware: boolean;
  allow_spam: boolean;
}

export interface IcqProfile {
  uin: number;
  basic_info: IcqBasicInfo;
  more_info: IcqMoreInfo;
  work_info: IcqWorkInfo;
  notes: string;
  interests: IcqInterests;
  affiliations: IcqAffiliations;
  permissions: IcqPermissions;
}
```

`app/lib/api-client.ts`:
- `getICQProfile(screenName: string): Promise<IcqProfile>` → `GET /user/{screenname}/icq`
- `updateICQProfile(screenName: string, profile: IcqProfile): Promise<void>` → `PUT /user/{screenname}/icq` (send the whole object; `uin` is included but the server ignores it as read-only)

## Components (new)

`app/users/[screenname]/icq/_components/IcqProfileForm.tsx` — the whole form, section-organized into cards (Basic Info, More Info, Work Info, Notes, Interests, Affiliations, Permissions), reusing existing primitives (`Button`) — no new UI primitives, just plain labeled inputs matching the styling already used throughout the app's forms.

## Verification

- `npm run lint` and `npx tsc --noEmit` pass.
- Against the live open-oscar-server: open the ICQ Profile page for an ICQ test account (create a throwaway ICQ user if the existing test account is AIM), confirm the fetched values populate the form, edit a handful of fields across different sections (including at least one numeric code field), save, confirm the toast and that a refetch shows the saved values, and confirm the "not an ICQ account" 400 is handled gracefully if attempted against an AIM account (shouldn't be reachable via the UI's own gating, but the api-client function itself should surface the error cleanly if hit directly).
