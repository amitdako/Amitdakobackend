import rateLimit from "express-rate-limit";

/**
 * Brute-force / credential-stuffing protection for the login route.
 *
 * Limits each client IP to a small number of attempts per window. Successful
 * logins don't count against the limit, so legitimate users are not penalised.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // max 5 failed attempts per IP per window
  skipSuccessfulRequests: true,
  standardHeaders: true, // expose RateLimit-* headers
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});
