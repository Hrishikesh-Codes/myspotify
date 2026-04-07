import { Router, Request, Response } from "express";
import axios from "axios";
import { User } from "../models/User";

const router = Router();

const SPOTIFY_SCOPES = [
  "user-read-recently-played",
  "user-top-read",
  "user-read-private",
  "user-read-email",
  "user-library-read",
  "playlist-read-private",
  "user-read-playback-state",
  "streaming",
].join(" ");

const IS_PROD = process.env.NODE_ENV === "production";
// In production, frontend is served from the same Express server, so redirect to "/".
// In development, frontend runs on a separate Vite dev server.
const FRONTEND_URL = IS_PROD ? "/" : (process.env.FRONTEND_URL ?? "http://localhost:5173");

// GET /api/auth/login — redirects to Spotify OAuth page
router.get("/login", (_req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    scope: SPOTIFY_SCOPES,
    show_dialog: "false",
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

// GET /api/auth/callback — exchanges code for tokens, upserts user, sets session
router.get("/callback", async (req: Request, res: Response) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${FRONTEND_URL}?error=access_denied`);
  }

  try {
    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    // Exchange authorization code for tokens
    const tokenRes = await axios.post<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    const { access_token, refresh_token } = tokenRes.data;

    // Fetch Spotify user profile
    const profileRes = await axios.get<{
      id: string;
      display_name?: string;
      email?: string;
      images?: { url: string }[];
    }>("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profile = profileRes.data;

    // Upsert user in MongoDB
    const user = await User.findOneAndUpdate(
      { spotifyId: profile.id },
      {
        spotifyId: profile.id,
        displayName: profile.display_name ?? profile.id,
        email: profile.email ?? "",
        profileImage: profile.images?.[0]?.url ?? "",
        accessToken: access_token,
        refreshToken: refresh_token,
        lastLogin: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Persist session
    req.session.userId = user._id.toString();
    await new Promise<void>((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve()))
    );

    console.log("[auth] session saved OK, id:", req.session.id, "userId:", req.session.userId);
    console.log("[auth] redirecting to FRONTEND_URL:", FRONTEND_URL);
    res.redirect(FRONTEND_URL);
  } catch (err) {
    console.error("[auth] OAuth callback error:", err);
    res.redirect(`${FRONTEND_URL}?error=auth_failed`);
  }
});

// GET /api/auth/refresh — refreshes the Spotify access token
router.get("/refresh", async (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const user = await User.findById(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  try {
    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const tokenRes = await axios.post<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    }>(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: user.refreshToken,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    user.accessToken = tokenRes.data.access_token;
    if (tokenRes.data.refresh_token) {
      user.refreshToken = tokenRes.data.refresh_token;
    }
    await user.save();

    res.json({
      accessToken: tokenRes.data.access_token,
      expiresIn: tokenRes.data.expires_in,
    });
  } catch (err) {
    console.error("Token refresh error:", err);
    res.status(500).json({ error: "Failed to refresh token" });
  }
});

// GET /api/auth/me — returns current user's profile
router.get("/me", async (req: Request, res: Response) => {
  console.log("[auth/me] session id:", req.session.id, "userId:", req.session.userId, "secure:", req.secure, "cookie:", req.headers.cookie?.slice(0, 80));
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const user = await User.findById(req.session.userId).select(
    "spotifyId displayName email profileImage lastLogin"
  );
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "User not found" });
  }

  res.json({
    spotifyId: user.spotifyId,
    displayName: user.displayName,
    email: user.email,
    profileImage: user.profileImage,
    lastLogin: user.lastLogin,
  });
});

// GET /api/auth/logout — destroys session
router.get("/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) console.error("Session destroy error:", err);
    res.json({ success: true });
  });
});

export default router;
