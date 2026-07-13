export type SuspendedStatus =
  | "deleted"
  | "expired"
  | "suspended"
  | "suspended_age";

export interface User {
  id: string;
  screen_name: string;
  is_icq: boolean;
  suspended_status: string;
  is_bot: boolean | null;
}

export interface Account {
  id: string;
  screen_name: string;
  profile: string;
  email_address: string;
  confirmed: boolean;
  is_icq: boolean;
  suspended_status: string;
  is_bot: boolean | null;
}

export interface SessionInstance {
  num: number;
  idle_seconds: number;
  is_away: boolean;
  away_message: string;
  is_invisible: boolean;
  remote_addr: string;
  remote_port: number;
}

export interface Session {
  id: string;
  screen_name: string;
  online_seconds: number;
  is_away: boolean;
  away_message: string;
  idle_seconds: number;
  is_invisible: boolean;
  is_icq: boolean;
  instance_count: number;
  instances: SessionInstance[];
}

export interface SessionsResponse {
  count: number;
  sessions: Session[];
}

export interface VersionInfo {
  version: string;
  commit: string;
  date: string;
}

export interface MessageResponse {
  message: string;
}

export interface Buddy {
  name: string;
  item_id: number;
}

export interface BuddyGroup {
  group_id: number;
  group_name: string;
  buddies: Buddy[];
}

export interface LinkedAccountsResponse {
  linked_accounts: string[];
}

export interface RoomParticipant {
  id: string;
  screen_name: string;
}

export interface PublicRoom {
  name: string;
  create_time: string;
  participants: RoomParticipant[];
}

export interface PrivateRoom {
  name: string;
  create_time: string;
  creator_id: string;
  participants: RoomParticipant[];
}

export interface Category {
  id: number;
  name: string;
}

export interface Keyword {
  id: number;
  name: string;
}

export interface BartAsset {
  hash: string;
  type: number;
}
