import "dotenv/config";
import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import MongoStore from "connect-mongo";
import { connectDB } from "./db";
import authRoutes from "./routes/auth";
import meRoutes from "./routes/me";
import searchRoutes from "./routes/search";
import itemRoutes from "./routes/items";

const app = express();
const PORT = process.env.PORT ?? 5000;
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/myspotify";
const IS_PROD = process.env.NODE_ENV === "production";

// Trust Render's reverse proxy so req.secure is correct and secure cookies are sent
app.set("trust proxy", 1);

// ── Debug: log every incoming request so we can trace the OAuth flow ──
app.use((req, _res, next) => {
  console.log(`[req] ${req.method} ${req.originalUrl}`);
  next();
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));

// CORS only needed in dev (different ports); in prod the client is served from same origin
if (!IS_PROD) {
  const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
  app.use(cors({ origin: FRONTEND_URL, credentials: true }));
}

app.use(express.json());

// Session — stored in MongoDB via connect-mongo
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "myspotify-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGODB_URI,
      collectionName: "sessions",
      ttl: 60 * 60 * 24 * 7, // 7 days
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: IS_PROD,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/me", meRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/item", itemRoutes);

// Health check + diagnostics
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/debug", (_req, res) => {
  res.json({
    env: {
      NODE_ENV: process.env.NODE_ENV,
      HAS_CLIENT_ID: !!process.env.SPOTIFY_CLIENT_ID,
      HAS_CLIENT_SECRET: !!process.env.SPOTIFY_CLIENT_SECRET,
      REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI,
      VITE_API_URL: process.env.VITE_API_URL ?? "(not set)",
    },
    timestamp: new Date().toISOString(),
  });
});

// Serve React app in production
if (IS_PROD) {
  const staticDir = path.join(__dirname, "public");
  app.use(express.static(staticDir));
  // SPA fallback — send index.html for all non-API routes
  app.get("*", (req, res) => {
    console.log(`[SPA catch-all] serving index.html for: ${req.originalUrl}`);
    res.sendFile(path.join(staticDir, "index.html"));
  });
} else {
  // 404 handler for dev (API only)
  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
  });
}

// Start server
async function start() {
  await connectDB(MONGODB_URI);
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
