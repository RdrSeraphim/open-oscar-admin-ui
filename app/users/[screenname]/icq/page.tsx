"use client";

import { use, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/Button";
import { getICQProfile } from "@/app/lib/api-client";
import { useApiResource } from "@/app/lib/use-api-resource";
import { IcqProfileForm } from "./_components/IcqProfileForm";

export default function IcqProfilePage({
  params,
}: {
  params: Promise<{ screenname: string }>;
}) {
  const { screenname } = use(params);

  const fetchProfile = useCallback(() => getICQProfile(screenname), [screenname]);
  const { data: profile, loading, error } = useApiResource(fetchProfile);

  return (
    <div>
      <PageHeader
        title={`${screenname} — ICQ Profile`}
        actions={
          <Link href={`/users/${encodeURIComponent(screenname)}`}>
            <Button variant="secondary">Back to user</Button>
          </Link>
        }
      />

      {loading && <p className="text-sm text-foreground/70">Loading ICQ profile…</p>}
      {error && <p className="text-sm text-aim-danger">{error}</p>}

      {profile && <IcqProfileForm screenName={screenname} profile={profile} />}
    </div>
  );
}
