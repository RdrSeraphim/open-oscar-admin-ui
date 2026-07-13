"use client";

import { useState } from "react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/ToastProvider";
import {
  deletePublicRooms,
  listPrivateRooms,
  listPublicRooms,
} from "@/app/lib/api-client";
import { useApiResource } from "@/app/lib/use-api-resource";
import { CreateRoomDialog } from "./_components/CreateRoomDialog";
import { RoomsTable } from "./_components/RoomsTable";

export default function ChatRoomsPage() {
  const {
    data: publicRooms,
    loading: publicLoading,
    error: publicError,
    refresh: refreshPublic,
  } = useApiResource(listPublicRooms);

  const {
    data: privateRooms,
    loading: privateLoading,
    error: privateError,
  } = useApiResource(listPrivateRooms);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePublicRooms([deleteTarget]);
      showToast(`Deleted room "${deleteTarget}"`);
      setDeleteTarget(null);
      refreshPublic();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete room", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Chat Rooms" />

      <div className="flex flex-col gap-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Public Rooms</h2>
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              Create room
            </Button>
          </div>

          {publicLoading && <p className="text-sm text-foreground/70">Loading public rooms…</p>}
          {publicError && <p className="text-sm text-aim-danger">{publicError}</p>}

          {publicRooms && (
            <RoomsTable
              rooms={publicRooms}
              showCreator={false}
              onDelete={setDeleteTarget}
              emptyMessage="No public rooms."
            />
          )}
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold">Private Rooms</h2>

          {privateLoading && <p className="text-sm text-foreground/70">Loading private rooms…</p>}
          {privateError && <p className="text-sm text-aim-danger">{privateError}</p>}

          {privateRooms && (
            <RoomsTable
              rooms={privateRooms}
              showCreator
              emptyMessage="No private rooms."
            />
          )}
        </div>
      </div>

      <CreateRoomDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refreshPublic}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete room"
        description={`Are you sure you want to delete "${deleteTarget}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        pending={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
