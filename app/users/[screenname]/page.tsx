"use client";

import { use, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/ToastProvider";
import { deleteUser, getAccount, iconUrl } from "@/app/lib/api-client";
import { useApiResource } from "@/app/lib/use-api-resource";
import { SetPasswordDialog } from "./_components/SetPasswordDialog";
import { SuspendedStatusControl } from "./_components/SuspendedStatusControl";
import { BotToggle } from "./_components/BotToggle";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ screenname: string }>;
}) {
  const { screenname } = use(params);
  const router = useRouter();
  const { showToast } = useToast();

  const fetchAccount = useCallback(() => getAccount(screenname), [screenname]);
  const { data: account, loading, error, refresh } = useApiResource(fetchAccount);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteUser(screenname);
      showToast(`Deleted user "${screenname}"`);
      router.push("/users");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete user", "error");
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={screenname}
        actions={
          <>
            <Link href="/users">
              <Button variant="secondary">Back to users</Button>
            </Link>
            <Link href={`/feedbag/${encodeURIComponent(screenname)}`}>
              <Button variant="secondary">Buddy list</Button>
            </Link>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              Delete user
            </Button>
          </>
        }
      />

      {loading && <p className="text-sm text-foreground/70">Loading account…</p>}
      {error && <p className="text-sm text-aim-danger">{error}</p>}

      {account && (
        <div className="flex flex-col gap-6">
          <div className="flex gap-4 rounded-md border border-border bg-surface p-4">
            {!iconFailed && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={iconUrl(screenname)}
                alt=""
                onError={() => setIconFailed(true)}
                className="h-16 w-16 rounded border border-border object-cover"
              />
            )}
            <div className="flex flex-col gap-1 text-sm">
              <p>
                <span className="text-foreground/60">Screen name:</span>{" "}
                <span className="font-medium">{account.screen_name}</span>
              </p>
              <p>
                <span className="text-foreground/60">Type:</span>{" "}
                <Badge tone={account.is_icq ? "blue" : "gold"}>
                  {account.is_icq ? "ICQ" : "AIM"}
                </Badge>
              </p>
              <p>
                <span className="text-foreground/60">Email:</span>{" "}
                {account.email_address || <em className="text-foreground/40">none</em>}
              </p>
              <p>
                <span className="text-foreground/60">Confirmed:</span>{" "}
                <Badge tone={account.confirmed ? "green" : "neutral"}>
                  {account.confirmed ? "yes" : "no"}
                </Badge>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">Account controls</h2>

            <div className="flex flex-col gap-1">
              <p className="text-xs text-foreground/60">Suspended status</p>
              <SuspendedStatusControl
                key={`${screenname}:${account.suspended_status}`}
                screenName={screenname}
                currentStatus={account.suspended_status}
                onSaved={refresh}
              />
            </div>

            <BotToggle
              screenName={screenname}
              isBot={!!account.is_bot}
              onSaved={refresh}
            />

            <div>
              <Button variant="secondary" onClick={() => setPasswordOpen(true)}>
                Set password
              </Button>
            </div>
          </div>
        </div>
      )}

      <SetPasswordDialog
        open={passwordOpen}
        screenName={screenname}
        onClose={() => setPasswordOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete user"
        description={`Are you sure you want to delete "${screenname}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        pending={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
