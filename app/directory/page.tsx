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
