"use client";

import { useState } from "react";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Tr, Td } from "@/app/components/ui/Table";
import { formatDuration } from "@/app/lib/format";
import type { Session } from "@/app/lib/types";

export function SessionRow({
  session,
  onKick,
}: {
  session: Session;
  onKick: (screenName: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Tr
        className="cursor-pointer hover:bg-border/20"
        onClick={() => setExpanded((v) => !v)}
      >
        <Td className="w-4 text-foreground/50">{expanded ? "▾" : "▸"}</Td>
        <Td className="font-medium">{session.screen_name}</Td>
        <Td>
          <Badge tone={session.is_icq ? "blue" : "gold"}>
            {session.is_icq ? "ICQ" : "AIM"}
          </Badge>
        </Td>
        <Td>{formatDuration(session.online_seconds)}</Td>
        <Td>{session.idle_seconds > 0 ? formatDuration(session.idle_seconds) : "—"}</Td>
        <Td>
          <div className="flex flex-wrap gap-1">
            {session.is_away && <Badge tone="neutral">away</Badge>}
            {session.is_invisible && <Badge tone="neutral">invisible</Badge>}
          </div>
        </Td>
        <Td>{session.instance_count}</Td>
        <Td className="text-right">
          <Button
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              onKick(session.screen_name);
            }}
          >
            Kick
          </Button>
        </Td>
      </Tr>
      {expanded && (
        <Tr className="bg-border/10">
          <Td colSpan={8}>
            <div className="flex flex-col gap-2 py-1">
              {session.away_message && (
                <p className="text-xs text-foreground/70">
                  Away message: {session.away_message}
                </p>
              )}
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-foreground/50">
                    <th className="px-2 py-1 text-left font-medium">Instance</th>
                    <th className="px-2 py-1 text-left font-medium">Idle</th>
                    <th className="px-2 py-1 text-left font-medium">Flags</th>
                    <th className="px-2 py-1 text-left font-medium">Remote address</th>
                  </tr>
                </thead>
                <tbody>
                  {session.instances.map((instance) => (
                    <tr key={instance.num}>
                      <td className="px-2 py-1">#{instance.num}</td>
                      <td className="px-2 py-1">
                        {instance.idle_seconds > 0
                          ? formatDuration(instance.idle_seconds)
                          : "—"}
                      </td>
                      <td className="px-2 py-1">
                        {[
                          instance.is_away && "away",
                          instance.is_invisible && "invisible",
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>
                      <td className="px-2 py-1 font-mono">
                        {instance.remote_addr}:{instance.remote_port}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Td>
        </Tr>
      )}
    </>
  );
}
