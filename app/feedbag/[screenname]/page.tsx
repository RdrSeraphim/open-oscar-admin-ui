"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { getFeedbag } from "@/app/lib/api-client";
import { useApiResource } from "@/app/lib/use-api-resource";
import { AddGroupDialog } from "./_components/AddGroupDialog";
import { GroupCard } from "./_components/GroupCard";
import { LinkedAccountsSection } from "./_components/LinkedAccountsSection";

export default function FeedbagPage({
  params,
}: {
  params: Promise<{ screenname: string }>;
}) {
  const { screenname } = use(params);

  const fetchGroups = useCallback(() => getFeedbag(screenname), [screenname]);
  const { data: groups, loading, error, refresh } = useApiResource(fetchGroups);

  const [addGroupOpen, setAddGroupOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title={`${screenname}'s buddy list`}
        actions={
          <Link href={`/users/${encodeURIComponent(screenname)}`}>
            <Button variant="secondary">View user</Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Buddy List</h2>
            <Button variant="primary" onClick={() => setAddGroupOpen(true)}>
              Add group
            </Button>
          </div>

          {loading && <p className="text-sm text-foreground/70">Loading buddy list…</p>}
          {error && <p className="text-sm text-aim-danger">{error}</p>}

          {groups && groups.length === 0 && !loading && !error && (
            <p className="text-sm text-foreground/50">
              No groups yet. Add a group to get started.
            </p>
          )}

          {groups && groups.length > 0 && (
            <div className="flex flex-col gap-3">
              {groups.map((group) => (
                <GroupCard
                  key={group.group_id}
                  screenName={screenname}
                  group={group}
                  onChanged={refresh}
                />
              ))}
            </div>
          )}
        </div>

        <LinkedAccountsSection screenName={screenname} />
      </div>

      <AddGroupDialog
        open={addGroupOpen}
        screenName={screenname}
        onClose={() => setAddGroupOpen(false)}
        onAdded={refresh}
      />
    </div>
  );
}
