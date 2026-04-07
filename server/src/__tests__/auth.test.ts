/**
 * Tests for GET /api/auth/* routes.
 *
 * Mongoose models and axios are mocked so tests run without a real
 * MongoDB instance or Spotify API credentials.
 */

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

jest.mock("../models/User");
jest.mock("axios");

import request from "supertest";
import axios from "axios";
import { createApp } from "./helpers/createApp";
import { User } from "../models/User";

const mockedAxios = axios as jest.Mocked<typeof axios>;

// ── Fixtures ───────────────────────────────────────────────────────────────────

const MOCK_USER = {
  _id: "user123",
  spotifyId: "spotify_abc",
  displayName: "Test User",
  email: "test@example.com",
  profileImage: "https://example.com/pic.jpg",
  accessToken: "access_token_123",
  refreshToken: "refresh_token_456",
  lastLogin: new Date("2024-01-01"),
  save: jest.fn().mockResolvedValue(undefined),
};

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  process.env.SPOTIFY_CLIENT_ID = "test_client_id";
  process.env.SPOTIFY_CLIENT_SECRET = "test_client_secret";
  process.env.SPOTIFY_REDIRECT_URI = "http://localhost:5000/api/auth/callback";
  process.env.FRONTEND_URL = "http://localhost:5173";
});

// ── GET /api/auth/callback ─────────────────────────────────────────────────────

describe("GET /api/auth/callback", () => {
  it("redirects to /?error=access_denied when code is missing", async () => {
    const app = createApp();
    const res = await request(app).get("/api/auth/callback");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("error=access_denied");
  });

  it("redirects to /?error=access_denied when Spotify returns error param", async () => {
    const app = createApp();
    const res = await request(app).get(
      "/api/auth/callback?error=access_denied"
    );
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("error=access_denied");
  });

  it("exchanges code for tokens and redirects to frontend on success", async () => {
    // Mock token exchange
    mockedAxios.post = jest.fn().mockResolvedValueOnce({
      data: {
        access_token: "new_access",
        refresh_token: "new_refresh",
        expires_in: 3600,
      },
    });

    // Mock profile fetch
    mockedAxios.get = jest.fn().mockResolvedValueOnce({
      data: {
        id: "spotify_abc",
        display_name: "Test User",
        email: "test@example.com",
        images: [{ url: "https://example.com/pic.jpg" }],
      },
    });

    // Mock DB upsert
    (User.findOneAndUpdate as jest.Mock).mockResolvedValueOnce({
      ...MOCK_USER,
      _id: { toString: () => "user123" },
    });

    const app = createApp();
    const res = await request(app).get("/api/auth/callback?code=valid_auth_code");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("http://localhost:5173");
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "https://accounts.spotify.com/api/token",
      expect.any(URLSearchParams),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/x-www-form-urlencoded",
        }),
      })
    );
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { spotifyId: "spotify_abc" },
      expect.objectContaining({
        accessToken: "new_access",
        refreshToken: "new_refresh",
      }),
      expect.any(Object)
    );
  });

  it("redirects to /?error=auth_failed when token exchange throws", async () => {
    mockedAxios.post = jest.fn().mockRejectedValueOnce(new Error("Network error"));

    const app = createApp();
    const res = await request(app).get("/api/auth/callback?code=bad_code");

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("error=auth_failed");
  });
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────────

describe("GET /api/auth/me", () => {
  it("returns 401 when no session exists", async () => {
    const app = createApp();
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "Not authenticated");
  });

  it("returns user profile when session is valid", async () => {
    // Mock User.findById
    (User.findById as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockResolvedValueOnce({
        spotifyId: "spotify_abc",
        displayName: "Test User",
        email: "test@example.com",
        profileImage: "https://example.com/pic.jpg",
        lastLogin: new Date("2024-01-01"),
      }),
    });

    // Mock the token exchange to set up a session
    mockedAxios.post = jest.fn().mockResolvedValueOnce({
      data: {
        access_token: "new_access",
        refresh_token: "new_refresh",
        expires_in: 3600,
      },
    });
    mockedAxios.get = jest.fn().mockResolvedValueOnce({
      data: {
        id: "spotify_abc",
        display_name: "Test User",
        email: "test@example.com",
        images: [],
      },
    });
    (User.findOneAndUpdate as jest.Mock).mockResolvedValueOnce({
      ...MOCK_USER,
      _id: { toString: () => "user123" },
    });

    const agent = request.agent(createApp());
    await agent.get("/api/auth/callback?code=valid_code");

    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("spotifyId", "spotify_abc");
    expect(res.body).toHaveProperty("displayName", "Test User");
    expect(res.body).toHaveProperty("email", "test@example.com");
  });

  it("returns 401 and destroys session when user not found in DB", async () => {
    (User.findById as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockResolvedValueOnce(null),
    });

    // Set up a session first
    mockedAxios.post = jest.fn().mockResolvedValueOnce({
      data: { access_token: "t", refresh_token: "r", expires_in: 3600 },
    });
    mockedAxios.get = jest.fn().mockResolvedValueOnce({
      data: { id: "s", display_name: "u", email: "e@e.com", images: [] },
    });
    (User.findOneAndUpdate as jest.Mock).mockResolvedValueOnce({
      ...MOCK_USER,
      _id: { toString: () => "user999" },
    });

    const agent = request.agent(createApp());
    await agent.get("/api/auth/callback?code=code");

    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

// ── GET /api/auth/refresh ──────────────────────────────────────────────────────

describe("GET /api/auth/refresh", () => {
  it("returns 401 when not authenticated", async () => {
    const app = createApp();
    const res = await request(app).get("/api/auth/refresh");
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "Not authenticated");
  });

  it("returns 401 when user no longer exists in DB", async () => {
    (User.findById as jest.Mock).mockResolvedValueOnce(null);

    // Build session first
    mockedAxios.post = jest.fn().mockResolvedValueOnce({
      data: { access_token: "t", refresh_token: "r", expires_in: 3600 },
    });
    mockedAxios.get = jest.fn().mockResolvedValueOnce({
      data: { id: "s", display_name: "u", email: "e@e.com", images: [] },
    });
    (User.findOneAndUpdate as jest.Mock).mockResolvedValueOnce({
      ...MOCK_USER,
      _id: { toString: () => "user123" },
    });

    const agent = request.agent(createApp());
    await agent.get("/api/auth/callback?code=code");

    const res = await agent.get("/api/auth/refresh");
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "User not found");
  });

  it("refreshes token and returns new accessToken when authenticated", async () => {
    // Session setup mocks
    mockedAxios.post = jest
      .fn()
      .mockResolvedValueOnce({
        data: { access_token: "old_access", refresh_token: "old_refresh", expires_in: 3600 },
      })
      // Token refresh call
      .mockResolvedValueOnce({
        data: { access_token: "new_access_token", expires_in: 3600 },
      });
    mockedAxios.get = jest.fn().mockResolvedValueOnce({
      data: { id: "spotify_abc", display_name: "Test User", email: "t@t.com", images: [] },
    });
    (User.findOneAndUpdate as jest.Mock).mockResolvedValueOnce({
      ...MOCK_USER,
      _id: { toString: () => "user123" },
    });
    (User.findById as jest.Mock).mockResolvedValueOnce({
      ...MOCK_USER,
      save: jest.fn().mockResolvedValue(undefined),
    });

    const agent = request.agent(createApp());
    await agent.get("/api/auth/callback?code=valid_code");

    const res = await agent.get("/api/auth/refresh");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken", "new_access_token");
    expect(res.body).toHaveProperty("expiresIn", 3600);
  });

  it("returns 500 when Spotify token refresh fails", async () => {
    // Session setup mocks
    mockedAxios.post = jest
      .fn()
      .mockResolvedValueOnce({
        data: { access_token: "old", refresh_token: "old_r", expires_in: 3600 },
      })
      .mockRejectedValueOnce(new Error("Spotify down"));
    mockedAxios.get = jest.fn().mockResolvedValueOnce({
      data: { id: "spotify_abc", display_name: "Test", email: "t@t.com", images: [] },
    });
    (User.findOneAndUpdate as jest.Mock).mockResolvedValueOnce({
      ...MOCK_USER,
      _id: { toString: () => "user123" },
    });
    (User.findById as jest.Mock).mockResolvedValueOnce({
      ...MOCK_USER,
      save: jest.fn(),
    });

    const agent = request.agent(createApp());
    await agent.get("/api/auth/callback?code=code");

    const res = await agent.get("/api/auth/refresh");
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error", "Failed to refresh token");
  });
});

// ── GET /api/auth/logout ───────────────────────────────────────────────────────

describe("GET /api/auth/logout", () => {
  it("destroys session and returns success", async () => {
    const app = createApp();
    const res = await request(app).get("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });
});
