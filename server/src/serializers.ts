import type { User, Event } from "@prisma/client";

// Public user shape — the password hash is structurally impossible to leak
// because we never copy it here (security rule #1).
export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

// Public event shape. tags are stored as a JSON string in SQLite; parse them
// back into an array for the client, tolerating any malformed value.
export function toPublicEvent(event: Event) {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(event.tags);
    if (Array.isArray(parsed)) tags = parsed;
  } catch {
    tags = [];
  }
  return {
    id: event.id,
    timestamp: event.timestamp,
    severity: event.severity,
    title: event.title,
    description: event.description,
    assetHostname: event.assetHostname,
    assetIp: event.assetIp,
    sourceIp: event.sourceIp,
    tags,
    userId: event.userId,
  };
}
