# Instant Message Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin send a test instant message (From, To, Text) at `/instant-message` (replacing the current "coming soon" placeholder).

**Architecture:** The smallest section in this app — one api-client function, one page with local form state. No list to fetch, so no `useApiResource`, no dialogs, no new components.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4. No test runner configured — verification is `npx tsc --noEmit` + `npm run lint` per task, plus a final live-server walkthrough.

## Global Constraints

- All three fields (From, To, Text) are required in the UI form, even though the API schema doesn't mark them `required` — an empty send isn't meaningful.
- A successful `200` means "accepted," not "delivered" (the API sends fire-and-forget, no error if sender/recipient don't exist or are offline) — the success toast should say "Sent," not imply confirmed delivery.
- On success: full form reset (all three fields clear). On error: inline error message above the submit button, matching `app/users/_components/CreateUserDialog.tsx`'s pattern.
- No new components, no new types — this is a single page file.
- All new client pages need `"use client"` at the top.

---

### Task 1: Add `sendInstantMessage` to the shared api-client

**Files:**
- Modify: `app/lib/api-client.ts` (append at end of file)

**Interfaces:**
- Produces: `sendInstantMessage(from: string, to: string, text: string): Promise<void>` — consumed by Task 2.

- [ ] **Step 1: Append the function**

Add to the end of `app/lib/api-client.ts` (after the existing `listPrivateRooms` function):

```ts
export function sendInstantMessage(
  from: string,
  to: string,
  text: string,
): Promise<void> {
  return apiFetch("/instant-message", {
    method: "POST",
    body: JSON.stringify({ from, to, text }),
  });
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 3: Commit**

```bash
git add app/lib/api-client.ts
git commit -m "Add sendInstantMessage api-client function"
```

---

### Task 2: Replace `/instant-message` placeholder with the real form

**Files:**
- Modify: `app/instant-message/page.tsx` (full rewrite — currently a `ComingSoon` placeholder)

**Interfaces:**
- Consumes: `sendInstantMessage` from Task 1; `PageHeader`, `Button` from `app/components/ui/`; `useToast` from `app/components/ui/ToastProvider.tsx`.
- Produces: nothing consumed by later tasks — this is a leaf page.

- [ ] **Step 1: Replace the file contents**

Current `app/instant-message/page.tsx`:

```tsx
import { ComingSoon } from "@/app/components/ui/ComingSoon";

export default function InstantMessagePage() {
  return (
    <ComingSoon
      title="Instant Message"
      description="Send an instant message from one user to another for testing. See docs/api.yml (/instant-message) for the underlying API."
    />
  );
}
```

Replace it entirely with:

```tsx
"use client";

import { FormEvent, useState } from "react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { useToast } from "@/app/components/ui/ToastProvider";
import { sendInstantMessage } from "@/app/lib/api-client";

export default function InstantMessagePage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await sendInstantMessage(from, to, text);
      showToast(`Sent message to "${to}"`);
      setFrom("");
      setTo("");
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <PageHeader title="Instant Message" />
      <div className="max-w-lg rounded-md border border-border bg-surface p-4">
        <p className="mb-3 text-sm text-foreground/70">
          Send a test instant message. The API accepts a send even if the sender or
          recipient doesn&apos;t exist or is offline — a successful send means
          accepted, not delivered.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            From
            <input
              required
              autoFocus
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            To
            <input
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Text
            <textarea
              required
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </label>
          {error && <p className="text-sm text-aim-danger">{error}</p>}
          <div className="mt-2 flex justify-end">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Sending…" : "Send"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit with no output.

- [ ] **Step 3: Commit**

```bash
git add app/instant-message/page.tsx
git commit -m "Replace Instant Message placeholder with send form"
```

---

### Task 3: Live-server verification pass

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Confirm the dev server is up against a real open-oscar-server**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:PORT/
```

(Use whatever port `npm run dev` actually bound.)

- [ ] **Step 2: Send a test message through the proxy**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:PORT/api/instant-message \
  -H "Content-Type: application/json" -d '{"from":"aimctlverifysender","to":"aimctlverifyrecipient","text":"hello from aimctl verification"}'
```

Expected: `200`. Per the API's documented behavior, this should succeed even though neither screen name exists.

- [ ] **Step 3: Confirm a malformed request is rejected visibly**

```bash
curl -s -i -X POST http://localhost:PORT/api/instant-message \
  -H "Content-Type: application/json" -d 'not valid json'
```

Expected: `400` (or another 4xx) with a body the app's error handling can surface — confirms the form's error path has something real to display, not just a happy-path check.

- [ ] **Step 4: Check the dev server log for errors**

```bash
grep -i error /tmp/aimctl-dev.log
```

Expected: no matches from the requests made in this task (pre-existing unrelated lines, if any, are fine).
