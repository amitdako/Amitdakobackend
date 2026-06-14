import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "../prisma";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { validateBody, validateParams } from "../middleware/validate";
import { asyncHandler } from "../asyncHandler";
import { toPublicEvent } from "../serializers";
import { notFound } from "../errors";

const SEVERITIES = ["HIGH", "MEDIUM", "LOW"] as const;

const idParamSchema = z.object({ id: z.string().min(1).max(64) });

// Strict .max() limits on every string to prevent oversized-payload DoS:
// title <= 100, description <= 1000.
const eventCreateSchema = z.object({
  timestamp: z.string().min(1).max(40),
  severity: z.enum(SEVERITIES),
  title: z.string().min(1).max(100),
  description: z.string().max(1000),
  assetHostname: z.string().max(253),
  assetIp: z.string().max(45),
  sourceIp: z.string().max(45).nullish(),
  tags: z.array(z.string().max(50)).max(50).default([]),
  userId: z.string().max(64).nullish(),
});

// Update: all fields optional (no defaults, so an absent field is left
// untouched), but at least one must be present.
const eventUpdateSchema = z
  .object({
    timestamp: z.string().min(1).max(40).optional(),
    severity: z.enum(SEVERITIES).optional(),
    title: z.string().min(1).max(100).optional(),
    description: z.string().max(1000).optional(),
    assetHostname: z.string().max(253).optional(),
    assetIp: z.string().max(45).optional(),
    sourceIp: z.string().max(45).nullish(),
    tags: z.array(z.string().max(50)).max(50).optional(),
    userId: z.string().max(64).nullish(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });

export const eventsRouter = Router();

// Every event route requires a valid token.
eventsRouter.use(authenticate);

// List events — any authenticated role (read-only security feed).
eventsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const events = await prisma.event.findMany({ orderBy: { timestamp: "desc" } });
    res.json(events.map(toPublicEvent));
  })
);

// Get one event.
eventsRouter.get(
  "/:id",
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) throw notFound("Event not found");
    res.json(toPublicEvent(event));
  })
);

// Create an event — admin or analyst (viewers are read-only).
eventsRouter.post(
  "/",
  requireRole("admin", "analyst"),
  validateBody(eventCreateSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof eventCreateSchema>;
    const event = await prisma.event.create({
      data: {
        id: randomUUID(),
        timestamp: body.timestamp,
        severity: body.severity,
        title: body.title,
        description: body.description,
        assetHostname: body.assetHostname,
        assetIp: body.assetIp,
        sourceIp: body.sourceIp ?? null,
        tags: JSON.stringify(body.tags ?? []),
        userId: body.userId ?? null,
      },
    });
    res.status(201).json(toPublicEvent(event));
  })
);

// Update an event — admin or analyst.
eventsRouter.patch(
  "/:id",
  requireRole("admin", "analyst"),
  validateParams(idParamSchema),
  validateBody(eventUpdateSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) throw notFound("Event not found");

    const body = req.body as z.infer<typeof eventUpdateSchema>;
    const data: Record<string, unknown> = { ...body };
    // tags must be re-encoded to a JSON string for storage.
    if (body.tags !== undefined) data.tags = JSON.stringify(body.tags);

    const event = await prisma.event.update({ where: { id }, data });
    res.json(toPublicEvent(event));
  })
);

// Delete an event — admin only.
eventsRouter.delete(
  "/:id",
  requireRole("admin"),
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) throw notFound("Event not found");

    await prisma.event.delete({ where: { id } });
    res.json({ message: "Event deleted" });
  })
);
