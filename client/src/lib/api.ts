import type {
  TopTracksResponse,
  TopArtistsResponse,
  RecentlyPlayedResponse,
  AudioFeaturesResponse,
  PlaylistsResponse,
  SearchResponse,
  SpotifyTrackRaw,
  ArtistDetailResponse,
  SpotifyAlbumRaw,
} from "@/types/api";

// In production, frontend is served from the same origin as the API (no prefix needed).
// In development, Vite's proxy (vite.config.ts) forwards /api/* to the Express server.
const API_BASE = "";

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, { credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

type TimeRange = "short_term" | "medium_term" | "long_term";

export const api = {
  topTracks: (timeRange: TimeRange = "medium_term", limit = 50) =>
    apiFetch<TopTracksResponse>(
      `/api/me/top-tracks?time_range=${timeRange}&limit=${limit}`
    ),

  topArtists: (timeRange: TimeRange = "medium_term", limit = 50) =>
    apiFetch<TopArtistsResponse>(
      `/api/me/top-artists?time_range=${timeRange}&limit=${limit}`
    ),

  recentlyPlayed: (limit = 50) =>
    apiFetch<RecentlyPlayedResponse>(`/api/me/recently-played?limit=${limit}`),

  audioFeatures: (ids: string[]) =>
    apiFetch<AudioFeaturesResponse>(
      `/api/me/audio-features?ids=${ids.join(",")}`
    ),

  playlists: (limit = 50) =>
    apiFetch<PlaylistsResponse>(`/api/me/playlists?limit=${limit}`),

  search: (q: string, type = "track,artist,album", limit = 20) =>
    apiFetch<SearchResponse>(
      `/api/search?q=${encodeURIComponent(q)}&type=${type}&limit=${limit}`
    ),

  track: (id: string) =>
    apiFetch<SpotifyTrackRaw>(`/api/item/track/${id}`),

  artist: (id: string) =>
    apiFetch<ArtistDetailResponse>(`/api/item/artist/${id}`),

  album: (id: string) =>
    apiFetch<SpotifyAlbumRaw>(`/api/item/album/${id}`),
};

/** Derive dominant mood label + colour from audio features. */
export function getDominantMood(
  f: { danceability: number; energy: number; valence: number; acousticness: number }
): { label: string; color: string } {
  if (f.energy > 0.7 && f.valence > 0.7) return { label: "Happy", color: "text-success" };
  if (f.energy > 0.7 && f.valence < 0.4) return { label: "Intense", color: "text-danger" };
  if (f.danceability > 0.75) return { label: "Dance", color: "text-accent-pink" };
  if (f.acousticness > 0.6) return { label: "Acoustic", color: "text-warning" };
  if (f.energy < 0.4 && f.valence < 0.4) return { label: "Melancholy", color: "text-primary-glow" };
  if (f.valence > 0.6) return { label: "Upbeat", color: "text-success" };
  return { label: "Chill", color: "text-secondary" };
}

/** Format milliseconds → m:ss */
export function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
