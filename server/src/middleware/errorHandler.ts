import { Request, Response, NextFunction } from "express";
import { HttpError } from "../errors";

/** 404 for any route that didn't match. */
export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}

/**
 * Global error handler. Must keep all four args so Express treats it as an
 * error handler.
 *
 * - Known operational errors (HttpError) return their (developer-authored,
 *   safe) message with the right status code.
 * - Everything else is logged server-side ONLY and returned as a generic 500.
 *   We never send stack traces, DB errors, or internal messages to the client.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) {
    return _next(err);
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  // Unexpected error: log full detail for us, reveal nothing to the client.
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
}
