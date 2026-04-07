/**
 * Tests for GET /api/me/* routes.
 *
 * requireAuth and spotifyFetch are mocked so tests exercise only the
 * caching logic and response shaping — no real DB or Spotify calls.
 */

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

jest.mock("../middleware/requireAuth");
jest.mock("../lib/spotifyFetch");
jest.mock("../models/CachedTopTracks");
jest.mock("../models/CachedTopArtists");
jest.mock("../models/CachedRecentlyPlayed");
jest.mock("../models/TrackAudioFeatures");
jest.mock("../models/CachedPlaylists");

import request from "supertest";
import { createApp } from "./helpers/createApp";
import { requireAuth } from "../middleware/requireAuth";
import { spotifyFetch } from "../lib/spotifyFetch";
import { CachedTopTracks } from "../models/CachedTopTracks";
import { CachedRecentlyPlayed } from "../models/CachedRecentlyPlayed";
import { TrackAudioFeatures } from "../models/TrackAudioFeatures";

// ── Fixtures ───────────────────────────────────────────────────────────────────

const MOCK_USER = {
  _id: "user123",
  spotifyId: "spotify_abc",
  displayName: "Test User",
  email: "test@example.com",
  accessToken: "access_token_123",
  refreshToken: "refresh_token_456",
};

const MOCK_TRACK = {
  id: "track1",
  name: "Song One",
  artists: [{ id: "artist1", name: "Artist One" }],
  albumName: "Album One",
  albumArt: "https://example.com/art.jpg",
  durationMs: 210000,
  previewUrl: null,
  popularity: 80,
};

const MOCK_AUDIO_FEATURES = {
  danceability: 0.7,
  energy: 0.85,
  valence: 0.6,
  tempo: 120,
  acousticness: 0.1,
  instrumentalness: 0.0,
  speechiness: 0.05,
  liveness: 0.12,
  loudness: -5.0,
  key: 5,
  mode: 1,
  timeSignature: 4,
};

// Inject MOCK_USER on every request (simulate authenticated session)
beforeEach(() => {
  jest.clearAllMocks();
  (requireAuth as jest.Mock).mockImplementation((req, _res, next) => {
    req.user = MOCK_USER;
    next();
  });
});

// ── GET /api/me/top-tracks ─────────────────────────────────────────────────────

describe("GET /api/me/top-tracks", () => {
  it("returns 401 when requireAuth rejects (no session)", async () => {
    (requireAuth as jest.Mock).mockImplementationOnce((_req, res) => {
      res.status(401).json({ error: "Not authenticated" });
    });
    const app = createApp();
    const res = await request(app).get("/api/me/top-tracks");
    expect(res.status).toBe(401);
  });

  it("returns cached data when cache is fresh", async () => {
    (CachedTopTracks.findOne as jest.Mock).mockResolvedValueOnce({
      tracks: [MOCK_TRACK],
      timeRange: "medium_term",
    });

    const app = createApp();
    const res = await request(app).get("/api/me/top-tracks?time_range=medium_term");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].name).toBe("Song One");
    expect(res.body.timeRange).toBe("medium_term");
    // Should NOT call Spotify when cache is valid
    expect(spotifyFetch).not.toHaveBeenCalled();
  });

  it("fetches from Spotify and saves cache when cache is expired/missing", async () => {
    // No cache hit
    (CachedTopTracks.findOne as jest.Mock).mockResolvedValueOnce(null);

    // Spotify response
    (spotifyFetch as jest.Mock).mockResolvedValueOnce({
      data: {
        items: [
          {
            id: "track2",
            name: "Song Two",
            artists: [{ id: "a2", name: "Artist Two" }],
            album: {
              name: "Album Two",
              images: [{ url: "https://example.com/art2.jpg", width: 300, height: 300 }],
            },
            duration_ms: 180000,
            preview_url: null,
            popularity: 70,
          },
        ],
      },
    });

    (CachedTopTracks.findOneAndUpdate as jest.Mock).mockResolvedValueOnce({});

    const app = createApp();
    const res = await request(app).get("/api/me/top-tracks?time_range=short_term&limit=10");

    expect(res.status).toBe(200);
    expect(res.body.items[0].name).toBe("Song Two");
    expect(res.body.timeRange).toBe("short_term");
    expect(spotifyFetch).toHaveBeenCalledWith(
      MOCK_USER,
      expect.objectContaining({ url: expect.stringContaining("top/tracks") })
    );
    expect(CachedTopTracks.findOneAndUpdate).toHaveBeenCalled();
  });

  it("falls back to medium_term for invalid time_range param", async () => {
    (CachedTopTracks.findOne as jest.Mock).mockResolvedValueOnce(null);
    (spotifyFetch as jest.Mock).mockResolvedValueOnce({ data: { items: [] } });
    (CachedTopTracks.findOneAndUpdate as jest.Mock).mockResolvedValueOnce({});

    const app = createApp();
    const res = await request(app).get("/api/me/top-tracks?time_range=all_time");

    expect(res.status).toBe(200);
    expect(res.body.timeRange).toBe("medium_term");
  });

  it("returns 502 when Spotify fetch fails", async () => {
    (CachedTopTracks.findOne as jest.Mock).mockResolvedValueOnce(null);
    (spotifyFetch as jest.Mock).mockRejectedValueOnce(new Error("Spotify error"));

    const app = createApp();
    const res = await request(app).get("/api/me/top-tracks");

    expect(res.status).toBe(502);
    expect(res.body).toHaveProperty("error");
  });
});

// ── GET /api/me/recently-played ───────────────────────────────────────────────

describe("GET /api/me/recently-played", () => {
  it("returns cached recently-played data when cache is fresh", async () => {
    (CachedRecentlyPlayed.findOne as jest.Mock).mockResolvedValueOnce({
      tracks: [{ track: MOCK_TRACK, playedAt: "2024-01-01T20:00:00Z" }],
    });

    const app = createApp();
    const res = await request(app).get("/api/me/recently-played");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].track.name).toBe("Song One");
    expect(res.body.items[0].playedAt).toBe("2024-01-01T20:00:00Z");
    expect(spotifyFetch).not.toHaveBeenCalled();
  });

  it("fetches from Spotify when cache is expired", async () => {
    (CachedRecentlyPlayed.findOne as jest.Mock).mockResolvedValueOnce(null);
    (spotifyFetch as jest.Mock).mockResolvedValueOnce({
      data: {
        items: [
          {
            track: {
              id: "track3",
              name: "Recent Track",
              artists: [{ id: "a3", name: "Artist 3" }],
              album: { name: "Album 3", images: [] },
              duration_ms: 200000,
              preview_url: null,
              popularity: 60,
            },
            played_at: "2024-01-15T18:30:00Z",
          },
        ],
      },
    });
    (CachedRecentlyPlayed.findOneAndUpdate as jest.Mock).mockResolvedValueOnce({});

    const app = createApp();
    const res = await request(app).get("/api/me/recently-played?limit=20");

    expect(res.status).toBe(200);
    expect(res.body.items[0].track.name).toBe("Recent Track");
    expect(res.body.items[0].playedAt).toBe("2024-01-15T18:30:00Z");
    expect(spotifyFetch).toHaveBeenCalledWith(
      MOCK_USER,
      expect.objectContaining({ url: expect.stringContaining("recently-played") })
    );
  });
});

// ── GET /api/me/audio-features ────────────────────────────────────────────────

describe("GET /api/me/audio-features", () => {
  it("returns 400 when ids param is missing", async () => {
    const app = createApp();
    const res = await request(app).get("/api/me/audio-features");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ids.*required/i);
  });

  it("returns 400 when ids param is empty string", async () => {
    const app = createApp();
    const res = await request(app).get("/api/me/audio-features?ids=");
    expect(res.status).toBe(400);
  });

  it("returns cached features without Spotify call when all ids are cached", async () => {
    (TrackAudioFeatures.find as jest.Mock).mockResolvedValueOnce([
      { trackId: "track1", features: MOCK_AUDIO_FEATURES },
    ]);

    const app = createApp();
    const res = await request(app).get("/api/me/audio-features?ids=track1");

    expect(res.status).toBe(200);
    expect(res.body.features).toHaveLength(1);
    expect(res.body.features[0].trackId).toBe("track1");
    expect(res.body.features[0].features.energy).toBe(0.85);
    expect(res.body.averages.energy).toBe(0.85);
    expect(spotifyFetch).not.toHaveBeenCalled();
  });

  it("fetches missing features from Spotify and caches them", async () => {
    // track1 cached, track2 missing
    (TrackAudioFeatures.find as jest.Mock).mockResolvedValueOnce([
      { trackId: "track1", features: MOCK_AUDIO_FEATURES },
    ]);

    (spotifyFetch as jest.Mock).mockResolvedValueOnce({
      data: {
        audio_features: [
          { id: "track2", ...MOCK_AUDIO_FEATURES, energy: 0.5 },
        ],
      },
    });
    (TrackAudioFeatures.findOneAndUpdate as jest.Mock).mockResolvedValue({});

    const app = createApp();
    const res = await request(app).get("/api/me/audio-features?ids=track1,track2");

    expect(res.status).toBe(200);
    expect(res.body.features).toHaveLength(2);
    expect(spotifyFetch).toHaveBeenCalledTimes(1);
    expect(TrackAudioFeatures.findOneAndUpdate).toHaveBeenCalled();
  });

  it("computes correct averages across all tracks with features", async () => {
    (TrackAudioFeatures.find as jest.Mock).mockResolvedValueOnce([
      { trackId: "t1", features: { ...MOCK_AUDIO_FEATURES, energy: 0.4 } },
      { trackId: "t2", features: { ...MOCK_AUDIO_FEATURES, energy: 0.8 } },
    ]);

    const app = createApp();
    const res = await request(app).get("/api/me/audio-features?ids=t1,t2");

    expect(res.status).toBe(200);
    expect(res.body.averages.energy).toBeCloseTo(0.6, 5);
  });

  it("returns null features for tracks not found in Spotify", async () => {
    (TrackAudioFeatures.find as jest.Mock).mockResolvedValueOnce([]);
    (spotifyFetch as jest.Mock).mockResolvedValueOnce({
      data: { audio_features: [null] }, // Spotify returns null for unknown tracks
    });

    const app = createApp();
    const res = await request(app).get("/api/me/audio-features?ids=unknown_track");

    expect(res.status).toBe(200);
    expect(res.body.features[0].features).toBeNull();
  });
});
