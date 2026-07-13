import type {
  Account,
  BartAsset,
  BuddyGroup,
  Category,
  Keyword,
  LinkedAccountsResponse,
  PrivateRoom,
  PublicRoom,
  SessionsResponse,
  User,
  VersionInfo,
} from "./types";

class ApiError extends Error {}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  opts?: { notFoundValue?: T },
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 404 && opts && "notFoundValue" in opts) {
    return opts.notFoundValue as T;
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    const text = await res.text();
    if (text) {
      try {
        const body = JSON.parse(text);
        message = body?.message || text;
      } catch {
        message = text;
      }
    }
    throw new ApiError(message);
  }

  if (res.status === 204 || res.status === 304) {
    return undefined as T;
  }

  // Some success responses (e.g. POST /user, POST /chat/room/public) return
  // a plain-text confirmation message instead of JSON. Fall back to
  // undefined rather than throwing on a body that isn't actually JSON.
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined as T;
  }
}

export function iconUrl(screenName: string): string {
  return `/api/user/${encodeURIComponent(screenName)}/icon`;
}

export function listUsers(): Promise<User[]> {
  return apiFetch<User[]>("/user");
}

export function createUser(screenName: string, password: string): Promise<void> {
  return apiFetch("/user", {
    method: "POST",
    body: JSON.stringify({ screen_name: screenName, password }),
  });
}

export function deleteUser(screenName: string): Promise<void> {
  return apiFetch("/user", {
    method: "DELETE",
    body: JSON.stringify({ screen_name: screenName }),
  });
}

export function getAccount(screenName: string): Promise<Account> {
  return apiFetch<Account>(`/user/${encodeURIComponent(screenName)}/account`);
}

export function updateAccount(
  screenName: string,
  patch: { suspended_status?: string | null; is_bot?: boolean },
): Promise<void> {
  return apiFetch(`/user/${encodeURIComponent(screenName)}/account`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function setPassword(screenName: string, password: string): Promise<void> {
  return apiFetch("/user/password", {
    method: "PUT",
    body: JSON.stringify({ screen_name: screenName, password }),
  });
}

export function listSessions(): Promise<SessionsResponse> {
  return apiFetch<SessionsResponse>("/session");
}

export function killSession(screenName: string): Promise<void> {
  return apiFetch(`/session/${encodeURIComponent(screenName)}`, {
    method: "DELETE",
  });
}

export function getVersion(): Promise<VersionInfo> {
  return apiFetch<VersionInfo>("/version");
}

export function getFeedbag(screenName: string): Promise<BuddyGroup[]> {
  return apiFetch<BuddyGroup[]>(
    `/feedbag/${encodeURIComponent(screenName)}/group`,
    undefined,
    { notFoundValue: [] },
  );
}

export function addGroup(
  screenName: string,
  groupName: string,
): Promise<{ group_id: number; group_name: string }> {
  return apiFetch(
    `/feedbag/${encodeURIComponent(screenName)}/group/${encodeURIComponent(groupName)}`,
    { method: "PUT" },
  );
}

export function addBuddy(
  screenName: string,
  groupId: number,
  buddyScreenName: string,
): Promise<{ name: string; group_id: number; item_id: number }> {
  return apiFetch(
    `/feedbag/${encodeURIComponent(screenName)}/group/${groupId}/buddy/${encodeURIComponent(buddyScreenName)}`,
    { method: "PUT" },
  );
}

export function removeBuddy(
  screenName: string,
  groupId: number,
  buddyScreenName: string,
): Promise<void> {
  return apiFetch(
    `/feedbag/${encodeURIComponent(screenName)}/group/${groupId}/buddy/${encodeURIComponent(buddyScreenName)}`,
    { method: "DELETE" },
  );
}

export function listLinkedAccounts(screenName: string): Promise<LinkedAccountsResponse> {
  return apiFetch<LinkedAccountsResponse>(
    `/user/${encodeURIComponent(screenName)}/linked-account`,
  );
}

export function addLinkedAccount(
  screenName: string,
  linkedScreenName: string,
): Promise<void> {
  return apiFetch(`/user/${encodeURIComponent(screenName)}/linked-account`, {
    method: "POST",
    body: JSON.stringify({ linked_screen_name: linkedScreenName }),
  });
}

export function removeLinkedAccount(
  screenName: string,
  linkedScreenName: string,
): Promise<void> {
  return apiFetch(
    `/user/${encodeURIComponent(screenName)}/linked-account/${encodeURIComponent(linkedScreenName)}`,
    { method: "DELETE" },
  );
}

export function listPublicRooms(): Promise<PublicRoom[]> {
  return apiFetch<PublicRoom[]>("/chat/room/public");
}

export function createPublicRoom(name: string): Promise<void> {
  return apiFetch("/chat/room/public", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function deletePublicRooms(names: string[]): Promise<void> {
  return apiFetch("/chat/room/public", {
    method: "DELETE",
    body: JSON.stringify({ names }),
  });
}

export function listPrivateRooms(): Promise<PrivateRoom[]> {
  return apiFetch<PrivateRoom[]>("/chat/room/private");
}

export function sendInstantMessage(
  from: string,
  to: string,
  text: string,
): Promise<void> {
  return apiFetch("/instant-message", {
    method: "POST",
    body: JSON.stringify({ from, to, text }),
  });
}

export function listCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/directory/category");
}

export function createCategory(name: string): Promise<Category> {
  return apiFetch<Category>("/directory/category", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function deleteCategory(id: number): Promise<void> {
  return apiFetch(`/directory/category/${id}`, {
    method: "DELETE",
  });
}

export function listKeywords(categoryId: number): Promise<Keyword[]> {
  return apiFetch<Keyword[]>(`/directory/category/${categoryId}/keyword`);
}

export function createKeyword(categoryId: number, name: string): Promise<Keyword> {
  return apiFetch<Keyword>("/directory/keyword", {
    method: "POST",
    body: JSON.stringify({ category_id: categoryId, name }),
  });
}

export function deleteKeyword(id: number): Promise<void> {
  return apiFetch(`/directory/keyword/${id}`, {
    method: "DELETE",
  });
}

export function bartAssetUrl(hash: string): string {
  return `/api/bart/${encodeURIComponent(hash)}`;
}

export function listBartAssets(type: number): Promise<BartAsset[]> {
  return apiFetch<BartAsset[]>(`/bart?type=${type}`);
}

export function uploadBartAsset(
  hash: string,
  type: number,
  data: Blob,
): Promise<BartAsset> {
  return apiFetch<BartAsset>(`/bart/${encodeURIComponent(hash)}?type=${type}`, {
    method: "POST",
    body: data,
    headers: { "Content-Type": "application/octet-stream" },
  });
}

export function deleteBartAsset(hash: string): Promise<void> {
  return apiFetch(`/bart/${encodeURIComponent(hash)}`, {
    method: "DELETE",
  });
}
