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
