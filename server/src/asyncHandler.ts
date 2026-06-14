import { Request, Response, NextFunction, RequestHandler } from "express";

// Express 4 does not catch rejected promises from async handlers. This wrapper
// forwards any rejection to next() so it reaches the global error handler
// instead of crashing the process or hanging the request.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
