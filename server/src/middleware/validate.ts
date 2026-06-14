import { Request, Response, NextFunction } from "express";
import { ZodTypeAny } from "zod";

// Format zod issues into a compact, client-safe shape (no internals leaked).
function formatIssues(error: { issues: { path: (string | number)[]; message: string }[] }) {
  return error.issues.map((i) => ({
    field: i.path.join(".") || "(root)",
    message: i.message,
  }));
}

/**
 * Validate (and SANITIZE) req.body against a zod schema.
 *
 * zod's object schemas strip unknown keys by default, so the parsed result that
 * we write back to req.body contains ONLY the fields the schema declares. This
 * prevents mass-assignment (e.g. a client sneaking `role: "admin"` into a
 * profile update) and keeps unexpected input out of the rest of the pipeline.
 */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: formatIssues(result.error),
      });
    }
    req.body = result.data; // stripped + typed
    next();
  };
}

/**
 * Validate req.params (e.g. an :id segment) against a zod schema.
 */
export function validateParams(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: formatIssues(result.error),
      });
    }
    req.params = result.data;
    next();
  };
}
