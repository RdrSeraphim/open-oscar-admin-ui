"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Badge";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/app/components/ui/Table";
import { useToast } from "@/app/components/ui/ToastProvider";
import { deleteUser, listUsers } from "@/app/lib/api-client";
import { useApiResource } from "@/app/lib/use-api-resource";
import { CreateUserDialog } from "./_components/CreateUserDialog";

export default function UsersPage() {
  const { data: users, loading, error, refresh } = useApiResource(listUsers);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget);
      showToast(`Deleted user "${deleteTarget}"`);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete user", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            Create user
          </Button>
        }
      />

      {loading && <p className="text-sm text-foreground/70">Loading users…</p>}
      {error && <p className="text-sm text-aim-danger">{error}</p>}

      {users && (
        <Table>
          <Thead>
            <Tr>
              <Th>Screen name</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Bot</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {users.length === 0 && (
              <Tr>
                <Td colSpan={5} className="py-6 text-center text-foreground/60">
                  No users yet.
                </Td>
              </Tr>
            )}
            {users.map((user) => (
              <Tr key={user.id}>
                <Td className="font-medium">
                  <Link
                    href={`/users/${encodeURIComponent(user.screen_name)}`}
                    className="text-aim-blue hover:underline dark:text-aim-blue-light"
                  >
                    {user.screen_name}
                  </Link>
                </Td>
                <Td>
                  <Badge tone={user.is_icq ? "blue" : "gold"}>
                    {user.is_icq ? "ICQ" : "AIM"}
                  </Badge>
                </Td>
                <Td>
                  {user.suspended_status ? (
                    <Badge tone="danger">{user.suspended_status}</Badge>
                  ) : (
                    <Badge tone="green">active</Badge>
                  )}
                </Td>
                <Td>{user.is_bot && <Badge tone="neutral">bot</Badge>}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/users/${encodeURIComponent(user.screen_name)}`}>
                      <Button variant="secondary">View</Button>
                    </Link>
                    <Button
                      variant="danger"
                      onClick={() => setDeleteTarget(user.screen_name)}
                    >
                      Delete
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refresh}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete user"
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
