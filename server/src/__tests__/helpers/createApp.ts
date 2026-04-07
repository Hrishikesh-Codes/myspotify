/**
 * Creates a minimal Express app for testing — no MongoDB connection,
 * MemoryStore session (no MongoStore dependency), all routes mounted.
 */
import express from "express";
import session from "express-session";
import authRoutes from "../../routes/auth";
import meRoutes from "../../routes/me";
import searchRoutes from "../../routes/search";

/** Build a fresh test app instance. */
export function createApp() {
  const app = express();

  app.use(express.json());

  // In-memory session store — no MongoDB needed for tests
  app.use(
    session({
      secret: "test-secret",
      resave: false,
      saveUninitialized: false,
    })
  );

  app.use("/api/auth", authRoutes);
  app.use("/api/me", meRoutes);
  app.use("/api/search", searchRoutes);

  // Generic 404
  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  return app;
}
