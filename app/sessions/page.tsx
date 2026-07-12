"use client";

import { useState } from "react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/ToastProvider";
import { killSession, listSessions } from "@/app/lib/api-client";
import { useApiResource } from "@/app/lib/use-api-resource";
import { SessionsTable } from "./_components/SessionsTable";

export default function SessionsPage() {
  const { data, loading, error, refresh } = useApiResource(listSessions);
  const [kickTarget, setKickTarget] = useState<string | null>(null);
  const [kicking, setKicking] = useState(false);
  const { showToast } = useToast();

  async function handleKick() {
    if (!kickTarget) return;
    setKicking(true);
    try {
      await killSession(kickTarget);
      showToast(`Disconnected "${kickTarget}"`);
      setKickTarget(null);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to disconnect session", "error");
    } finally {
      setKicking(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={`Sessions${data ? ` (${data.count})` : ""}`}
        actions={
          <Button variant="secondary" onClick={refresh} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {loading && !data && <p className="text-sm text-foreground/70">Loading sessions…</p>}
      {error && <p className="text-sm text-aim-danger">{error}</p>}

      {data && <SessionsTable sessions={data.sessions} onKick={setKickTarget} />}

      <ConfirmDialog
        open={kickTarget !== null}
        title="Disconnect session"
        description={`Disconnect all active sessions for "${kickTarget}"?`}
        confirmLabel="Disconnect"
        danger
        pending={kicking}
        onCancel={() => setKickTarget(null)}
        onConfirm={handleKick}
      />
    </div>
  );
}
