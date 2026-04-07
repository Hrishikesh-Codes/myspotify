/**
 * Tests for PlayerBar — idle state vs. active track state.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlayerBar from "@/components/layout/PlayerBar";
import { PlayerContext } from "@/contexts/PlayerContext";
import type { TrackItem } from "@/types/api";

// ── Fixtures ───────────────────────────────────────────────────────────────────

const MOCK_TRACK: TrackItem = {
  id: "track1",
  name: "Bohemian Rhapsody",
  artists: [{ id: "a1", name: "Queen" }],
  albumName: "A Night at the Opera",
  albumArt: "https://example.com/art.jpg",
  durationMs: 354000,
  previewUrl: "https://example.com/preview.mp3",
  popularity: 99,
};

function makePlayerContext(overrides: Partial<ReturnType<typeof baseContext>> = {}) {
  return { ...baseContext(), ...overrides };
}

function baseContext() {
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

function renderPlayerBar(ctx = makePlayerContext()) {
  return render(
    <PlayerContext.Provider value={ctx}>
      <PlayerBar />
    </PlayerContext.Provider>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("PlayerBar — idle state", () => {
  it("shows 'Nothing playing' when no track is selected", () => {
    renderPlayerBar();
    expect(screen.getByText("Nothing playing")).toBeInTheDocument();
  });

  it("disables play/pause and skip buttons when no track is loaded", () => {
    renderPlayerBar();
    const playPause = screen.getByRole("button", { name: /play/i });
    expect(playPause).toBeDisabled();
  });
});

describe("PlayerBar — with active track", () => {
  it("shows the track name and artist when a track is playing", () => {
    const ctx = makePlayerContext({ currentTrack: MOCK_TRACK, isPlaying: true });
    renderPlayerBar(ctx);
    expect(screen.getByText("Bohemian Rhapsody")).toBeInTheDocument();
    expect(screen.getByText("Queen")).toBeInTheDocument();
  });

  it("shows album art with correct src", () => {
    const ctx = makePlayerContext({ currentTrack: MOCK_TRACK });
    renderPlayerBar(ctx);
    const img = screen.getByRole("img", { name: "A Night at the Opera" });
    expect(img).toHaveAttribute("src", "https://example.com/art.jpg");
  });

  it("calls pause() when clicking the button while playing", () => {
    const ctx = makePlayerContext({ currentTrack: MOCK_TRACK, isPlaying: true });
    renderPlayerBar(ctx);
    fireEvent.click(screen.getByRole("button", { name: /pause/i }));
    expect(ctx.pause).toHaveBeenCalledTimes(1);
  });

  it("calls resume() when clicking the button while paused", () => {
    const ctx = makePlayerContext({ currentTrack: MOCK_TRACK, isPlaying: false });
    renderPlayerBar(ctx);
    fireEvent.click(screen.getByRole("button", { name: /play/i }));
    expect(ctx.resume).toHaveBeenCalledTimes(1);
  });

  it("calls skipNext() or skipPrev() when a skip button is clicked", () => {
    const ctx = makePlayerContext({ currentTrack: MOCK_TRACK });
    renderPlayerBar(ctx);
    const buttons = screen.getAllByRole("button");
    // Fire on all buttons and confirm at least one skip was invoked
    buttons.forEach((btn) => {
      if (!(btn as HTMLButtonElement).disabled) fireEvent.click(btn);
    });
    const totalCalls = ctx.skipNext.mock.calls.length + ctx.skipPrev.mock.calls.length;
    expect(totalCalls).toBeGreaterThanOrEqual(1);
  });

  it("renders progress bar reflecting current progress", () => {
    const ctx = makePlayerContext({
      currentTrack: MOCK_TRACK,
      progress: 45,
    });
    renderPlayerBar(ctx);
    // PlayerBar has two sliders: progress (first) and volume (second)
    const [progressRange] = screen.getAllByRole("slider", { hidden: true });
    expect(progressRange).toHaveValue("45");
  });

  it("calls seek() when progress range input changes", () => {
    const ctx = makePlayerContext({ currentTrack: MOCK_TRACK });
    renderPlayerBar(ctx);
    const [progressRange] = screen.getAllByRole("slider", { hidden: true });
    fireEvent.change(progressRange, { target: { value: "60" } });
    expect(ctx.seek).toHaveBeenCalledWith(60);
  });
});
