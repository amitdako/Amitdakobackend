import { Request, Response, NextFunction } from "express";

/**
 * RBAC guard. Use after `authenticate`. Allows the request through only if the
 * authenticated user's role is one of the permitted roles, otherwise 403.
 *
 * e.g. router.post("/users", authenticate, requireRole("admin"), ...)
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      // Defensive: requireRole should always run after authenticate.
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient permissions" });
    }
    next();
  };
}
