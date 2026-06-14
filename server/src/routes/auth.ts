import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import type { User } from "@prisma/client";
import {
  config,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_MAX_AGE_MS,
} from "../config";
import { prisma } from "../prisma";
import { validateBody } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { loginRateLimiter } from "../middleware/rateLimiter";
import { asyncHandler } from "../asyncHandler";
import { toPublicUser } from "../serializers";

// .max() bounds every string to prevent oversized-input resource exhaustion.
const loginSchema = z.object({
  email: z.string().email().max(100),
  password: z.string().min(1).max(64),
});

interface RefreshPayload {
  sub: string;
  type: "refresh";
}

// Access token: short-lived, sent in the JSON body, carries the role.
function signAccessToken(user: Pick<User, "id" | "role">): string {
  return jwt.sign({ sub: user.id, role: user.role }, config.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL, // 15m
  });
}

// Refresh token: long-lived, signed with a SEPARATE secret + a `type` claim so
// it can't be used interchangeably with an access token. Delivered only via an
// HttpOnly cookie, never readable by JS.
function signRefreshToken(user: Pick<User, "id">): string {
  return jwt.sign({ sub: user.id, type: "refresh" }, config.REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL, // 7d
  });
}

// Cookie attributes. `secure` is disabled in development because browsers drop
// Secure cookies over http://localhost (which would break refresh in dev).
// `path` scopes the cookie to /api/auth so it isn't sent on every API request.
const refreshCookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/auth",
  maxAge: REFRESH_TOKEN_MAX_AGE_MS,
};

// Minimal native cookie parser — avoids adding the cookie-parser dependency.
function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export const authRouter = Router();

authRouter.post(
  "/login",
  loginRateLimiter, // brute-force / credential-stuffing protection
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;

    const user = await prisma.user.findUnique({ where: { email } });

    // Identical response for "no such user" and "wrong password" so the
    // endpoint can't be used to enumerate which accounts exist.
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (user.status !== "active") {
      return res.status(403).json({ error: "Account is disabled" });
    }

    // Long-lived refresh token in an HttpOnly cookie + short-lived access token
    // in the body.
    res.cookie(REFRESH_COOKIE_NAME, signRefreshToken(user), refreshCookieOptions);
    res.json({ token: signAccessToken(user), user: toPublicUser(user) });
  })
);

// Silently mint a new access token from the refresh cookie, so the user never
// has to re-enter credentials while their refresh token is valid.
authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const refreshToken = parseCookies(req.headers.cookie)[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      return res.status(401).json({ error: "Authentication required" });
    }

    let payload: RefreshPayload;
    try {
      payload = jwt.verify(refreshToken, config.REFRESH_TOKEN_SECRET) as RefreshPayload;
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    // Reject anything that isn't actually a refresh token.
    if (payload.type !== "refresh") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Re-validate against the DB so disabled/deleted users can't refresh.
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "active") {
      return res.status(401).json({ error: "Authentication required" });
    }

    res.json({ token: signAccessToken(user) });
  })
);

authRouter.post("/logout", (_req, res) => {
  // Clear the refresh cookie. The options (minus maxAge) must match those used
  // when setting it, or the browser won't remove it.
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
  });
  res.json({ message: "Logged out" });
});

authRouter.get("/me", authenticate, (req, res) => {
  // req.user is already the public shape (no password hash).
  res.json(req.user);
});
