import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { spotifyFetch } from "../lib/spotifyFetch";

const router = Router();

router.use(requireAuth);

// GET /api/search?q=query&type=track,artist,album&limit=20
router.get("/", async (req: Request, res: Response) => {
  const user = req.user!;
  const { q, type = "track,artist,album", limit = "20" } = req.query;

  if (!q || typeof q !== "string" || q.trim() === "") {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    const response = await spotifyFetch<{
      tracks?: { items: unknown[] };
      artists?: { items: unknown[] };
      albums?: { items: unknown[] };
    }>(user, {
      url: `https://api.spotify.com/v1/search`,
      params: {
        q: q.trim(),
        type,
        limit: Math.min(Number(limit) || 20, 50),
        market: "from_token",
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error("search error:", err);
    res.status(502).json({ error: "Failed to search Spotify" });
  }
});

export default router;
