"use client";

import { useState } from "react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/app/components/ui/Table";
import { useToast } from "@/app/components/ui/ToastProvider";
import { deleteApiKey, listApiKeys } from "@/app/lib/api-client";
import { useApiResource } from "@/app/lib/use-api-resource";
import type { CreatedWebAPIKey, WebAPIKey } from "@/app/lib/types";
import { CreateApiKeyDialog } from "./_components/CreateApiKeyDialog";
import { EditApiKeyDialog } from "./_components/EditApiKeyDialog";
import { KeyRevealDialog } from "./_components/KeyRevealDialog";

export default function ApiKeysPage() {
  const { data: keys, loading, error, refresh } = useApiResource(listApiKeys);

  const [createOpen, setCreateOpen] = useState(false);
  const [revealedKey, setRevealedKey] = useState<CreatedWebAPIKey | null>(null);
  const [editTarget, setEditTarget] = useState<WebAPIKey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WebAPIKey | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  function handleCreated(key: CreatedWebAPIKey) {
    refresh();
    setRevealedKey(key);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteApiKey(deleteTarget.dev_id);
      showToast(`Deleted key "${deleteTarget.app_name}"`);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete key", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Web API Keys"
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            Create key
          </Button>
        }
      />

      {loading && <p className="text-sm text-foreground/70">Loading keys…</p>}
      {error && <p className="text-sm text-aim-danger">{error}</p>}

      {keys && (
        <Table>
          <Thead>
            <Tr>
              <Th>App name</Th>
              <Th>Dev ID</Th>
              <Th>Status</Th>
              <Th>Rate limit</Th>
              <Th>Created</Th>
              <Th>Last used</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {keys.length === 0 && (
              <Tr>
                <Td colSpan={7} className="py-6 text-center text-foreground/60">
                  No API keys yet.
                </Td>
              </Tr>
            )}
            {keys.map((key) => (
              <Tr key={key.dev_id}>
                <Td className="font-medium">{key.app_name}</Td>
                <Td className="font-mono text-xs">{key.dev_id}</Td>
                <Td>
                  <Badge tone={key.is_active ? "green" : "neutral"}>
                    {key.is_active ? "active" : "inactive"}
                  </Badge>
                </Td>
                <Td>{key.rate_limit}/min</Td>
                <Td>{new Date(key.created_at).toLocaleString()}</Td>
                <Td>{key.last_used ? new Date(key.last_used).toLocaleString() : "never"}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setEditTarget(key)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => setDeleteTarget(key)}>
                      Delete
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <CreateApiKeyDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      <KeyRevealDialog devKey={revealedKey?.dev_key ?? null} onClose={() => setRevealedKey(null)} />

      {editTarget && (
        <EditApiKeyDialog
          key={editTarget.dev_id}
          apiKey={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={refresh}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete API key"
        description={`Are you sure you want to delete "${deleteTarget?.app_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        pending={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
