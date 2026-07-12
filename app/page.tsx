"use client";

import Link from "next/link";
import { getVersion } from "./lib/api-client";
import { useApiResource } from "./lib/use-api-resource";
import { PageHeader } from "./components/ui/PageHeader";

const SECTIONS = [
  { href: "/users", label: "Users", description: "Accounts, passwords, suspension" },
  { href: "/sessions", label: "Sessions", description: "Who's online right now" },
  { href: "/feedbag", label: "Buddy Lists", description: "Feedbag groups & buddies" },
  { href: "/chat-rooms", label: "Chat Rooms", description: "Public & private rooms" },
  { href: "/instant-message", label: "Instant Message", description: "Send an IM as any user" },
  { href: "/directory", label: "Directory", description: "Keyword categories" },
  { href: "/bart", label: "BART Assets", description: "Buddy icons & sounds" },
  { href: "/api-keys", label: "Web API Keys", description: "Web AIM API access" },
];

export default function Home() {
  const { data, loading, error } = useApiResource(getVersion);

  return (
    <div>
      <PageHeader title="Dashboard" />

      <div className="mb-6 rounded-md border border-border bg-surface p-4">
        {loading && (
          <p className="text-sm text-foreground/70">Checking connection to open-oscar-server…</p>
        )}
        {error && !loading && (
          <div>
            <p className="text-sm font-semibold text-aim-danger">
              Can&apos;t reach open-oscar-server
            </p>
            <p className="mt-1 text-sm text-foreground/70">{error}</p>
          </div>
        )}
        {data && !loading && !error && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">
              ● Connected
            </p>
            <p>
              <span className="text-foreground/60">version</span>{" "}
              <span className="font-mono">{data.version}</span>
            </p>
            <p>
              <span className="text-foreground/60">commit</span>{" "}
              <span className="font-mono">{data.commit}</span>
            </p>
            <p>
              <span className="text-foreground/60">built</span>{" "}
              <span className="font-mono">{data.date}</span>
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-md border border-border bg-surface p-4 transition-colors hover:border-aim-blue"
          >
            <p className="font-semibold text-aim-blue dark:text-aim-blue-light">
              {section.label}
            </p>
            <p className="mt-1 text-sm text-foreground/70">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
