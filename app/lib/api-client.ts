import type { Account, SessionsResponse, User, VersionInfo } from "./types";

class ApiError extends Error {}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

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

  return (await res.json()) as T;
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
