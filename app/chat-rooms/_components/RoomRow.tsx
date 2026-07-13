"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Tr, Td } from "@/app/components/ui/Table";
import type { RoomParticipant } from "@/app/lib/types";

export function RoomRow({
  name,
  createTime,
  participants,
  creatorId,
  onDelete,
}: {
  name: string;
  createTime: string;
  participants: RoomParticipant[];
  creatorId?: string;
  onDelete?: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const columnCount = 4 + (creatorId !== undefined ? 1 : 0) + (onDelete ? 1 : 0);

  return (
    <>
      <Tr
        className="cursor-pointer hover:bg-border/20"
        onClick={() => setExpanded((v) => !v)}
      >
        <Td className="w-4 text-foreground/50">{expanded ? "▾" : "▸"}</Td>
        <Td className="font-medium">{name}</Td>
        <Td>{new Date(createTime).toLocaleString()}</Td>
        {creatorId !== undefined && <Td>{creatorId}</Td>}
        <Td>{participants.length}</Td>
        {onDelete && (
          <Td className="text-right">
            <Button
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(name);
              }}
            >
              Delete
            </Button>
          </Td>
        )}
      </Tr>
      {expanded && (
        <Tr className="bg-border/10">
          <Td colSpan={columnCount}>
            {participants.length === 0 ? (
              <p className="py-1 text-xs text-foreground/50">No participants.</p>
            ) : (
              <ul className="flex flex-wrap gap-x-4 gap-y-1 py-1 text-xs">
                {participants.map((p) => (
                  <li key={p.id}>{p.screen_name}</li>
                ))}
              </ul>
            )}
          </Td>
        </Tr>
      )}
    </>
  );
}
