import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../prisma";

// The authenticated principal attached to each request after `authenticate`.
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  status: string;
}

// Augment Express' Request so `req.user` is typed everywhere downstream.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface AccessTokenPayload {
  sub: string;
  role: string;
}

/**
 * Verifies the Bearer JWT and attaches the *current* user to req.user.
 *
 * We re-load the user from the database on every request (rather than trusting
 * the role baked into the token) so that disabled or deleted accounts lose
 * access immediately, and role changes take effect without waiting for the
 * token to expire.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = header.slice("Bearer ".length).trim();

    let payload: AccessTokenPayload;
    try {
      payload = jwt.verify(token, config.JWT_SECRET) as AccessTokenPayload;
    } catch {
      // Covers invalid signature AND expiry (TokenExpiredError) — we never
      // disclose which, to avoid handing attackers a probing oracle.
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "active") {
      return res.status(401).json({ error: "Authentication required" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };
    next();
  } catch (err) {
    // Unexpected (e.g. DB) failure → hand off to the global error handler.
    next(err);
  }
}
