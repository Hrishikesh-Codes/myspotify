import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { spotifyFetch } from "../lib/spotifyFetch";
import { CachedTopTracks, ITrackItem } from "../models/CachedTopTracks";
import { CachedTopArtists, IArtistItem } from "../models/CachedTopArtists";
import { CachedRecentlyPlayed, IPlayedTrack } from "../models/CachedRecentlyPlayed";
import { TrackAudioFeatures, IAudioFeatures } from "../models/TrackAudioFeatures";
import { CachedPlaylists, IPlaylistItem } from "../models/CachedPlaylists";

const router = Router();

// All /api/me routes require an authenticated session
router.use(requireAuth);

const ONE_HOUR = 60 * 60 * 1000;
const FIFTEEN_MIN = 15 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TimeRange = "short_term" | "medium_term" | "long_term";

function isValidTimeRange(v: unknown): v is TimeRange {
  return v === "short_term" || v === "medium_term" || v === "long_term";
}

/** Map a raw Spotify track object to our normalised shape. */
function normaliseTrack(t: SpotifyTrack): ITrackItem {
  return {
    id: t.id,
    name: t.name,
    artists: t.artists.map((a) => ({ id: a.id, name: a.name })),
    albumName: t.album.name,
    albumArt: t.album.images?.[0]?.url ?? "",
    durationMs: t.duration_ms,
    previewUrl: t.preview_url ?? null,
    popularity: t.popularity ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Spotify response shapes (minimal — only what we use)
// ---------------------------------------------------------------------------

interface SpotifyArtistRef { id: string; name: string }
interface SpotifyImage { url: string; width: number; height: number }

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtistRef[];
  album: { name: string; images: SpotifyImage[] };
  duration_ms: number;
  preview_url?: string | null;
  popularity?: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  images: SpotifyImage[];
  genres: string[];
  popularity: number;
  followers: { total: number };
}

interface SpotifyPlaylistItem {
  id: string;
  name: string;
  description: string | null;
  images: SpotifyImage[];
  tracks: { total: number };
  public: boolean | null;
  collaborative: boolean;
}

interface SpotifyAudioFeature {
  id: string;
  danceability: number;
  energy: number;
  valence: number;
  tempo: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  liveness: number;
  loudness: number;
  key: number;
  mode: number;
  time_signature: number;
}

// ---------------------------------------------------------------------------
// GET /api/me/top-tracks?time_range=medium_term&limit=50
// ---------------------------------------------------------------------------

router.get("/top-tracks", async (req: Request, res: Response) => {
  const user = req.user!;
  const timeRange = isValidTimeRange(req.query.time_range)
    ? req.query.time_range
    : "medium_term";
  const limit = Math.min(Number(req.query.limit) || 50, 50);

  try {
    // Cache check
    const cached = await CachedTopTracks.findOne({
      userId: user._id.toString(),
      timeRange,
      expiresAt: { $gt: new Date() },
    });

    if (cached) {
      return res.json({ items: cached.tracks, timeRange, total: cached.tracks.length });
    }

    // Fetch from Spotify
    const response = await spotifyFetch<{ items: SpotifyTrack[] }>(user, {
      url: `https://api.spotify.com/v1/me/top/tracks`,
      params: { time_range: timeRange, limit },
    });

    const tracks: ITrackItem[] = response.data.items.map(normaliseTrack);
    const now = new Date();

    await CachedTopTracks.findOneAndUpdate(
      { userId: user._id.toString(), timeRange },
      { userId: user._id.toString(), timeRange, tracks, fetchedAt: now, expiresAt: new Date(now.getTime() + ONE_HOUR) },
      { upsert: true }
    );

    res.json({ items: tracks, timeRange, total: tracks.length });
  } catch (err) {
    console.error("top-tracks error:", err);
    res.status(502).json({ error: "Failed to fetch top tracks from Spotify" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/me/top-artists?time_range=medium_term&limit=50
// ---------------------------------------------------------------------------

router.get("/top-artists", async (req: Request, res: Response) => {
  const user = req.user!;
  const timeRange = isValidTimeRange(req.query.time_range)
    ? req.query.time_range
    : "medium_term";
  const limit = Math.min(Number(req.query.limit) || 50, 50);

  try {
    const cached = await CachedTopArtists.findOne({
      userId: user._id.toString(),
      timeRange,
      expiresAt: { $gt: new Date() },
    });

    if (cached) {
      return res.json({ items: cached.artists, timeRange, total: cached.artists.length });
    }

    const response = await spotifyFetch<{ items: SpotifyArtist[] }>(user, {
      url: `https://api.spotify.com/v1/me/top/artists`,
      params: { time_range: timeRange, limit },
    });

    const artists: IArtistItem[] = response.data.items.map((a) => ({
      id: a.id,
      name: a.name,
      images: a.images,
      genres: a.genres,
      popularity: a.popularity,
      followers: a.followers.total,
    }));

    const now = new Date();

    await CachedTopArtists.findOneAndUpdate(
      { userId: user._id.toString(), timeRange },
      { userId: user._id.toString(), timeRange, artists, fetchedAt: now, expiresAt: new Date(now.getTime() + ONE_HOUR) },
      { upsert: true }
    );

    res.json({ items: artists, timeRange, total: artists.length });
  } catch (err) {
    console.error("top-artists error:", err);
    res.status(502).json({ error: "Failed to fetch top artists from Spotify" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/me/recently-played?limit=50
// ---------------------------------------------------------------------------

router.get("/recently-played", async (req: Request, res: Response) => {
  const user = req.user!;
  const limit = Math.min(Number(req.query.limit) || 50, 50);

  try {
    const cached = await CachedRecentlyPlayed.findOne({
      userId: user._id.toString(),
      expiresAt: { $gt: new Date() },
    });

    if (cached) {
      return res.json({ items: cached.tracks, total: cached.tracks.length });
    }

    const response = await spotifyFetch<{
      items: { track: SpotifyTrack; played_at: string }[];
    }>(user, {
      url: `https://api.spotify.com/v1/me/player/recently-played`,
      params: { limit },
    });

    const tracks: IPlayedTrack[] = response.data.items.map((item) => ({
      track: normaliseTrack(item.track),
      playedAt: item.played_at,
    }));

    const now = new Date();

    await CachedRecentlyPlayed.findOneAndUpdate(
      { userId: user._id.toString() },
      { userId: user._id.toString(), tracks, fetchedAt: now, expiresAt: new Date(now.getTime() + FIFTEEN_MIN) },
      { upsert: true }
    );

    res.json({ items: tracks, total: tracks.length });
  } catch (err) {
    console.error("recently-played error:", err);
    res.status(502).json({ error: "Failed to fetch recently played from Spotify" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/me/audio-features?ids=id1,id2,...
// ---------------------------------------------------------------------------

router.get("/audio-features", async (req: Request, res: Response) => {
  const user = req.user!;
  const rawIds = req.query.ids as string | undefined;

  if (!rawIds) {
    return res.status(400).json({ error: "Query parameter 'ids' is required (comma-separated track IDs)" });
  }

  const requestedIds = [...new Set(rawIds.split(",").map((s) => s.trim()).filter(Boolean))];

  if (requestedIds.length === 0) {
    return res.status(400).json({ error: "No valid track IDs provided" });
  }

  try {
    // Load whatever we already have cached
    const cached = await TrackAudioFeatures.find({ trackId: { $in: requestedIds } });
    const cachedMap = new Map(cached.map((c) => [c.trackId, c.features]));

    const missing = requestedIds.filter((id) => !cachedMap.has(id));

    // Batch-fetch missing tracks in chunks of 100 (Spotify limit)
    if (missing.length > 0) {
      const chunks: string[][] = [];
      for (let i = 0; i < missing.length; i += 100) {
        chunks.push(missing.slice(i, i + 100));
      }

      for (const chunk of chunks) {
        const response = await spotifyFetch<{ audio_features: (SpotifyAudioFeature | null)[] }>(user, {
          url: `https://api.spotify.com/v1/audio-features`,
          params: { ids: chunk.join(",") },
        });

        const toInsert = response.data.audio_features
          .filter((f): f is SpotifyAudioFeature => f !== null)
          .map((f) => {
            const features: IAudioFeatures = {
              danceability: f.danceability,
              energy: f.energy,
              valence: f.valence,
              tempo: f.tempo,
              acousticness: f.acousticness,
              instrumentalness: f.instrumentalness,
              speechiness: f.speechiness,
              liveness: f.liveness,
              loudness: f.loudness,
              key: f.key,
              mode: f.mode,
              timeSignature: f.time_signature,
            };
            cachedMap.set(f.id, features);
            return { trackId: f.id, features, fetchedAt: new Date() };
          });

        // Upsert each newly fetched feature permanently (audio features never change)
        await Promise.all(
          toInsert.map((doc) =>
            TrackAudioFeatures.findOneAndUpdate(
              { trackId: doc.trackId },
              doc,
              { upsert: true }
            )
          )
        );
      }
    }

    // Build response in requested order
    const features = requestedIds.map((id) => ({
      trackId: id,
      features: cachedMap.get(id) ?? null,
    }));

    // Compute averages over tracks that have features
    const valid = features.filter((f) => f.features !== null).map((f) => f.features as IAudioFeatures);
    const avg = (key: keyof IAudioFeatures) =>
      valid.length ? valid.reduce((sum, f) => sum + f[key], 0) / valid.length : 0;

    const averages: IAudioFeatures = {
      danceability: avg("danceability"),
      energy: avg("energy"),
      valence: avg("valence"),
      tempo: avg("tempo"),
      acousticness: avg("acousticness"),
      instrumentalness: avg("instrumentalness"),
      speechiness: avg("speechiness"),
      liveness: avg("liveness"),
      loudness: avg("loudness"),
      key: avg("key"),
      mode: avg("mode"),
      timeSignature: avg("timeSignature"),
    };

    res.json({ features, averages });
  } catch (err) {
    console.error("audio-features error:", err);
    res.status(502).json({ error: "Failed to fetch audio features from Spotify" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/me/playlists?limit=50
// ---------------------------------------------------------------------------

router.get("/playlists", async (req: Request, res: Response) => {
  const user = req.user!;
  const limit = Math.min(Number(req.query.limit) || 50, 50);

  try {
    const cached = await CachedPlaylists.findOne({
      userId: user._id.toString(),
      expiresAt: { $gt: new Date() },
    });

    if (cached) {
      return res.json({ items: cached.playlists, total: cached.playlists.length });
    }

    const response = await spotifyFetch<{ items: SpotifyPlaylistItem[] }>(user, {
      url: `https://api.spotify.com/v1/me/playlists`,
      params: { limit },
    });

    const playlists: IPlaylistItem[] = response.data.items.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      coverImage: p.images?.[0]?.url ?? "",
      tracksTotal: p.tracks.total,
      public: p.public ?? false,
      collaborative: p.collaborative,
    }));

    const now = new Date();

    await CachedPlaylists.findOneAndUpdate(
      { userId: user._id.toString() },
      { userId: user._id.toString(), playlists, fetchedAt: now, expiresAt: new Date(now.getTime() + ONE_HOUR) },
      { upsert: true }
    );

    res.json({ items: playlists, total: playlists.length });
  } catch (err) {
    console.error("playlists error:", err);
    res.status(502).json({ error: "Failed to fetch playlists from Spotify" });
  }
});

export default router;
