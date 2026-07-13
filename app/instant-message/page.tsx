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
