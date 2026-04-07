/**
 * Tests for GET /api/search.
 * requireAuth and spotifyFetch are mocked throughout.
 */

jest.mock("../middleware/requireAuth");
jest.mock("../lib/spotifyFetch");

import request from "supertest";
import { createApp } from "./helpers/createApp";
import { requireAuth } from "../middleware/requireAuth";
import { spotifyFetch } from "../lib/spotifyFetch";

const MOCK_USER = {
  _id: "user123",
  accessToken: "access_token",
  refreshToken: "refresh_token",
};

const MOCK_SEARCH_RESPONSE = {
  tracks: {
    items: [
      {
        id: "t1",
        name: "Test Song",
        artists: [{ id: "a1", name: "Test Artist" }],
        album: { id: "al1", name: "Test Album", images: [], release_date: "2023-01-01", total_tracks: 10 },
        duration_ms: 200000,
        preview_url: null,
        popularity: 75,
      },
    ],
    total: 1,
  },
  artists: { items: [], total: 0 },
  albums: { items: [], total: 0 },
};

beforeEach(() => {
  jest.clearAllMocks();
  (requireAuth as jest.Mock).mockImplementation((req, _res, next) => {
    req.user = MOCK_USER;
    next();
  });
});

// ── Authentication ─────────────────────────────────────────────────────────────

describe("GET /api/search — authentication", () => {
  it("returns 401 when user is not authenticated", async () => {
    (requireAuth as jest.Mock).mockImplementationOnce((_req, res) => {
      res.status(401).json({ error: "Not authenticated" });
    });
    const app = createApp();
    const res = await request(app).get("/api/search?q=test");
    expect(res.status).toBe(401);
  });
});

// ── Validation ─────────────────────────────────────────────────────────────────

describe("GET /api/search — validation", () => {
  it("returns 400 when q param is missing", async () => {
    const app = createApp();
    const res = await request(app).get("/api/search");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it("returns 400 when q is whitespace only", async () => {
    const app = createApp();
    const res = await request(app).get("/api/search?q=   ");
    expect(res.status).toBe(400);
  });
});

// ── Successful proxy ───────────────────────────────────────────────────────────

describe("GET /api/search — proxy to Spotify", () => {
  it("passes query to Spotify and returns the response", async () => {
    (spotifyFetch as jest.Mock).mockResolvedValueOnce({
      data: MOCK_SEARCH_RESPONSE,
    });

    const app = createApp();
    const res = await request(app).get("/api/search?q=beatles");

    expect(res.status).toBe(200);
    expect(res.body.tracks.items[0].name).toBe("Test Song");
    expect(spotifyFetch).toHaveBeenCalledWith(
      MOCK_USER,
      expect.objectContaining({
        url: "https://api.spotify.com/v1/search",
        params: expect.objectContaining({ q: "beatles" }),
      })
    );
  });

  it("trims leading/trailing whitespace from query", async () => {
    (spotifyFetch as jest.Mock).mockResolvedValueOnce({ data: MOCK_SEARCH_RESPONSE });

    const app = createApp();
    await request(app).get("/api/search?q=%20%20radiohead%20%20");

    expect(spotifyFetch).toHaveBeenCalledWith(
      MOCK_USER,
      expect.objectContaining({
        params: expect.objectContaining({ q: "radiohead" }),
      })
    );
  });

  it("respects custom type and limit params", async () => {
    (spotifyFetch as jest.Mock).mockResolvedValueOnce({ data: { tracks: { items: [], total: 0 } } });

    const app = createApp();
    await request(app).get("/api/search?q=jazz&type=track&limit=5");

    expect(spotifyFetch).toHaveBeenCalledWith(
      MOCK_USER,
      expect.objectContaining({
        params: expect.objectContaining({ type: "track", limit: 5 }),
      })
    );
  });

  it("caps limit at 50 even when a larger value is supplied", async () => {
    (spotifyFetch as jest.Mock).mockResolvedValueOnce({ data: {} });

    const app = createApp();
    await request(app).get("/api/search?q=pop&limit=999");

    const callArgs = (spotifyFetch as jest.Mock).mock.calls[0][1];
    expect(callArgs.params.limit).toBeLessThanOrEqual(50);
  });

  it("returns 502 when Spotify call fails", async () => {
    (spotifyFetch as jest.Mock).mockRejectedValueOnce(new Error("Timeout"));

    const app = createApp();
    const res = await request(app).get("/api/search?q=error");

    expect(res.status).toBe(502);
    expect(res.body).toHaveProperty("error");
  });
});
