const API_URL = "http://localhost:3001";

// The session token is kept in module memory only — never in localStorage.
// This limits XSS exposure: an injected script can't read the token out of
// localStorage, and the token is cleared on a full page refresh.
//
// TODO: migrate this to an HttpOnly, Secure, SameSite cookie as soon as the
// backend server is introduced. At that point the token should be set by the
// server and not be readable by JavaScript at all.
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return authToken ? { ...extra, Authorization: `Bearer ${authToken}` } : { ...extra };
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Invalid email or password");
  }
  return res.json();
}

// Returns only the events the current user is allowed to see. Authorization is
// enforced by the backend per-user; the client must never assume it can see
// everything just because a request succeeds.
export async function getEvents() {
  const res = await fetch(`${API_URL}/api/events`, {
    headers: authHeaders(),
  });
  return res.json();
}

export async function getUsers() {
  const res = await fetch(`${API_URL}/api/users`, {
    headers: authHeaders(),
  });
  return res.json();
}

export async function createUser(user: { email: string; password: string; role: string }) {
  const res = await fetch(`${API_URL}/api/users`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(user),
  });
  return res.json();
}

export async function deleteUser(id: string) {
  const res = await fetch(`${API_URL}/api/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return res.json();
}
