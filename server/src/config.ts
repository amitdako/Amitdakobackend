import { z } from "zod";

// Validate environment configuration at startup. If anything required is
// missing or malformed we fail fast rather than booting a half-configured
// (and potentially insecure) server.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1),
  // A weak/short signing secret undermines every JWT, so require real length.
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  // Refresh tokens use a DISTINCT secret so an access token can never be
  // verified as a refresh token, and vice versa.
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(32, "REFRESH_TOKEN_SECRET must be at least 32 characters"),
  PORT: z.coerce.number().int().positive().default(3001),
  FRONTEND_ORIGIN: z.string().url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment configuration:",
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const config = parsed.data;

// Short-lived access tokens limit the damage of a stolen/hijacked token.
export const ACCESS_TOKEN_TTL = "15m";

// Long-lived refresh token, delivered via an HttpOnly cookie, lets the client
// silently obtain a new access token without re-entering credentials.
export const REFRESH_TOKEN_TTL = "7d";
export const REFRESH_COOKIE_NAME = "refreshToken";
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
