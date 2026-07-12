"use client";

import { Table, Thead, Tbody, Tr, Th, Td } from "@/app/components/ui/Table";
import type { Session } from "@/app/lib/types";
import { SessionRow } from "./SessionRow";

export function SessionsTable({
  sessions,
  onKick,
}: {
  sessions: Session[];
  onKick: (screenName: string) => void;
}) {
  return (
    <Table>
      <Thead>
        <Tr>
          <Th />
          <Th>Screen name</Th>
          <Th>Type</Th>
          <Th>Online</Th>
          <Th>Idle</Th>
          <Th>Flags</Th>
          <Th>Instances</Th>
          <Th className="text-right">Actions</Th>
        </Tr>
      </Thead>
      <Tbody>
        {sessions.length === 0 && (
          <Tr>
            <Td colSpan={8} className="py-6 text-center text-foreground/60">
              No active sessions.
            </Td>
          </Tr>
        )}
        {sessions.map((session) => (
          <SessionRow key={session.id} session={session} onKick={onKick} />
        ))}
      </Tbody>
    </Table>
  );
}
