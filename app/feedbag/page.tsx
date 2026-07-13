"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";

export default function FeedbagLandingPage() {
  const [screenName, setScreenName] = useState("");
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = screenName.trim();
    if (!trimmed) return;
    router.push(`/feedbag/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div>
      <PageHeader title="Buddy Lists" />
      <div className="rounded-md border border-border bg-surface p-4">
        <p className="mb-3 text-sm text-foreground/70">
          Enter a screen name to view and edit its buddy list and linked accounts.
        </p>
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Screen name
            <input
              required
              autoFocus
              value={screenName}
              onChange={(e) => setScreenName(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <Button type="submit" variant="primary">
            View
          </Button>
        </form>
      </div>
    </div>
  );
}
