# BART Assets

## Context

`/bart` is currently a "coming soon" placeholder. BART (Buddy ART) is open-oscar-server's content-addressed asset store — buddy icons, sounds, chrome/skin XML, cert chains, etc. — keyed by a hex hash plus a numeric type. Unlike every other section built so far, `GET /bart` has no "list everything" mode: it requires a `type` query parameter, and there are 19 known types (`docs/api.yml`'s `BARTType` enum). Browsing therefore has to be type-first: pick a type, see that type's assets.

Uploading also differs from every other write flow in this app: the request body is raw binary (`application/octet-stream`), not JSON, and the hash isn't server-generated — the caller supplies it in the URL path. In the real AIM/ICQ protocol this hash is the MD5 of the asset's bytes (that's how clients verify/cache assets), but the API itself doesn't enforce or compute this — it just stores whatever hex string is given against whatever bytes are uploaded.

## Scope

- Browse: a type dropdown (all 19 known types, human-labeled, defaulting to `buddy_icon`) drives `GET /bart?type=N`. Changing the type re-fetches.
- Icon types (`buddy_icon_small`, `buddy_icon`, `buddy_icon_big`) render each asset as an inline image thumbnail (via the existing binary-passthrough proxy trick already used for user buddy icons). Every other type renders as a hash + a Download link (`<a href="/api/bart/{hash}" download>`) — no inline preview, since sounds/XML/certs aren't meaningfully previewable as `<img>`.
- Upload: a dialog with a file picker. The hash field auto-fills with the MD5 of the selected file's bytes, computed client-side, but stays editable — an admin can override it (e.g., to intentionally upload under a different hash for testing). Uploads to whichever type is currently selected in the page's dropdown; the dialog itself has no separate type selector.
- Delete: per-asset Delete → `ConfirmDialog` → `DELETE /bart/{hash}`.
- No rename/update — the API has none.

## New dependency: `js-md5`

The browser's native Web Crypto API only implements the SHA family, not MD5, and the real-world hash convention here is MD5. Rather than hand-roll an MD5 implementation, add `js-md5` (zero runtime dependencies, MIT, ~51KB unpacked, actively maintained) plus `@types/js-md5` for TypeScript types. Used only in the upload dialog: `md5(await file.arrayBuffer())` → lowercase hex string.

## Route

`app/bart/page.tsx` (replaces the current placeholder), a client component:

- `selectedType` state (number, defaults to `1` / `buddy_icon`), driving a native `<select>` populated from `BART_TYPES`.
- `useApiResource(() => listBartAssets(selectedType))` (fetcher re-created via `useCallback` keyed on `selectedType`, same pattern as every other per-parameter fetch in this app) for the asset list.
- "Upload asset" button opens `UploadAssetDialog`, passed the current `selectedType`.
- Renders `AssetList`, passing the assets, whether the current type is an image type (`isImageType(selectedType)`), and a delete handler.

## Shared lib additions

`app/lib/bart-types.ts` (new file — this constant data doesn't belong in `types.ts`, which is TS interfaces only):
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

`app/lib/types.ts`:
```ts
export interface BartAsset {
  hash: string;
  type: number;
}
```

`app/lib/api-client.ts`:
- `bartAssetUrl(hash: string): string` → `/api/bart/{hash}` (mirrors `iconUrl`, used for both `<img>` src and the Download link's `href`).
- `listBartAssets(type: number): Promise<BartAsset[]>` → `GET /bart?type={type}`.
- `uploadBartAsset(hash: string, type: number, data: Blob): Promise<BartAsset>` → `POST /bart/{hash}?type={type}` with the raw file as the body and an explicit `Content-Type: application/octet-stream` header (overriding `apiFetch`'s default JSON content-type — `apiFetch` already supports this since caller-supplied headers are spread after the default, so this needs no change to `apiFetch` itself).
- `deleteBartAsset(hash: string): Promise<void>` → `DELETE /bart/{hash}`.

## Components (new)

`app/bart/_components/`:
- `UploadAssetDialog.tsx` — file input + auto-computed/editable hash field + upload button. On file selection, computes and fills the hash via `js-md5`.
- `AssetList.tsx` — renders the current type's assets: image thumbnail or hash+Download link depending on `isImageType`, plus a per-asset Delete button wired to a `ConfirmDialog`.

Reuses existing primitives (`Dialog`, `ConfirmDialog`, `Button`, `PageHeader`, `useToast`, `useApiResource`) — no new UI primitives beyond these two feature components.

## Verification

- `npm run lint` and `npx tsc --noEmit` pass.
- Against the live open-oscar-server: upload a small throwaway image as `buddy_icon`, confirm it appears with a working thumbnail, switch type and confirm the list changes, delete the throwaway asset. If the live test server doesn't implement some of these endpoints, confirm the UI degrades to a clear error state rather than crashing, and report the gap rather than treating it as a code defect.
