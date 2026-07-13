# ICQ Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin view and edit the full ICQ profile (basic info, more info, work info, notes, interests, affiliations, permissions) for ICQ accounts, at a new `/users/[screenname]/icq` page linked from the user detail page (only shown for ICQ accounts).

**Architecture:** First, document the two real-but-undocumented server endpoints (`GET`/`PUT /user/{screenname}/icq`) in `docs/api.yml`, since this project builds UI from that spec as its source of truth. Then the usual pattern: api-client functions, a form component that takes the loaded profile as a prop and initializes its (large but flat) local state directly from it — no `useEffect` sync, same established pattern as `EditApiKeyDialog` — and a page that fetches once and renders the form.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4. No test runner configured — verification is `npx tsc --noEmit` + `npm run lint` per task, plus a final live-server walkthrough.

## Global Constraints

- `PUT /user/{screenname}/icq` replaces the **entire** profile object in one call — there is no partial-patch support. Always send all seven sections (`basic_info`, `more_info`, `work_info`, `notes`, `interests`, `affiliations`, `permissions`) plus `uin`.
- Numeric ICQ category-code fields (`gender`, `country_code` ×3, `lang1-3`, `occupation_code`, all `interests`/`affiliations` codes) are plain `<input type="number">` — no fabricated code-to-label lookup tables.
- Text fields get `maxLength` matching the server's actual validated limits (documented per-field in the spec below) as a nice-to-have; the server's own (possibly multi-part, semicolon-joined) validation error still governs and surfaces through the existing `apiFetch` error-message extraction unchanged — no special-casing needed for it.
- **Simplification from the design spec, noted explicitly here:** the spec described "save → toast + refresh()". In practice, `PUT` returns `204` with no body, and the form's own local state (what was just submitted) is already exactly what's now persisted — there's nothing a re-fetch would reveal that isn't already on screen. So `IcqProfileForm` does NOT take an `onSaved`/refresh callback; it just shows a success toast and keeps the current (already-correct) values displayed. This is a deliberate simplification, not an oversight — do not add a refresh callback back in.
- `IcqProfileForm` takes a non-null `profile: IcqProfile` prop and initializes every `useState` directly from it — no `useEffect` sync (this codebase fixed a `react-hooks/set-state-in-effect` lint failure once already by adopting this pattern; see `app/api-keys/_components/EditApiKeyDialog.tsx`).
- Reuse existing primitives (`Button`, `PageHeader`, `useToast`, `useApiResource`) — no new UI primitives.
- All new client components/pages need `"use client"` at the top.

---

### Task 1: Document `/user/{screenname}/icq` in `docs/api.yml`

**Files:**
- Modify: `docs/api.yml`

**Interfaces:**
- Produces: the `IcqProfile`, `IcqBasicInfo`, `IcqMoreInfo`, `IcqWorkInfo`, `IcqInterests`, `IcqAffiliations`, `IcqPermissions` schemas, referenced by Task 2's TypeScript types (which mirror this schema field-for-field).

- [ ] **Step 1: Insert the path definition**

In `docs/api.yml`, find this exact block (the end of the `/user/{screenname}/icon` path, right before `/session:`):

```yaml
        '404':
          description: User not found, or user has no buddy icon

  /session:
```

Replace it with (inserting the new path between them):

```yaml
        '404':
          description: User not found, or user has no buddy icon

  /user/{screenname}/icq:
    get:
      summary: Get ICQ profile for a screen name
      description: Retrieve the full ICQ profile for a specific ICQ account.
      tags: [ ICQ Profile ]
      parameters:
        - in: path
          name: screenname
          schema:
            type: string
          description: User's ICQ UIN.
          required: true
      responses:
        '200':
          description: Successful response containing the ICQ profile.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/IcqProfile'
        '400':
          description: Bad request. The user exists but is not an ICQ account.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageResponse'
        '404':
          description: User not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageResponse'
    put:
      summary: Update ICQ profile for a screen name
      description: |
        Replace the full ICQ profile for a specific ICQ account. This is a
        whole-object replace, not a partial patch — all sections must be
        included in the request body.
      tags: [ ICQ Profile ]
      parameters:
        - in: path
          name: screenname
          schema:
            type: string
          description: User's ICQ UIN.
          required: true
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/IcqProfile'
      responses:
        '204':
          description: ICQ profile updated successfully.
        '400':
          description: Bad request. Invalid input data, or the user is not an ICQ account.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageResponse'
        '404':
          description: User not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageResponse'

  /session:
```

- [ ] **Step 2: Append the schemas**

Add to the very end of `docs/api.yml` (after the existing `WebAPIKey` schema, maintaining the file's 4-space property indentation under `components: schemas:`):

```yaml

    IcqProfile:
      type: object
      properties:
        uin:
          type: integer
          description: The user's ICQ UIN (read-only).
        basic_info:
          $ref: '#/components/schemas/IcqBasicInfo'
        more_info:
          $ref: '#/components/schemas/IcqMoreInfo'
        work_info:
          $ref: '#/components/schemas/IcqWorkInfo'
        notes:
          type: string
          description: Free-text notes (max 450 characters).
        interests:
          $ref: '#/components/schemas/IcqInterests'
        affiliations:
          $ref: '#/components/schemas/IcqAffiliations'
        permissions:
          $ref: '#/components/schemas/IcqPermissions'

    IcqBasicInfo:
      type: object
      properties:
        nickname:
          type: string
          description: Max 20 characters.
        first_name:
          type: string
          description: Max 64 characters.
        last_name:
          type: string
          description: Max 64 characters.
        email:
          type: string
          description: Max 64 characters.
        city:
          type: string
          description: Max 64 characters.
        state:
          type: string
          description: Max 64 characters.
        phone:
          type: string
          description: Max 30 characters.
        fax:
          type: string
          description: Max 30 characters.
        address:
          type: string
          description: Max 64 characters.
        cell_phone:
          type: string
          description: Max 30 characters.
        zip:
          type: string
          description: Max 12 characters.
        country_code:
          type: integer
          description: ICQ country code.
        gmt_offset:
          type: integer
          description: GMT offset.
        publish_email:
          type: boolean
        origin_city:
          type: string
          description: Max 64 characters.
        origin_state:
          type: string
          description: Max 64 characters.
        origin_country_code:
          type: integer
          description: ICQ country code for the user's original home.

    IcqMoreInfo:
      type: object
      properties:
        gender:
          type: integer
          description: "0 = unspecified, 1 = female, 2 = male."
        homepage:
          type: string
          description: Max 127 characters.
        birth_year:
          type: integer
        birth_month:
          type: integer
          description: 0-12.
        birth_day:
          type: integer
          description: 0-31.
        lang1:
          type: integer
          description: ICQ language code.
        lang2:
          type: integer
          description: ICQ language code.
        lang3:
          type: integer
          description: ICQ language code.

    IcqWorkInfo:
      type: object
      properties:
        company:
          type: string
          description: Max 64 characters.
        department:
          type: string
          description: Max 64 characters.
        position:
          type: string
          description: Max 64 characters.
        occupation_code:
          type: integer
          description: ICQ occupation code.
        address:
          type: string
          description: Max 64 characters.
        city:
          type: string
          description: Max 64 characters.
        state:
          type: string
          description: Max 64 characters.
        zip:
          type: string
          description: Max 12 characters.
        country_code:
          type: integer
          description: ICQ country code.
        phone:
          type: string
          description: Max 30 characters.
        fax:
          type: string
          description: Max 30 characters.
        web_page:
          type: string
          description: Max 127 characters.

    IcqInterests:
      type: object
      properties:
        code1:
          type: integer
          description: ICQ interest category code.
        keyword1:
          type: string
          description: Max 64 characters.
        code2:
          type: integer
          description: ICQ interest category code.
        keyword2:
          type: string
          description: Max 64 characters.
        code3:
          type: integer
          description: ICQ interest category code.
        keyword3:
          type: string
          description: Max 64 characters.
        code4:
          type: integer
          description: ICQ interest category code.
        keyword4:
          type: string
          description: Max 64 characters.

    IcqAffiliations:
      type: object
      properties:
        past_code1:
          type: integer
          description: ICQ affiliation category code.
        past_keyword1:
          type: string
          description: Max 64 characters.
        past_code2:
          type: integer
          description: ICQ affiliation category code.
        past_keyword2:
          type: string
          description: Max 64 characters.
        past_code3:
          type: integer
          description: ICQ affiliation category code.
        past_keyword3:
          type: string
          description: Max 64 characters.
        current_code1:
          type: integer
          description: ICQ affiliation category code.
        current_keyword1:
          type: string
          description: Max 64 characters.
        current_code2:
          type: integer
          description: ICQ affiliation category code.
        current_keyword2:
          type: string
          description: Max 64 characters.
        current_code3:
          type: integer
          description: ICQ affiliation category code.
        current_keyword3:
          type: string
          description: Max 64 characters.

    IcqPermissions:
      type: object
      properties:
        auth_required:
          type: boolean
        web_aware:
          type: boolean
        allow_spam:
          type: boolean
```

- [ ] **Step 3: Verify**

Run: `python3 -c "import yaml; yaml.safe_load(open('docs/api.yml'))" && echo VALID_YAML`
Expected: prints `VALID_YAML` with no error (confirms the inserted YAML is well-formed and didn't break the file). If `python3`/`pyyaml` isn't available, visually double check indentation instead — every new line must match the file's existing 2-space (paths) / 4-space (schema properties) indentation exactly, and the `docs/api.yml` file must still open/scroll normally in an editor with no obvious structural break.

- [ ] **Step 4: Commit**

```bash
git add docs/api.yml
git commit -m "Document GET/PUT /user/{screenname}/icq in the OpenAPI spec"
```

---

### Task 2: Extend shared lib — types and api-client functions

**Files:**
- Modify: `app/lib/types.ts` (append at end of file)
- Modify: `app/lib/api-client.ts`

**Interfaces:**
- Produces: `IcqBasicInfo`, `IcqMoreInfo`, `IcqWorkInfo`, `IcqInterests`, `IcqAffiliations`, `IcqPermissions`, `IcqProfile` (types, field shapes exactly matching Task 1's OpenAPI schemas)
- Produces: `getICQProfile(screenName: string): Promise<IcqProfile>`, `updateICQProfile(screenName: string, profile: IcqProfile): Promise<void>` (functions, consumed by Task 3 and Task 4)

- [ ] **Step 1: Append the new types**

Add to the end of `app/lib/types.ts`:

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

- [ ] **Step 2: Update the import line in `app/lib/api-client.ts`**

Current:

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

Replace with:

```ts
import type {
  Account,
  BartAsset,
  BuddyGroup,
  Category,
  CreatedWebAPIKey,
  IcqProfile,
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

Add to the end of `app/lib/api-client.ts` (after the existing `deleteApiKey` function):

```ts
export function getICQProfile(screenName: string): Promise<IcqProfile> {
  return apiFetch<IcqProfile>(`/user/${encodeURIComponent(screenName)}/icq`);
}

export function updateICQProfile(
  screenName: string,
  profile: IcqProfile,
): Promise<void> {
  return apiFetch(`/user/${encodeURIComponent(screenName)}/icq`, {
    method: "PUT",
    body: JSON.stringify(profile),
  });
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 5: Commit**

```bash
git add app/lib/types.ts app/lib/api-client.ts
git commit -m "Add ICQ profile types and api-client functions"
```

---

### Task 3: `IcqProfileForm` component

**Files:**
- Create: `app/users/[screenname]/icq/_components/IcqProfileForm.tsx`

**Interfaces:**
- Consumes: `updateICQProfile` from Task 2; `IcqProfile`, `IcqBasicInfo`, `IcqMoreInfo`, `IcqWorkInfo`, `IcqInterests`, `IcqAffiliations`, `IcqPermissions` types from Task 2; `Button` from `app/components/ui/Button.tsx`; `useToast` from `app/components/ui/ToastProvider.tsx`.
- Produces: `IcqProfileForm({ screenName: string, profile: IcqProfile })` — consumed by Task 4's `page.tsx`. No `onSaved` callback (see Global Constraints).

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { updateICQProfile } from "@/app/lib/api-client";
import { useToast } from "@/app/components/ui/ToastProvider";
import type {
  IcqAffiliations,
  IcqBasicInfo,
  IcqInterests,
  IcqMoreInfo,
  IcqPermissions,
  IcqProfile,
  IcqWorkInfo,
} from "@/app/lib/types";

const inputClass = "rounded-md border border-border bg-background px-2 py-1.5 text-sm";
const labelClass = "flex flex-col gap-1 text-sm";

export function IcqProfileForm({
  screenName,
  profile,
}: {
  screenName: string;
  profile: IcqProfile;
}) {
  const [basicInfo, setBasicInfo] = useState<IcqBasicInfo>(profile.basic_info);
  const [moreInfo, setMoreInfo] = useState<IcqMoreInfo>(profile.more_info);
  const [workInfo, setWorkInfo] = useState<IcqWorkInfo>(profile.work_info);
  const [notes, setNotes] = useState(profile.notes);
  const [interests, setInterests] = useState<IcqInterests>(profile.interests);
  const [affiliations, setAffiliations] = useState<IcqAffiliations>(profile.affiliations);
  const [permissions, setPermissions] = useState<IcqPermissions>(profile.permissions);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  function basicField<K extends keyof IcqBasicInfo>(key: K, value: IcqBasicInfo[K]) {
    setBasicInfo((prev) => ({ ...prev, [key]: value }));
  }
  function moreField<K extends keyof IcqMoreInfo>(key: K, value: IcqMoreInfo[K]) {
    setMoreInfo((prev) => ({ ...prev, [key]: value }));
  }
  function workField<K extends keyof IcqWorkInfo>(key: K, value: IcqWorkInfo[K]) {
    setWorkInfo((prev) => ({ ...prev, [key]: value }));
  }
  function interestField<K extends keyof IcqInterests>(key: K, value: IcqInterests[K]) {
    setInterests((prev) => ({ ...prev, [key]: value }));
  }
  function affiliationField<K extends keyof IcqAffiliations>(
    key: K,
    value: IcqAffiliations[K],
  ) {
    setAffiliations((prev) => ({ ...prev, [key]: value }));
  }
  function permissionField<K extends keyof IcqPermissions>(
    key: K,
    value: IcqPermissions[K],
  ) {
    setPermissions((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await updateICQProfile(screenName, {
        uin: profile.uin,
        basic_info: basicInfo,
        more_info: moreInfo,
        work_info: workInfo,
        notes,
        interests,
        affiliations,
        permissions,
      });
      showToast("ICQ profile saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save ICQ profile");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Basic Info</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Nickname
            <input
              maxLength={20}
              value={basicInfo.nickname}
              onChange={(e) => basicField("nickname", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            First name
            <input
              maxLength={64}
              value={basicInfo.first_name}
              onChange={(e) => basicField("first_name", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Last name
            <input
              maxLength={64}
              value={basicInfo.last_name}
              onChange={(e) => basicField("last_name", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Email
            <input
              maxLength={64}
              value={basicInfo.email}
              onChange={(e) => basicField("email", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            City
            <input
              maxLength={64}
              value={basicInfo.city}
              onChange={(e) => basicField("city", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            State
            <input
              maxLength={64}
              value={basicInfo.state}
              onChange={(e) => basicField("state", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Phone
            <input
              maxLength={30}
              value={basicInfo.phone}
              onChange={(e) => basicField("phone", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Fax
            <input
              maxLength={30}
              value={basicInfo.fax}
              onChange={(e) => basicField("fax", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Address
            <input
              maxLength={64}
              value={basicInfo.address}
              onChange={(e) => basicField("address", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Cell phone
            <input
              maxLength={30}
              value={basicInfo.cell_phone}
              onChange={(e) => basicField("cell_phone", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            ZIP
            <input
              maxLength={12}
              value={basicInfo.zip}
              onChange={(e) => basicField("zip", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Country code
            <input
              type="number"
              value={basicInfo.country_code}
              onChange={(e) => basicField("country_code", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            GMT offset
            <input
              type="number"
              value={basicInfo.gmt_offset}
              onChange={(e) => basicField("gmt_offset", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Origin city
            <input
              maxLength={64}
              value={basicInfo.origin_city}
              onChange={(e) => basicField("origin_city", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Origin state
            <input
              maxLength={64}
              value={basicInfo.origin_state}
              onChange={(e) => basicField("origin_state", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Origin country code
            <input
              type="number"
              value={basicInfo.origin_country_code}
              onChange={(e) =>
                basicField("origin_country_code", Number(e.target.value))
              }
              className={inputClass}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={basicInfo.publish_email}
            onChange={(e) => basicField("publish_email", e.target.checked)}
            className="h-4 w-4 accent-aim-blue"
          />
          Publish email
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">More Info</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Gender (0=unspecified, 1=female, 2=male)
            <input
              type="number"
              min={0}
              max={2}
              value={moreInfo.gender}
              onChange={(e) => moreField("gender", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Homepage
            <input
              maxLength={127}
              value={moreInfo.homepage}
              onChange={(e) => moreField("homepage", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Birth year
            <input
              type="number"
              value={moreInfo.birth_year}
              onChange={(e) => moreField("birth_year", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Birth month (0-12)
            <input
              type="number"
              min={0}
              max={12}
              value={moreInfo.birth_month}
              onChange={(e) => moreField("birth_month", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Birth day (0-31)
            <input
              type="number"
              min={0}
              max={31}
              value={moreInfo.birth_day}
              onChange={(e) => moreField("birth_day", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Language 1 (code)
            <input
              type="number"
              value={moreInfo.lang1}
              onChange={(e) => moreField("lang1", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Language 2 (code)
            <input
              type="number"
              value={moreInfo.lang2}
              onChange={(e) => moreField("lang2", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Language 3 (code)
            <input
              type="number"
              value={moreInfo.lang3}
              onChange={(e) => moreField("lang3", Number(e.target.value))}
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Work Info</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Company
            <input
              maxLength={64}
              value={workInfo.company}
              onChange={(e) => workField("company", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Department
            <input
              maxLength={64}
              value={workInfo.department}
              onChange={(e) => workField("department", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Position
            <input
              maxLength={64}
              value={workInfo.position}
              onChange={(e) => workField("position", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Occupation code
            <input
              type="number"
              value={workInfo.occupation_code}
              onChange={(e) => workField("occupation_code", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Address
            <input
              maxLength={64}
              value={workInfo.address}
              onChange={(e) => workField("address", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            City
            <input
              maxLength={64}
              value={workInfo.city}
              onChange={(e) => workField("city", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            State
            <input
              maxLength={64}
              value={workInfo.state}
              onChange={(e) => workField("state", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            ZIP
            <input
              maxLength={12}
              value={workInfo.zip}
              onChange={(e) => workField("zip", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Country code
            <input
              type="number"
              value={workInfo.country_code}
              onChange={(e) => workField("country_code", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Phone
            <input
              maxLength={30}
              value={workInfo.phone}
              onChange={(e) => workField("phone", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Fax
            <input
              maxLength={30}
              value={workInfo.fax}
              onChange={(e) => workField("fax", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Web page
            <input
              maxLength={127}
              value={workInfo.web_page}
              onChange={(e) => workField("web_page", e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Notes</h2>
        <textarea
          maxLength={450}
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputClass}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Interests</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Interest 1 code
            <input
              type="number"
              value={interests.code1}
              onChange={(e) => interestField("code1", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Interest 1 keyword
            <input
              maxLength={64}
              value={interests.keyword1}
              onChange={(e) => interestField("keyword1", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Interest 2 code
            <input
              type="number"
              value={interests.code2}
              onChange={(e) => interestField("code2", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Interest 2 keyword
            <input
              maxLength={64}
              value={interests.keyword2}
              onChange={(e) => interestField("keyword2", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Interest 3 code
            <input
              type="number"
              value={interests.code3}
              onChange={(e) => interestField("code3", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Interest 3 keyword
            <input
              maxLength={64}
              value={interests.keyword3}
              onChange={(e) => interestField("keyword3", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Interest 4 code
            <input
              type="number"
              value={interests.code4}
              onChange={(e) => interestField("code4", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Interest 4 keyword
            <input
              maxLength={64}
              value={interests.keyword4}
              onChange={(e) => interestField("keyword4", e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Affiliations</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Past affiliation 1 code
            <input
              type="number"
              value={affiliations.past_code1}
              onChange={(e) => affiliationField("past_code1", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Past affiliation 1 keyword
            <input
              maxLength={64}
              value={affiliations.past_keyword1}
              onChange={(e) => affiliationField("past_keyword1", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Past affiliation 2 code
            <input
              type="number"
              value={affiliations.past_code2}
              onChange={(e) => affiliationField("past_code2", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Past affiliation 2 keyword
            <input
              maxLength={64}
              value={affiliations.past_keyword2}
              onChange={(e) => affiliationField("past_keyword2", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Past affiliation 3 code
            <input
              type="number"
              value={affiliations.past_code3}
              onChange={(e) => affiliationField("past_code3", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Past affiliation 3 keyword
            <input
              maxLength={64}
              value={affiliations.past_keyword3}
              onChange={(e) => affiliationField("past_keyword3", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Current affiliation 1 code
            <input
              type="number"
              value={affiliations.current_code1}
              onChange={(e) =>
                affiliationField("current_code1", Number(e.target.value))
              }
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Current affiliation 1 keyword
            <input
              maxLength={64}
              value={affiliations.current_keyword1}
              onChange={(e) => affiliationField("current_keyword1", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Current affiliation 2 code
            <input
              type="number"
              value={affiliations.current_code2}
              onChange={(e) =>
                affiliationField("current_code2", Number(e.target.value))
              }
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Current affiliation 2 keyword
            <input
              maxLength={64}
              value={affiliations.current_keyword2}
              onChange={(e) => affiliationField("current_keyword2", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Current affiliation 3 code
            <input
              type="number"
              value={affiliations.current_code3}
              onChange={(e) =>
                affiliationField("current_code3", Number(e.target.value))
              }
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Current affiliation 3 keyword
            <input
              maxLength={64}
              value={affiliations.current_keyword3}
              onChange={(e) => affiliationField("current_keyword3", e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Permissions</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={permissions.auth_required}
            onChange={(e) => permissionField("auth_required", e.target.checked)}
            className="h-4 w-4 accent-aim-blue"
          />
          Authorization required
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={permissions.web_aware}
            onChange={(e) => permissionField("web_aware", e.target.checked)}
            className="h-4 w-4 accent-aim-blue"
          />
          Web aware
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={permissions.allow_spam}
            onChange={(e) => permissionField("allow_spam", e.target.checked)}
            className="h-4 w-4 accent-aim-blue"
          />
          Allow spam
        </label>
      </section>

      {error && <p className="text-sm text-aim-danger">{error}</p>}

      <div>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : "Save ICQ profile"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 3: Commit**

```bash
git add app/users/\[screenname\]/icq/
git commit -m "Add IcqProfileForm component"
```

---

### Task 4: `/users/[screenname]/icq` page

**Files:**
- Create: `app/users/[screenname]/icq/page.tsx`

**Interfaces:**
- Consumes: `getICQProfile` from Task 2; `IcqProfileForm` from Task 3; `PageHeader`, `Button` from `app/components/ui/`; `useApiResource` from `app/lib/use-api-resource.ts`.
- Produces: nothing consumed by later tasks — this is a leaf page.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { use, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { getICQProfile } from "@/app/lib/api-client";
import { useApiResource } from "@/app/lib/use-api-resource";
import { IcqProfileForm } from "./_components/IcqProfileForm";

export default function IcqProfilePage({
  params,
}: {
  params: Promise<{ screenname: string }>;
}) {
  const { screenname } = use(params);

  const fetchProfile = useCallback(() => getICQProfile(screenname), [screenname]);
  const { data: profile, loading, error } = useApiResource(fetchProfile);

  return (
    <div>
      <PageHeader
        title={`${screenname} — ICQ Profile`}
        actions={
          <Link href={`/users/${encodeURIComponent(screenname)}`}>
            <Button variant="secondary">Back to user</Button>
          </Link>
        }
      />

      {loading && <p className="text-sm text-foreground/70">Loading ICQ profile…</p>}
      {error && <p className="text-sm text-aim-danger">{error}</p>}

      {profile && <IcqProfileForm screenName={screenname} profile={profile} />}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 3: Commit**

```bash
git add app/users/\[screenname\]/icq/page.tsx
git commit -m "Add /users/[screenname]/icq page"
```

---

### Task 5: Link to the ICQ profile from the user detail page

**Files:**
- Modify: `app/users/[screenname]/page.tsx:48-63`

**Interfaces:**
- Consumes: nothing new — `Link` and `Button` are already imported in this file.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the conditional "ICQ Profile" button**

Current block in `app/users/[screenname]/page.tsx`:

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
            {account?.is_icq && (
              <Link href={`/users/${encodeURIComponent(screenname)}/icq`}>
                <Button variant="secondary">ICQ Profile</Button>
              </Link>
            )}
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Delete user
            </Button>
          </>
        }
      />
```

Note: `account` may still be `null` while loading — `account?.is_icq` correctly renders nothing until the account data arrives, then shows the button only for ICQ accounts, exactly like the existing `{account && (...)}` blocks lower on this page.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 3: Commit**

```bash
git add app/users/\[screenname\]/page.tsx
git commit -m "Link to ICQ profile from user detail page for ICQ accounts"
```

---

### Task 6: Live-server verification pass

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Confirm the dev server is up against a real open-oscar-server**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:PORT/
```

(Use whatever port `npm run dev` actually bound.)

- [ ] **Step 2: Create a throwaway ICQ test account**

The server classifies any screen name consisting entirely of digits as an ICQ UIN automatically (confirmed by reading `state/user.go`'s `IsUIN()` in the open-oscar-server source) — no separate "is_icq" flag needed on create.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:PORT/api/user \
  -H "Content-Type: application/json" -d '{"screen_name":"900100100","password":"TempPass123!"}'
```

Expected: `201`.

- [ ] **Step 3: Fetch the ICQ profile and confirm the page renders it**

```bash
curl -s http://localhost:PORT/api/user/900100100/icq
```

Expected: `200` with the full nested JSON structure (`uin`, `basic_info`, `more_info`, `work_info`, `notes`, `interests`, `affiliations`, `permissions`), all fields empty/zero for a freshly created account. Then navigate to `http://localhost:PORT/users/900100100/icq` (or check via curl that the page route itself returns 200):

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:PORT/users/900100100/icq
```

Expected: `200`.

- [ ] **Step 4: Update the profile and confirm it persists**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X PUT http://localhost:PORT/api/user/900100100/icq \
  -H "Content-Type: application/json" \
  -d '{"uin":900100100,"basic_info":{"nickname":"aimctltest","first_name":"","last_name":"","email":"","city":"","state":"","phone":"","fax":"","address":"","cell_phone":"","zip":"","country_code":1,"gmt_offset":0,"publish_email":false,"origin_city":"","origin_state":"","origin_country_code":0},"more_info":{"gender":1,"homepage":"","birth_year":0,"birth_month":0,"birth_day":0,"lang1":0,"lang2":0,"lang3":0},"work_info":{"company":"","department":"","position":"","occupation_code":0,"address":"","city":"","state":"","zip":"","country_code":0,"phone":"","fax":"","web_page":""},"notes":"verification test","interests":{"code1":0,"keyword1":"","code2":0,"keyword2":"","code3":0,"keyword3":"","code4":0,"keyword4":""},"affiliations":{"past_code1":0,"past_keyword1":"","past_code2":0,"past_keyword2":"","past_code3":0,"past_keyword3":"","current_code1":0,"current_keyword1":"","current_code2":0,"current_keyword2":"","current_code3":0,"current_keyword3":""},"permissions":{"auth_required":false,"web_aware":true,"allow_spam":false}}'
curl -s http://localhost:PORT/api/user/900100100/icq
```

Expected: `204` from the PUT; the follow-up GET reflects `"nickname":"aimctltest"`, `"gender":1`, `"notes":"verification test"`, `"web_aware":true`.

- [ ] **Step 5: Confirm the "not an ICQ account" error path**

```bash
curl -s -i http://localhost:PORT/api/user/stratman80/icq
```

(Replace `stratman80` with any known AIM, non-ICQ test account.) Expected: `400` with a JSON `{"message": "..."}` body — confirms `getICQProfile` against an AIM account surfaces a clean error rather than a crash, exercising the error path even though the UI's own `is_icq` gating means this shouldn't normally be reachable by clicking around.

- [ ] **Step 6: Clean up the throwaway account**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:PORT/api/user \
  -H "Content-Type: application/json" -d '{"screen_name":"900100100"}'
```

Expected: `204`.

- [ ] **Step 7: Check the dev server log for errors**

```bash
grep -i error /tmp/aimctl-dev.log
```

Expected: no matches from the requests made in this task (pre-existing unrelated lines, if any, are fine).
