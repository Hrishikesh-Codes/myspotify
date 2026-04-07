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

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve React app in production
if (IS_PROD) {
  const staticDir = path.join(__dirname, "public");
  app.use(express.static(staticDir));
  // SPA fallback — send index.html for all non-API routes
  app.get("*", (_req, res) => {
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
