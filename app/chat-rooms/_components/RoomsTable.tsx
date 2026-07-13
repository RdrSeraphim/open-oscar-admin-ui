"use client";

import { Table, Thead, Tbody, Tr, Th, Td } from "@/app/components/ui/Table";
import type { RoomParticipant } from "@/app/lib/types";
import { RoomRow } from "./RoomRow";

interface RoomListItem {
  name: string;
  create_time: string;
  participants: RoomParticipant[];
  creator_id?: string;
}

export function RoomsTable({
  rooms,
  showCreator,
  onDelete,
  emptyMessage,
}: {
  rooms: RoomListItem[];
  showCreator: boolean;
  onDelete?: (name: string) => void;
  emptyMessage: string;
}) {
  const columnCount = 4 + (showCreator ? 1 : 0) + (onDelete ? 1 : 0);

  return (
    <Table>
      <Thead>
        <Tr>
          <Th />
          <Th>Name</Th>
          <Th>Created</Th>
          {showCreator && <Th>Creator</Th>}
          <Th>Participants</Th>
          {onDelete && <Th className="text-right">Actions</Th>}
        </Tr>
      </Thead>
      <Tbody>
        {rooms.length === 0 && (
          <Tr>
            <Td colSpan={columnCount} className="py-6 text-center text-foreground/60">
              {emptyMessage}
            </Td>
          </Tr>
        )}
        {rooms.map((room) => (
          <RoomRow
            key={room.name}
            name={room.name}
            createTime={room.create_time}
            participants={room.participants}
            creatorId={showCreator ? room.creator_id : undefined}
            onDelete={onDelete}
          />
        ))}
      </Tbody>
    </Table>
  );
}
