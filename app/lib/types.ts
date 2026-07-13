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

export interface WebAPIKey {
  dev_id: string;
  app_name: string;
  created_at: string;
  last_used: string | null;
  is_active: boolean;
  rate_limit: number;
  allowed_origins?: string[];
  capabilities?: string[];
}

export interface CreatedWebAPIKey extends WebAPIKey {
  dev_key: string;
}

export interface IcqBasicInfo {
  nickname: string;
  first_name: string;
  last_name: string;
  email: string;
  city: string;
  state: string;
  phone: string;
  fax: string;
  address: string;
  cell_phone: string;
  zip: string;
  country_code: number;
  gmt_offset: number;
  publish_email: boolean;
  origin_city: string;
  origin_state: string;
  origin_country_code: number;
}

export interface IcqMoreInfo {
  gender: number;
  homepage: string;
  birth_year: number;
  birth_month: number;
  birth_day: number;
  lang1: number;
  lang2: number;
  lang3: number;
}

export interface IcqWorkInfo {
  company: string;
  department: string;
  position: string;
  occupation_code: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  country_code: number;
  phone: string;
  fax: string;
  web_page: string;
}

export interface IcqInterests {
  code1: number;
  keyword1: string;
  code2: number;
  keyword2: string;
  code3: number;
  keyword3: string;
  code4: number;
  keyword4: string;
}

export interface IcqAffiliations {
  past_code1: number;
  past_keyword1: string;
  past_code2: number;
  past_keyword2: string;
  past_code3: number;
  past_keyword3: string;
  current_code1: number;
  current_keyword1: string;
  current_code2: number;
  current_keyword2: string;
  current_code3: number;
  current_keyword3: string;
}

export interface IcqPermissions {
  auth_required: boolean;
  web_aware: boolean;
  allow_spam: boolean;
}

export interface IcqProfile {
  uin: number;
  basic_info: IcqBasicInfo;
  more_info: IcqMoreInfo;
  work_info: IcqWorkInfo;
  notes: string;
  interests: IcqInterests;
  affiliations: IcqAffiliations;
  permissions: IcqPermissions;
}
