import type { SecurityEvent, User } from "./types";

const API_URL = "http://localhost:3001";

// ---------------------------------------------------------------------------
// Access token storage
//
// The access token lives ONLY in module memory — never in localStorage or
// sessionStorage — so an XSS payload can't read it out of persistent storage,
// and it's gone on a full page refresh. The session is transparently restored
// after a refresh via the HttpOnly refresh cookie (see bootstrapSession()).
// ---------------------------------------------------------------------------
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

function setAccessToken(token: string | null) {
  accessToken = token;
}

// The AuthContext registers a callback here so the HTTP layer can force a
// logout (clear React state → redirect to /login) when a refresh fails.
let onAuthFailure: (() => void) | null = null;

export function setAuthFailureHandler(handler: () => void) {
  onAuthFailure = handler;
}

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function toJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string }).error || "Request failed");
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Refresh: single-flight so that N concurrent 401s trigger exactly ONE call to
// /api/auth/refresh, and all of them await the same result.
// ---------------------------------------------------------------------------
let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include", // sends the HttpOnly refresh cookie implicitly
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { token?: string };
    if (!data.token) return false;
    setAccessToken(data.token);
    return true;
  } catch {
    return false;
  }
}

function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ---------------------------------------------------------------------------
// Authenticated fetch wrapper with the seamless-refresh interceptor.
// ---------------------------------------------------------------------------
async function authedFetch(
  path: string,
  options: RequestInit = {},
  allowRetry = true
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && allowRetry) {
    // Pause here, attempt a single shared refresh, then retry the request once.
    const refreshed = await refreshOnce();
    if (refreshed) {
      return authedFetch(path, options, false);
    }
    // Refresh failed (cookie expired/missing) → drop the token and log out.
    setAccessToken(null);
    onAuthFailure?.();
  }

  return res;
}

async function authedJson<T>(path: string, options?: RequestInit): Promise<T> {
  return toJson<T>(await authedFetch(path, options));
}

const jsonHeaders = { "Content-Type": "application/json" };

// ---------------------------------------------------------------------------
// Auth endpoints (these bypass the refresh interceptor on purpose)
// ---------------------------------------------------------------------------
export async function login(email: string, password: string): Promise<User> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify({ email, password }),
  });
  const data = await toJson<{ token: string; user: User }>(res);
  setAccessToken(data.token);
  return data.user;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include", // lets the backend clear the refresh cookie
    });
  } finally {
    // Always clear the in-memory token, even if the network call fails.
    setAccessToken(null);
  }
}

// Called once on app load: try to restore a session from the refresh cookie.
// Returns the current user, or null if there's no valid session.
export async function bootstrapSession(): Promise<User | null> {
  const ok = await refreshOnce();
  if (!ok) return null;
  try {
    return await getMe();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Resource endpoints (go through the authenticated wrapper)
// ---------------------------------------------------------------------------
export function getMe(): Promise<User> {
  return authedJson<User>("/api/auth/me");
}

export function getEvents(): Promise<SecurityEvent[]> {
  return authedJson<SecurityEvent[]>("/api/events");
}

export function getUsers(): Promise<User[]> {
  return authedJson<User[]>("/api/users");
}

export function createUser(input: {
  email: string;
  password: string;
  role: string;
}): Promise<User> {
  return authedJson<User>("/api/users", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
}

export function deleteUser(id: string): Promise<{ message: string }> {
  return authedJson<{ message: string }>(`/api/users/${id}`, { method: "DELETE" });
}
