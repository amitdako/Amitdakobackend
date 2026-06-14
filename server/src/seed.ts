import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// Shared contract type, imported from the frontend. `import type` is erased at
// build time, so this couples the two sides at the type level only — no runtime
// dependency on frontend code.
import type { SecurityEvent } from "../../src/types";

const prisma = new PrismaClient();

// bcrypt work factor. 12 is a sensible 2026 default (slow enough to resist
// offline cracking, fast enough for interactive logins).
const BCRYPT_ROUNDS = 12;

// Read a required environment variable, or fail fast. No plaintext password is
// ever hardcoded here (security rule #3) — the demo passwords live only in the
// gitignored .env file. The DB stores only the bcrypt hash, and passwords are
// never printed by this script.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Define it in server/.env (see .env.example).`
    );
  }
  return value;
}

interface SeedUser {
  email: string;
  role: string;
  status: string;
  password: string;
}

// Built lazily inside main() so a missing env var is reported via the central
// error handler below rather than crashing at import time.
function getSeedUsers(): SeedUser[] {
  return [
    { email: "admin@penguwave.io", role: "admin", status: "active", password: requireEnv("SEED_ADMIN_PASSWORD") },
    { email: "analyst@penguwave.io", role: "analyst", status: "active", password: requireEnv("SEED_ANALYST_PASSWORD") },
    { email: "viewer@penguwave.io", role: "viewer", status: "active", password: requireEnv("SEED_VIEWER_PASSWORD") },
  ];
}

async function seedUsers() {
  for (const u of getSeedUsers()) {
    const passwordHash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
    // Upsert by the unique email so re-running the seed is idempotent.
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, status: u.status, passwordHash },
      create: {
        id: randomUUID(),
        email: u.email,
        role: u.role,
        status: u.status,
        passwordHash,
      },
    });
    console.log(`  user: ${u.email} (${u.role})`); // never logs the password
  }
}

function loadMockEvents(): SecurityEvent[] {
  // mock_events.json lives at the repo root, two levels up from server/src.
  const path = join(__dirname, "../../data/mock_events.json");
  return JSON.parse(readFileSync(path, "utf-8")) as SecurityEvent[];
}

async function seedEvents() {
  const events = loadMockEvents();
  for (const e of events) {
    const data = {
      timestamp: e.timestamp,
      severity: e.severity,
      title: e.title,
      description: e.description,
      assetHostname: e.assetHostname,
      assetIp: e.assetIp,
      sourceIp: e.sourceIp ?? null,
      // SQLite has no array type; persist tags as a JSON-encoded string.
      tags: JSON.stringify(e.tags ?? []),
      userId: e.userId ?? null,
    };
    await prisma.event.upsert({
      where: { id: e.id },
      update: data,
      create: { id: e.id, ...data },
    });
  }
  console.log(`  events: ${events.length} upserted`);
}

async function main() {
  console.log("Seeding database...");
  await seedUsers();
  await seedEvents();
  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
