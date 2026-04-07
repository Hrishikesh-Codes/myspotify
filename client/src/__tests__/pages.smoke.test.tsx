/**
 * Smoke tests — every stats page and the Login page must render without
 * crashing given mocked API data and contexts.
 *
 * These tests deliberately avoid asserting on specific text so they remain
 * robust against UI copy changes; they only verify no unhandled exceptions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "@/contexts/AuthContext";
import { PlayerContext } from "@/contexts/PlayerContext";
import type { AuthUser } from "@/contexts/AuthContext";
import type { TrackItem } from "@/types/api";

// ── Silence recharts ResizeObserver errors in jsdom ───────────────────────────
(globalThis as typeof globalThis & { ResizeObserver: unknown }).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ── Mock API calls so no real fetch happens ────────────────────────────────────

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      recentlyPlayed: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      topTracks: vi.fn().mockResolvedValue({ items: [], timeRange: "medium_term", total: 0 }),
      topArtists: vi.fn().mockResolvedValue({ items: [], timeRange: "medium_term", total: 0 }),
      audioFeatures: vi.fn().mockResolvedValue({ features: [], averages: {} }),
      playlists: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      search: vi.fn().mockResolvedValue(null),
    },
  };
});

// ── Stub context values ────────────────────────────────────────────────────────

const AUTH_USER: AuthUser = {
  spotifyId: "id",
  displayName: "Dev User",
  email: "dev@example.com",
  profileImage: "",
  lastLogin: "2024-01-01T00:00:00Z",
};

const AUTH_CTX = {
  user: AUTH_USER,
  loading: false,
  logout: vi.fn(),
  refresh: vi.fn(),
};

const PLAYER_CTX = {
  currentTrack: null as TrackItem | null,
  queue: [] as TrackItem[],
  queueIndex: 0,
  isPlaying: false,
  progress: 0,
  currentTime: 0,
  duration: 0,
  volume: 75,
  play: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  seek: vi.fn(),
  setVolume: vi.fn(),
  skipNext: vi.fn(),
  skipPrev: vi.fn(),
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={AUTH_CTX}>
      <PlayerContext.Provider value={PLAYER_CTX}>
        <MemoryRouter>{children}</MemoryRouter>
      </PlayerContext.Provider>
    </AuthContext.Provider>
  );
}

// ── Page imports ──────────────────────────────────────────────────────────────

import Login from "@/pages/Login";
import MoodTrends from "@/pages/stats/MoodTrends";
import ListeningPatterns from "@/pages/stats/ListeningPatterns";
import TasteProfile from "@/pages/stats/TasteProfile";

beforeEach(() => vi.clearAllMocks());

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Page smoke tests", () => {
  it("Login page renders without crashing", () => {
    // Login has its own auth redirect logic; render with unauthenticated ctx
    const unauthCtx = { ...AUTH_CTX, user: null };
    const { container } = render(
      <AuthContext.Provider value={unauthCtx}>
        <PlayerContext.Provider value={PLAYER_CTX}>
          <MemoryRouter>
            <Login />
          </MemoryRouter>
        </PlayerContext.Provider>
      </AuthContext.Provider>
    );
    expect(container).toBeTruthy();
  });

  it("MoodTrends page renders without crashing", () => {
    const { container } = render(
      <Wrapper>
        <MoodTrends />
      </Wrapper>
    );
    expect(container).toBeTruthy();
  });

  it("ListeningPatterns page renders without crashing", () => {
    const { container } = render(
      <Wrapper>
        <ListeningPatterns />
      </Wrapper>
    );
    expect(container).toBeTruthy();
  });

  it("TasteProfile page renders without crashing", () => {
    const { container } = render(
      <Wrapper>
        <TasteProfile />
      </Wrapper>
    );
    expect(container).toBeTruthy();
  });

  it("MoodTrends shows loading skeleton initially", () => {
    const { container } = render(
      <Wrapper>
        <MoodTrends />
      </Wrapper>
    );
    // Skeleton divs are present before data loads (component starts with loading=true)
    expect(container.querySelector(".skeleton")).toBeInTheDocument();
  });

  it("ListeningPatterns shows loading skeleton initially", () => {
    const { container } = render(
      <Wrapper>
        <ListeningPatterns />
      </Wrapper>
    );
    expect(container.querySelector(".skeleton")).toBeInTheDocument();
  });

  it("TasteProfile shows loading skeleton initially", () => {
    const { container } = render(
      <Wrapper>
        <TasteProfile />
      </Wrapper>
    );
    expect(container.querySelector(".skeleton")).toBeInTheDocument();
  });
});
