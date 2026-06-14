import express from "express";
import helmet from "helmet";
import cors from "cors";
import { config } from "./config";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth";
import { eventsRouter } from "./routes/events";
import { usersRouter } from "./routes/users";

const app = express();

// Security headers (CSP, HSTS, X-Content-Type-Options, etc.).
app.use(helmet());

// Strict CORS: allow ONLY our Vite frontend origin. No wildcard.
app.use(
  cors({
    origin: config.FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parse JSON bodies, but cap the size to blunt resource-exhaustion (DoS) via
// huge payloads.
app.use(express.json({ limit: "100kb" }));

// Liveness probe (unauthenticated on purpose).
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// API routers.
app.use("/api/auth", authRouter);
app.use("/api/events", eventsRouter);
app.use("/api/users", usersRouter);

// Unmatched routes → 404, then the global error handler (must be last).
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.PORT, () => {
  console.log(`PenguWave API listening on http://localhost:${config.PORT}`);
});
