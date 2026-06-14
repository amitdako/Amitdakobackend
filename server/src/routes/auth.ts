import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config, ACCESS_TOKEN_TTL } from "../config";
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

    const token = jwt.sign({ sub: user.id, role: user.role }, config.JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_TTL, // 15m — short window limits a stolen token
    });

    res.json({ token, user: toPublicUser(user) });
  })
);

authRouter.post("/logout", (_req, res) => {
  // JWTs are stateless: there is nothing to clear server-side without a
  // denylist. The client discards its in-memory token. This endpoint exists
  // for symmetry and a future HttpOnly-cookie / denylist implementation.
  res.json({ message: "Logged out" });
});

authRouter.get("/me", authenticate, (req, res) => {
  // req.user is already the public shape (no password hash).
  res.json(req.user);
});
