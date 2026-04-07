/**
 * Tests for the Explore page — search input, debounce, result rendering.
 * The global `fetch` and React Router are mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Explore from "@/pages/Explore";
import { PlayerContext } from "@/contexts/PlayerContext";
import type { TrackItem } from "@/types/api";

// ── Mock API ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      search: vi.fn(),
    },
  };
});

import { api } from "@/lib/api";

// ── Player context stub ────────────────────────────────────────────────────────

function makePlayerCtx() {
  return {
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
}

const SEARCH_RESPONSE = {
  tracks: {
    items: [
      {
        id: "t1",
        name: "Come Together",
        artists: [{ id: "a1", name: "The Beatles" }],
        album: {
          id: "al1",
          name: "Abbey Road",
          images: [{ url: "https://example.com/abbey.jpg", width: 300, height: 300 }],
          release_date: "1969-09-26",
          total_tracks: 17,
        },
        duration_ms: 259000,
        preview_url: null,
        popularity: 88,
      },
      {
        id: "t2",
        name: "Something",
        artists: [{ id: "a1", name: "The Beatles" }],
        album: {
          id: "al1",
          name: "Abbey Road",
          images: [{ url: "https://example.com/abbey.jpg", width: 300, height: 300 }],
          release_date: "1969-09-26",
          total_tracks: 17,
        },
        duration_ms: 182000,
        preview_url: null,
        popularity: 82,
      },
    ],
    total: 2,
  },
  artists: { items: [], total: 0 },
  albums: { items: [], total: 0 },
};

function renderExplore(playerCtx = makePlayerCtx()) {
  return render(
    <PlayerContext.Provider value={playerCtx}>
      <MemoryRouter>
        <Explore />
      </MemoryRouter>
    </PlayerContext.Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Explore page — initial state", () => {
  it("renders the search input and genre grid by default", () => {
    renderExplore();
    expect(screen.getByPlaceholderText(/search songs/i)).toBeInTheDocument();
    expect(screen.getByText("Pop")).toBeInTheDocument();
    expect(screen.getByText("Hip-Hop")).toBeInTheDocument();
  });

  it("hides genre grid when a query is entered", async () => {
    renderExplore();
    const input = screen.getByPlaceholderText(/search songs/i);
    fireEvent.change(input, { target: { value: "beatles" } });
    expect(screen.queryByText("Browse by Genre")).not.toBeInTheDocument();
  });
});

describe("Explore page — debounced search", () => {
  it("does not call api.search immediately after input change (debounced)", () => {
    renderExplore();
    const input = screen.getByPlaceholderText(/search songs/i);
    fireEvent.change(input, { target: { value: "beatles" } });
    // Synchronously, before 350ms, the API should not have been called
    expect(api.search).not.toHaveBeenCalled();
  });

  it("calls api.search after debounce settles with correct query", async () => {
    (api.search as ReturnType<typeof vi.fn>).mockResolvedValue(SEARCH_RESPONSE);

    renderExplore();
    const input = screen.getByPlaceholderText(/search songs/i);
    fireEvent.change(input, { target: { value: "beatles" } });

    await waitFor(() => expect(api.search).toHaveBeenCalledWith("beatles"), {
      timeout: 1000,
    });
  });

  it("shows search results after the API responds", async () => {
    (api.search as ReturnType<typeof vi.fn>).mockResolvedValue(SEARCH_RESPONSE);

    renderExplore();
    fireEvent.change(screen.getByPlaceholderText(/search songs/i), {
      target: { value: "beatles" },
    });

    await waitFor(() => expect(screen.getByText("Come Together")).toBeInTheDocument(), {
      timeout: 1000,
    });
  });

  it("shows the Top Result and Songs sections for search results", async () => {
    (api.search as ReturnType<typeof vi.fn>).mockResolvedValue(SEARCH_RESPONSE);

    renderExplore();
    fireEvent.change(screen.getByPlaceholderText(/search songs/i), {
      target: { value: "beatles" },
    });

    await waitFor(() => {
      expect(screen.getByText("Top Result")).toBeInTheDocument();
      expect(screen.getByText("Songs")).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it("clears results when query is cleared", async () => {
    (api.search as ReturnType<typeof vi.fn>).mockResolvedValue(SEARCH_RESPONSE);

    renderExplore();
    const input = screen.getByPlaceholderText(/search songs/i);
    fireEvent.change(input, { target: { value: "beatles" } });

    await waitFor(() => expect(screen.getByText("Come Together")).toBeInTheDocument(), {
      timeout: 1000,
    });

    fireEvent.change(input, { target: { value: "" } });

    await waitFor(() => {
      expect(screen.queryByText("Come Together")).not.toBeInTheDocument();
      expect(screen.getByText("Browse by Genre")).toBeInTheDocument();
    });
  });

  it("clicking a genre card populates the search input and hides the genre grid", () => {
    renderExplore();
    fireEvent.click(screen.getByText("Jazz"));
    expect(screen.queryByText("Browse by Genre")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search songs/i)).toHaveValue("Jazz");
  });
});
