# BART Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin browse BART assets by type, see inline thumbnails for icon types, upload a new asset (with an auto-computed MD5 hash), and delete assets, at `/bart` (replacing the current "coming soon" placeholder).

**Architecture:** Same conventions as every other section, with one new wrinkle: `GET /bart` requires a `type` query param (no "list everything" mode), so `app/bart/page.tsx` holds a `selectedType` state driving a `useApiResource` fetch keyed on that type, same pattern as every other per-parameter fetch in this app (`getAccount`, `listKeywords`, etc.). Upload is also new: the request body is raw binary, not JSON, and needs a client-computed MD5 hash — the only place in this app that adds a new npm dependency.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, plus `js-md5` (new). No test runner configured — verification is `npx tsc --noEmit` + `npm run lint` per task, plus a final live-server walkthrough.

## Global Constraints

- No rename/update for BART assets — the API has none.
- Icon types (`buddy_icon_small` = 0, `buddy_icon` = 1, `buddy_icon_big` = 12) render as inline `<img>` thumbnails; every other type renders as a hash + a Download link (`<a href=... download>`).
- The upload dialog has no type selector of its own — it always uploads to whatever type is currently selected on the page.
- The hash field auto-fills with the MD5 of the selected file (computed via `js-md5`) but stays editable.
- **Correction to the design spec:** the spec mentioned adding `@types/js-md5` alongside `js-md5`. That's unnecessary — `js-md5` ships its own bundled `index.d.ts` at its package root (confirmed by inspecting the published package), which TypeScript's `moduleResolution: "bundler"` (already set in this repo's `tsconfig.json`) picks up automatically. Install only `js-md5`; do not add `@types/js-md5`.
- `js-md5`'s type declarations export `md5: Hash`, callable as `md5(message)` where `message` can be a `string | number[] | ArrayBuffer | Uint8Array`, returning a hex string — so `md5(await file.arrayBuffer())` is directly valid, no conversion needed.
- Reuse existing primitives (`Dialog`, `ConfirmDialog`, `Button`, `PageHeader`, `useToast`, `useApiResource`) — no new UI primitives beyond the two feature components below.
- Hash values go through `encodeURIComponent` wherever they appear in a URL path (they're admin-editable free text in the upload dialog, even though the expected shape is hex), matching this app's established convention for string path segments (see `iconUrl`, `addBuddy`, etc.). Numeric values (`type`, `groupId`-style ids) are interpolated directly without encoding, also matching convention.
- All new client components/pages need `"use client"` at the top.

---

### Task 1: Extend shared lib — BART type constants, types, and api-client functions

**Files:**
- Create: `app/lib/bart-types.ts`
- Modify: `app/lib/types.ts` (append at end of file)
- Modify: `app/lib/api-client.ts`

**Interfaces:**
- Produces: `BART_TYPES: { value: number; label: string }[]`, `isImageType(type: number): boolean` (from `bart-types.ts`)
- Produces: `BartAsset { hash: string; type: number }` (type)
- Produces: `bartAssetUrl(hash: string): string`, `listBartAssets(type: number): Promise<BartAsset[]>`, `uploadBartAsset(hash: string, type: number, data: Blob): Promise<BartAsset>`, `deleteBartAsset(hash: string): Promise<void>` (functions, consumed by Task 2 and Task 3)

- [ ] **Step 1: Create `bart-types.ts`**

```ts
export const BART_TYPES: { value: number; label: string }[] = [
  { value: 0, label: "buddy_icon_small" },
  { value: 1, label: "buddy_icon" },
  { value: 2, label: "status_str" },
  { value: 3, label: "arrive_sound" },
  { value: 4, label: "rich_text" },
  { value: 5, label: "superbuddy_icon" },
  { value: 6, label: "radio_station" },
  { value: 12, label: "buddy_icon_big" },
  { value: 13, label: "status_str_tod" },
  { value: 15, label: "current_av_track" },
  { value: 96, label: "depart_sound" },
  { value: 129, label: "im_chrome" },
  { value: 131, label: "im_sound" },
  { value: 136, label: "im_chrome_xml" },
  { value: 137, label: "im_chrome_immers" },
  { value: 1024, label: "emoticon_set" },
  { value: 1026, label: "encr_cert_chain" },
  { value: 1027, label: "sign_cert_chain" },
  { value: 1028, label: "gateway_cert" },
];

const IMAGE_TYPES = new Set([0, 1, 12]);

export function isImageType(type: number): boolean {
  return IMAGE_TYPES.has(type);
}
```

- [ ] **Step 2: Append the `BartAsset` type**

Add to the end of `app/lib/types.ts`:

```ts
export interface BartAsset {
  hash: string;
  type: number;
}
```

- [ ] **Step 3: Update the import line in `app/lib/api-client.ts`**

Current:

```ts
import type {
  Account,
  BuddyGroup,
  Category,
  Keyword,
  LinkedAccountsResponse,
  PrivateRoom,
  PublicRoom,
  SessionsResponse,
  User,
  VersionInfo,
} from "./types";
```

Replace with:

```ts
import type {
  Account,
  BartAsset,
  BuddyGroup,
  Category,
  Keyword,
  LinkedAccountsResponse,
  PrivateRoom,
  PublicRoom,
  SessionsResponse,
  User,
  VersionInfo,
} from "./types";
```

- [ ] **Step 4: Append the new api-client functions**

Add to the end of `app/lib/api-client.ts` (after the existing `deleteKeyword` function):

```ts
export function bartAssetUrl(hash: string): string {
  return `/api/bart/${encodeURIComponent(hash)}`;
}

export function listBartAssets(type: number): Promise<BartAsset[]> {
  return apiFetch<BartAsset[]>(`/bart?type=${type}`);
}

export function uploadBartAsset(
  hash: string,
  type: number,
  data: Blob,
): Promise<BartAsset> {
  return apiFetch<BartAsset>(`/bart/${encodeURIComponent(hash)}?type=${type}`, {
    method: "POST",
    body: data,
    headers: { "Content-Type": "application/octet-stream" },
  });
}

export function deleteBartAsset(hash: string): Promise<void> {
  return apiFetch(`/bart/${encodeURIComponent(hash)}`, {
    method: "DELETE",
  });
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 6: Commit**

```bash
git add app/lib/bart-types.ts app/lib/types.ts app/lib/api-client.ts
git commit -m "Add BART asset types, type constants, and api-client functions"
```

---

### Task 2: Add `js-md5` dependency and BART components — `UploadAssetDialog`, `AssetList`

**Files:**
- Modify: `package.json` (add `js-md5` dependency)
- Create: `app/bart/_components/UploadAssetDialog.tsx`
- Create: `app/bart/_components/AssetList.tsx`

**Interfaces:**
- Consumes: `uploadBartAsset`, `bartAssetUrl`, `deleteBartAsset` from Task 1; `isImageType` from `app/lib/bart-types.ts` (Task 1); `BartAsset` type from Task 1; `Dialog`, `ConfirmDialog`, `Button` from `app/components/ui/`; `useToast` from `app/components/ui/ToastProvider.tsx`; `md5` from the new `js-md5` package.
- Produces: `UploadAssetDialog({ open, type, onClose, onUploaded })`, `AssetList({ assets, onChanged })` — both consumed by Task 3's `page.tsx`.

- [ ] **Step 1: Install `js-md5`**

```bash
npm install js-md5
```

Do NOT also install `@types/js-md5` — see Global Constraints above. Confirm `package.json`'s `dependencies` now includes `"js-md5"` and that no `@types/js-md5` entry was added anywhere.

- [ ] **Step 2: Create `UploadAssetDialog.tsx`**

```tsx
"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { md5 } from "js-md5";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";
import { uploadBartAsset } from "@/app/lib/api-client";
import { useToast } from "@/app/components/ui/ToastProvider";

export function UploadAssetDialog({
  open,
  type,
  onClose,
  onUploaded,
}: {
  open: boolean;
  type: number;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  function reset() {
    setFile(null);
    setHash("");
    setError(null);
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected) {
      const bytes = await selected.arrayBuffer();
      setHash(md5(bytes));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setPending(true);
    setError(null);
    try {
      await uploadBartAsset(hash, type, file);
      showToast(`Uploaded asset "${hash}"`);
      reset();
      onUploaded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload asset");
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
      title="Upload asset"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          File
          <input
            required
            type="file"
            onChange={handleFileChange}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Hash
          <input
            required
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            pattern="[0-9a-fA-F]+"
            className="rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm"
          />
          <span className="text-xs text-foreground/50">
            Auto-filled with the MD5 of the selected file. Edit only if you need a
            different hash.
          </span>
        </label>
        {error && <p className="text-sm text-aim-danger">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={pending || !file}>
            {pending ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create `AssetList.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/ToastProvider";
import { bartAssetUrl, deleteBartAsset } from "@/app/lib/api-client";
import { isImageType } from "@/app/lib/bart-types";
import type { BartAsset } from "@/app/lib/types";

export function AssetList({
  assets,
  onChanged,
}: {
  assets: BartAsset[];
  onChanged: () => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBartAsset(deleteTarget);
      showToast(`Deleted asset "${deleteTarget}"`);
      setDeleteTarget(null);
      onChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete asset", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (assets.length === 0) {
    return <p className="text-sm text-foreground/50">No assets of this type.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {assets.map((asset) => (
        <div
          key={asset.hash}
          className="flex flex-col items-center gap-2 rounded-md border border-border bg-surface p-3"
        >
          {isImageType(asset.type) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bartAssetUrl(asset.hash)}
              alt=""
              className="h-16 w-16 rounded border border-border object-cover"
            />
          ) : (
            <a
              href={bartAssetUrl(asset.hash)}
              download
              className="text-sm text-aim-blue hover:underline dark:text-aim-blue-light"
            >
              Download
            </a>
          )}
          <span
            className="w-full truncate text-center font-mono text-xs text-foreground/60"
            title={asset.hash}
          >
            {asset.hash}
          </span>
          <Button variant="danger" onClick={() => setDeleteTarget(asset.hash)}>
            Delete
          </Button>
        </div>
      ))}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete asset"
        description={`Delete asset "${deleteTarget}"? This cannot be undone.`}
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

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app/bart/_components/
git commit -m "Add js-md5 dependency and BART components: UploadAssetDialog, AssetList"
```

---

### Task 3: Replace `/bart` placeholder with the real page

**Files:**
- Modify: `app/bart/page.tsx` (full rewrite — currently a `ComingSoon` placeholder)

**Interfaces:**
- Consumes: `listBartAssets` from Task 1; `BART_TYPES` from `app/lib/bart-types.ts` (Task 1); `UploadAssetDialog`, `AssetList` from Task 2; `PageHeader`, `Button` from `app/components/ui/`; `useApiResource` from `app/lib/use-api-resource.ts`.
- Produces: nothing consumed by later tasks — this is a leaf page.

- [ ] **Step 1: Replace the file contents**

Current `app/bart/page.tsx`:

```tsx
import { ComingSoon } from "@/app/components/ui/ComingSoon";

export default function BartPage() {
  return (
    <ComingSoon
      title="BART Assets"
      description="Browse, upload, and delete BART assets (buddy icons, sounds, and other buddy art). See docs/api.yml (/bart/*) for the underlying API."
    />
  );
}
```

Replace it entirely with:

```tsx
"use client";

import { useCallback, useState } from "react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { listBartAssets } from "@/app/lib/api-client";
import { useApiResource } from "@/app/lib/use-api-resource";
import { BART_TYPES } from "@/app/lib/bart-types";
import { AssetList } from "./_components/AssetList";
import { UploadAssetDialog } from "./_components/UploadAssetDialog";

export default function BartPage() {
  const [selectedType, setSelectedType] = useState(1);

  const fetchAssets = useCallback(() => listBartAssets(selectedType), [selectedType]);
  const { data: assets, loading, error, refresh } = useApiResource(fetchAssets);

  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="BART Assets"
        actions={
          <Button variant="primary" onClick={() => setUploadOpen(true)}>
            Upload asset
          </Button>
        }
      />

      <div className="mb-4">
        <label className="flex flex-col gap-1 text-sm">
          Type
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(Number(e.target.value))}
            className="w-64 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            {BART_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p className="text-sm text-foreground/70">Loading assets…</p>}
      {error && <p className="text-sm text-aim-danger">{error}</p>}

      {assets && <AssetList assets={assets} onChanged={refresh} />}

      <UploadAssetDialog
        open={uploadOpen}
        type={selectedType}
        onClose={() => setUploadOpen(false)}
        onUploaded={refresh}
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
git add app/bart/page.tsx
git commit -m "Replace BART Assets placeholder with browse/upload/delete UI"
```

---

### Task 4: Live-server verification pass

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Confirm the dev server is up against a real open-oscar-server**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:PORT/
```

(Use whatever port `npm run dev` actually bound.)

- [ ] **Step 2: Create a small throwaway test image and compute its MD5**

```bash
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\x0dIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x03\x01\x01\x00\x18\xdd\x8d\xb0\x00\x00\x00\x00IEND\xaeB`\x82' > /tmp/aimctl-test-icon.png
md5 /tmp/aimctl-test-icon.png 2>/dev/null || md5sum /tmp/aimctl-test-icon.png
```

Note the resulting hex hash for the next steps (call it `HASH`).

- [ ] **Step 3: Upload it as `buddy_icon` (type 1) through the proxy**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:PORT/api/bart/HASH?type=1" \
  -H "Content-Type: application/octet-stream" --data-binary @/tmp/aimctl-test-icon.png
```

Expected: `201`.

- [ ] **Step 4: List type 1 and confirm it appears; fetch the raw asset back**

```bash
curl -s "http://localhost:PORT/api/bart?type=1"
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "http://localhost:PORT/api/bart/HASH"
```

Expected: the new `{hash, type}` entry present in the list; `200` with an image content type from the raw-asset fetch (confirms the `<img>` thumbnail in `AssetList` would actually render).

- [ ] **Step 5: Delete it and confirm cleanup**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE "http://localhost:PORT/api/bart/HASH"
curl -s "http://localhost:PORT/api/bart?type=1"
```

Expected: `200` from the delete; the asset gone from the follow-up list.

- [ ] **Step 6: Clean up the local temp file and check the dev server log for errors**

```bash
rm -f /tmp/aimctl-test-icon.png
grep -i error /tmp/aimctl-dev.log
```

Expected: no error matches from the requests made in this task. If any endpoint in Steps 3-5 isn't implemented on the live test server, treat that as a test-environment finding to report, not a code defect.
