# Directory (keyword categories + keywords)

## Context

`/directory` is currently a "coming soon" placeholder. The underlying API (`docs/api.yml`) manages a two-level keyword directory used for the buddy directory: categories, each containing keywords. Unlike Buddy Lists' feedbag, this is a global resource — not scoped to a user — so there's no per-item dynamic route, just one page.

`GET /directory/category` returns only `{id, name}` per category; keywords are a separate per-category fetch (`GET /directory/category/{id}/keyword`). With enough categories, eagerly fetching every category's keywords on page load would mean N+1 requests up front for data most of which won't be looked at.

## Scope

- Categories: list, create, delete. Keywords: list (per category), create, delete.
- Deletion of either a category or a keyword can fail with `409` if it's "in use" (referenced elsewhere) — the UI doesn't try to predict or block this client-side; it just surfaces the 409's error message as a toast, same as every other delete flow in this app.
- Keywords load lazily: a category card starts collapsed; expanding it is what triggers the fetch for that category's keywords, not page load. Re-collapsing and re-expanding refetches fresh.

## Route

`app/directory/page.tsx` (replaces the current placeholder), a client component with a single top-level `useApiResource(listCategories)` call:

- Header: "Add category" button opens a `Dialog` for the category name (`createCategory` → `POST /directory/category` → refresh).
- Each category renders as a `CategoryCard`: name + expand toggle + a Delete button (→ `ConfirmDialog` → `deleteCategory` → `DELETE /directory/category/{id}` → refresh the category list).
- Expanding a card conditionally mounts a `CategoryKeywords` child component scoped to that category's id. `CategoryKeywords` gets lazy-loading "for free" by reusing `useApiResource` as-is: the fetch happens because the component mounts on expand, not through any new lazy-fetch mechanism. It shows the keyword list with a Remove button per keyword (→ `ConfirmDialog` → `deleteKeyword` → `DELETE /directory/keyword/{id}`) and an inline "add keyword" field at the bottom (→ `createKeyword` → `POST /directory/keyword` with `{category_id, name}`) — this mirrors `GroupCard`'s inline-add-buddy pattern from the Buddy Lists feature closely.

## Shared lib additions

`app/lib/types.ts`:
```ts
export interface Category {
  id: number;
  name: string;
}
export interface Keyword {
  id: number;
  name: string;
}
```

`app/lib/api-client.ts` — same conventions as existing functions:
- `listCategories(): Promise<Category[]>` → `GET /directory/category`
- `createCategory(name: string): Promise<Category>` → `POST /directory/category`
- `deleteCategory(id: number): Promise<void>` → `DELETE /directory/category/{id}`
- `listKeywords(categoryId: number): Promise<Keyword[]>` → `GET /directory/category/{categoryId}/keyword`
- `createKeyword(categoryId: number, name: string): Promise<Keyword>` → `POST /directory/keyword`
- `deleteKeyword(id: number): Promise<void>` → `DELETE /directory/keyword/{id}`

## Components (new)

`app/directory/_components/`:
- `AddCategoryDialog.tsx` — category-name dialog, mirrors `AddGroupDialog.tsx`'s structure.
- `CategoryCard.tsx` — one category's header row (name, expand toggle, delete), conditionally rendering `CategoryKeywords` when expanded.
- `CategoryKeywords.tsx` — lazy-fetches and renders one category's keywords, with remove + inline add, mirroring `GroupCard.tsx`.

All reuse existing primitives (`Dialog`, `ConfirmDialog`, `Button`, `PageHeader`, `useToast`, `useApiResource`) — no new UI primitives.

## Verification

- `npm run lint` and `npx tsc --noEmit` pass.
- Against the live open-oscar-server: create a throwaway category, expand it to confirm the empty-keywords state, add a keyword, confirm it appears, remove it, delete the category, confirm cleanup. Same throwaway-and-cleanup approach as prior verification passes. If the live test server doesn't implement some of these endpoints, confirm the UI degrades to a clear error state rather than crashing, and report the gap rather than treating it as a code defect.
