import { Router } from "express";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "../prisma";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { validateBody, validateParams } from "../middleware/validate";
import { asyncHandler } from "../asyncHandler";
import { toPublicUser } from "../serializers";
import { badRequest, conflict, forbidden, notFound } from "../errors";

const BCRYPT_ROUNDS = 12;
const ROLES = ["admin", "analyst", "viewer"] as const;
const STATUSES = ["active", "disabled"] as const;

const idParamSchema = z.object({ id: z.string().min(1).max(64) });

// .max() on email/password bounds input size (DoS); enum locks role to the
// known set so a client can't invent privileges.
const createUserSchema = z.object({
  email: z.string().email().max(100),
  password: z.string().min(8).max(64),
  role: z.enum(ROLES),
});

// PATCH only allows role/status — email/password can't be changed this way.
const updateUserSchema = z
  .object({
    role: z.enum(ROLES).optional(),
    status: z.enum(STATUSES).optional(),
  })
  .refine((d) => d.role !== undefined || d.status !== undefined, {
    message: "Provide at least one of: role, status",
  });

export const usersRouter = Router();

// Every user route requires a valid token.
usersRouter.use(authenticate);

// List all users — admin only.
usersRouter.get(
  "/",
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    res.json(users.map(toPublicUser));
  })
);

// Get one user. IDOR guard: admins may read anyone; a regular user may read
// ONLY their own profile.
usersRouter.get(
  "/:id",
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (req.user!.role !== "admin" && req.user!.id !== id) {
      throw forbidden("You can only access your own profile");
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw notFound("User not found");
    res.json(toPublicUser(user));
  })
);

// Create a user — admin only.
usersRouter.post(
  "/",
  requireRole("admin"),
  validateBody(createUserSchema),
  asyncHandler(async (req, res) => {
    const { email, password, role } = req.body as z.infer<typeof createUserSchema>;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw conflict("A user with that email already exists");

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { id: randomUUID(), email, role, status: "active", passwordHash },
    });
    res.status(201).json(toPublicUser(user));
  })
);

// Update role/status — admin only.
usersRouter.patch(
  "/:id",
  requireRole("admin"),
  validateParams(idParamSchema),
  validateBody(updateUserSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw notFound("User not found");

    const user = await prisma.user.update({
      where: { id },
      data: req.body as z.infer<typeof updateUserSchema>,
    });
    res.json(toPublicUser(user));
  })
);

// Delete a user — admin only; an admin cannot delete their own account.
usersRouter.delete(
  "/:id",
  requireRole("admin"),
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (req.user!.id === id) {
      throw badRequest("You cannot delete your own account");
    }
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw notFound("User not found");

    await prisma.user.delete({ where: { id } });
    res.json({ message: "User deleted" });
  })
);
