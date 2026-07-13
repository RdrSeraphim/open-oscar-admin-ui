# Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin manage the keyword directory (categories containing keywords) at `/directory` (replacing the current "coming soon" placeholder) — list/create/delete categories, and lazily view/add/remove each category's keywords on expand.

**Architecture:** Same conventions as every other section. `app/lib/api-client.ts` gets thin wrapper functions. `app/directory/page.tsx` owns a single top-level `useApiResource(listCategories)` call. Each category renders as a `CategoryCard` that starts collapsed; expanding it conditionally mounts a `CategoryKeywords` child, which gets lazy-loading "for free" by calling `useApiResource` itself — the fetch happens because the component mounts on expand, not through any new lazy-fetch mechanism.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4. No test runner configured — verification is `npx tsc --noEmit` + `npm run lint` per task, plus a final live-server walkthrough.

## Global Constraints

- Categories: list, create, delete. Keywords (per category): list, create, delete. No update/rename endpoints exist for either — don't build any.
- A `409` on deleting a category or keyword ("currently in use") is not predicted or blocked client-side — it's just surfaced as an error toast, same as every other delete flow in this app.
- Keywords load lazily on expand, not on page load — see Architecture above.
- Reuse existing primitives (`Dialog`, `ConfirmDialog`, `Button`, `PageHeader`, `useToast`, `useApiResource`) — no new UI primitives.
- Keywords are identified by a numeric `id` for the delete call (unlike Buddy Lists' buddies, which use screen name as both the identifier and the API path segment) — `CategoryKeywords`'s remove-confirmation state therefore holds `{id, name}`, not just a name string. This is a deliberate, necessary deviation from `GroupCard.tsx`'s pattern, not an inconsistency to "fix."
- All new client components/pages need `"use client"` at the top.

---

### Task 1: Extend shared lib — types and api-client functions

**Files:**
- Modify: `app/lib/types.ts` (append at end of file)
- Modify: `app/lib/api-client.ts`

**Interfaces:**
- Produces: `Category { id: number; name: string }`, `Keyword { id: number; name: string }` (types)
- Produces: `listCategories(): Promise<Category[]>`, `createCategory(name: string): Promise<Category>`, `deleteCategory(id: number): Promise<void>`, `listKeywords(categoryId: number): Promise<Keyword[]>`, `createKeyword(categoryId: number, name: string): Promise<Keyword>`, `deleteKeyword(id: number): Promise<void>` (functions, consumed by Task 2)

- [ ] **Step 1: Append the new types**

Add to the end of `app/lib/types.ts`:

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

- [ ] **Step 2: Update the import line in `app/lib/api-client.ts`**

Current:

```ts
import type {
  Account,
  BuddyGroup,
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

- [ ] **Step 3: Append the new api-client functions**

Add to the end of `app/lib/api-client.ts` (after the existing `sendInstantMessage` function):

```ts
export function listCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/directory/category");
}

export function createCategory(name: string): Promise<Category> {
  return apiFetch<Category>("/directory/category", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function deleteCategory(id: number): Promise<void> {
  return apiFetch(`/directory/category/${id}`, {
    method: "DELETE",
  });
}

export function listKeywords(categoryId: number): Promise<Keyword[]> {
  return apiFetch<Keyword[]>(`/directory/category/${categoryId}/keyword`);
}

export function createKeyword(categoryId: number, name: string): Promise<Keyword> {
  return apiFetch<Keyword>("/directory/keyword", {
    method: "POST",
    body: JSON.stringify({ category_id: categoryId, name }),
  });
}

export function deleteKeyword(id: number): Promise<void> {
  return apiFetch(`/directory/keyword/${id}`, {
    method: "DELETE",
  });
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 5: Commit**

```bash
git add app/lib/types.ts app/lib/api-client.ts
git commit -m "Add directory (category/keyword) types + api-client functions"
```

---

### Task 2: Directory components — `AddCategoryDialog`, `CategoryKeywords`, `CategoryCard`

**Files:**
- Create: `app/directory/_components/AddCategoryDialog.tsx`
- Create: `app/directory/_components/CategoryKeywords.tsx`
- Create: `app/directory/_components/CategoryCard.tsx`

**Interfaces:**
- Consumes: `createCategory`, `listKeywords`, `createKeyword`, `deleteKeyword` from Task 1; `Category` type from Task 1; `Dialog`, `ConfirmDialog`, `Button` from `app/components/ui/`; `useToast` from `app/components/ui/ToastProvider.tsx`; `useApiResource` from `app/lib/use-api-resource.ts`
- Produces: `AddCategoryDialog({ open, onClose, onAdded })`, `CategoryKeywords({ categoryId: number })`, `CategoryCard({ category: Category, onDelete: (category: Category) => void })` — the latter two consumed by Task 3's `page.tsx` (`CategoryCard` internally renders `CategoryKeywords` when expanded — Task 3 only ever touches `CategoryCard` directly).

- [ ] **Step 1: Create `AddCategoryDialog.tsx`**

```tsx
"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Dialog } from "@/app/components/ui/Dialog";
import { createCategory } from "@/app/lib/api-client";
import { useToast } from "@/app/components/ui/ToastProvider";

export function AddCategoryDialog({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  function reset() {
    setName("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await createCategory(name);
      showToast(`Added category "${name}"`);
      reset();
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category");
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
      title="Add category"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Category name
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        {error && <p className="text-sm text-aim-danger">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Adding…" : "Add"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create `CategoryKeywords.tsx`**

Self-fetches its category's keywords via `useApiResource` — this is what makes loading lazy: the fetch only happens once this component mounts, which only happens when `CategoryCard` (Task 2 Step 3) renders it inside an `expanded` check.

```tsx
"use client";

import { FormEvent, useCallback, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/ToastProvider";
import { createKeyword, deleteKeyword, listKeywords } from "@/app/lib/api-client";
import { useApiResource } from "@/app/lib/use-api-resource";

export function CategoryKeywords({ categoryId }: { categoryId: number }) {
  const fetchKeywords = useCallback(() => listKeywords(categoryId), [categoryId]);
  const { data: keywords, loading, error, refresh } = useApiResource(fetchKeywords);

  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ id: number; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const { showToast } = useToast();

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    try {
      await createKeyword(categoryId, name);
      showToast(`Added keyword "${name}"`);
      setName("");
      refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add keyword");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await deleteKeyword(removeTarget.id);
      showToast(`Removed keyword "${removeTarget.name}"`);
      setRemoveTarget(null);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to remove keyword", "error");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="border-t border-border px-4 py-3">
      {loading && <p className="text-sm text-foreground/70">Loading keywords…</p>}
      {error && <p className="text-sm text-aim-danger">{error}</p>}

      {keywords && keywords.length === 0 && (
        <p className="text-sm text-foreground/50">No keywords in this category.</p>
      )}

      {keywords && keywords.length > 0 && (
        <ul className="mb-3 flex flex-col gap-1">
          {keywords.map((keyword) => (
            <li
              key={keyword.id}
              className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-border/20"
            >
              <span>{keyword.name}</span>
              <Button
                variant="danger"
                onClick={() => setRemoveTarget({ id: keyword.id, name: keyword.name })}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs">
          Add keyword
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <Button type="submit" variant="secondary" disabled={adding}>
          {adding ? "Adding…" : "Add"}
        </Button>
      </form>
      {addError && <p className="mt-1 text-sm text-aim-danger">{addError}</p>}

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove keyword"
        description={`Remove keyword "${removeTarget?.name}"?`}
        confirmLabel="Remove"
        danger
        pending={removing}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create `CategoryCard.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import type { Category } from "@/app/lib/types";
import { CategoryKeywords } from "./CategoryKeywords";

export function CategoryCard({
  category,
  onDelete,
}: {
  category: Category;
  onDelete: (category: Category) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border border-border bg-surface">
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-sm font-semibold">
          <span className="mr-2 text-foreground/50">{expanded ? "▾" : "▸"}</span>
          {category.name}
        </span>
        <Button
          variant="danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(category);
          }}
        >
          Delete
        </Button>
      </div>
      {expanded && <CategoryKeywords categoryId={category.id} />}
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 5: Commit**

```bash
git add app/directory/_components/
git commit -m "Add directory components: AddCategoryDialog, CategoryKeywords, CategoryCard"
```

---

### Task 3: Replace `/directory` placeholder with the real page

**Files:**
- Modify: `app/directory/page.tsx` (full rewrite — currently a `ComingSoon` placeholder)

**Interfaces:**
- Consumes: `listCategories`, `deleteCategory` from Task 1; `AddCategoryDialog`, `CategoryCard` from Task 2; `PageHeader`, `Button`, `ConfirmDialog` from `app/components/ui/`; `useToast` from `app/components/ui/ToastProvider.tsx`; `useApiResource` from `app/lib/use-api-resource.ts`; `Category` type from `app/lib/types.ts`.
- Produces: nothing consumed by later tasks — this is a leaf page.

- [ ] **Step 1: Replace the file contents**

Current `app/directory/page.tsx`:

```tsx
import { ComingSoon } from "@/app/components/ui/ComingSoon";

export default function DirectoryPage() {
  return (
    <ComingSoon
      title="Directory"
      description="Manage keyword categories and keywords used in the buddy directory. See docs/api.yml (/directory/*) for the underlying API."
    />
  );
}
```

Replace it entirely with:

```tsx
"use client";

import { useState } from "react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/ToastProvider";
import { deleteCategory, listCategories } from "@/app/lib/api-client";
import { useApiResource } from "@/app/lib/use-api-resource";
import type { Category } from "@/app/lib/types";
import { AddCategoryDialog } from "./_components/AddCategoryDialog";
import { CategoryCard } from "./_components/CategoryCard";

export default function DirectoryPage() {
  const { data: categories, loading, error, refresh } = useApiResource(listCategories);

  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCategory(deleteTarget.id);
      showToast(`Deleted category "${deleteTarget.name}"`);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete category", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Directory"
        actions={
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            Add category
          </Button>
        }
      />

      {loading && <p className="text-sm text-foreground/70">Loading categories…</p>}
      {error && <p className="text-sm text-aim-danger">{error}</p>}

      {categories && categories.length === 0 && !loading && !error && (
        <p className="text-sm text-foreground/50">No categories yet. Add one to get started.</p>
      )}

      {categories && categories.length > 0 && (
        <div className="flex flex-col gap-3">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      <AddCategoryDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={refresh}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete category"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
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

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 3: Commit**

```bash
git add app/directory/page.tsx
git commit -m "Replace Directory placeholder with category/keyword management"
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

- [ ] **Step 2: Exercise the full category + keyword lifecycle with throwaway data**

```bash
curl -s -X POST http://localhost:PORT/api/directory/category \
  -H "Content-Type: application/json" -d '{"name":"aimctlverifycat"}'
```

Expected: `201` with a JSON body containing an `id`. Note that `id` for the next steps.

```bash
curl -s http://localhost:PORT/api/directory/category
curl -s http://localhost:PORT/api/directory/category/CATEGORY_ID/keyword
```

Expected: the new category present in the first list; an empty array from the second (confirms the empty-keywords state renders correctly, matching what `CategoryKeywords` will show on expand).

```bash
curl -s -X POST http://localhost:PORT/api/directory/keyword \
  -H "Content-Type: application/json" -d '{"category_id":CATEGORY_ID,"name":"aimctlverifykw"}'
curl -s http://localhost:PORT/api/directory/category/CATEGORY_ID/keyword
```

Expected: `201` with an `id`; the new keyword present in the follow-up GET.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:PORT/api/directory/keyword/KEYWORD_ID
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:PORT/api/directory/category/CATEGORY_ID
```

Expected: `204` from both deletes.

- [ ] **Step 3: Check the dev server log for errors**

```bash
grep -i error /tmp/aimctl-dev.log
```

Expected: no matches from the requests made in this task (pre-existing unrelated lines, if any, are fine). If any endpoint in Step 2 isn't implemented on the live test server (as happened previously with Buddy Lists' linked-account endpoints), treat that as a test-environment finding to report, not a code defect.
