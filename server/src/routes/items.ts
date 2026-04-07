import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { spotifyFetch } from "../lib/spotifyFetch";

const router = Router();
router.use(requireAuth);

// GET /api/item/track/:id
router.get("/track/:id", async (req: Request, res: Response) => {
  try {
    const response = await spotifyFetch<unknown>(req.user!, {
      url: `https://api.spotify.com/v1/tracks/${req.params.id}`,
    });
    res.json(response.data);
  } catch {
    res.status(502).json({ error: "Failed to fetch track" });
  }
});

// GET /api/item/artist/:id — artist info + top tracks
router.get("/artist/:id", async (req: Request, res: Response) => {
  try {
    const [artistRes, topTracksRes] = await Promise.all([
      spotifyFetch<unknown>(req.user!, {
        url: `https://api.spotify.com/v1/artists/${req.params.id}`,
      }),
      spotifyFetch<unknown>(req.user!, {
        url: `https://api.spotify.com/v1/artists/${req.params.id}/top-tracks`,
        params: { market: "from_token" },
      }),
    ]);
    res.json({ artist: artistRes.data, topTracks: topTracksRes.data });
  } catch {
    res.status(502).json({ error: "Failed to fetch artist" });
  }
});

// GET /api/item/album/:id
router.get("/album/:id", async (req: Request, res: Response) => {
  try {
    const response = await spotifyFetch<unknown>(req.user!, {
      url: `https://api.spotify.com/v1/albums/${req.params.id}`,
    });
    res.json(response.data);
  } catch {
    res.status(502).json({ error: "Failed to fetch album" });
  }
});

export default router;
