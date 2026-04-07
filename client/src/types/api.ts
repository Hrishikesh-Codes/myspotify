// ── Core entities ────────────────────────────────────────────────────────────

export interface TrackItem {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  albumName: string;
  albumArt: string;
  durationMs: number;
  previewUrl: string | null;
  popularity: number;
}

export interface ArtistItem {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
  genres: string[];
  popularity: number;
  followers: number;
}

export interface PlaylistItem {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  tracksTotal: number;
  public: boolean;
  collaborative: boolean;
}

export interface AudioFeatures {
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
  timeSignature: number;
}

export interface PlayedTrack {
  track: TrackItem;
  playedAt: string;
}

// ── API responses ─────────────────────────────────────────────────────────────

export interface TopTracksResponse {
  items: TrackItem[];
  timeRange: string;
  total: number;
}

export interface TopArtistsResponse {
  items: ArtistItem[];
  timeRange: string;
  total: number;
}

export interface RecentlyPlayedResponse {
  items: PlayedTrack[];
  total: number;
}

export interface AudioFeaturesResponse {
  features: { trackId: string; features: AudioFeatures | null }[];
  averages: AudioFeatures;
}

export interface PlaylistsResponse {
  items: PlaylistItem[];
  total: number;
}

// ── Spotify raw shapes returned by /api/item/* ────────────────────────────────

export interface SpotifyImage {
  url: string;
  width: number;
  height: number;
}

export interface SpotifyTrackRaw {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: SpotifyImage[];
    release_date: string;
    total_tracks: number;
  };
  duration_ms: number;
  preview_url: string | null;
  popularity: number;
  track_number: number;
}

export interface SpotifyArtistRaw {
  id: string;
  name: string;
  images: SpotifyImage[];
  genres: string[];
  popularity: number;
  followers: { total: number };
}

export interface SpotifyAlbumRaw {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  images: SpotifyImage[];
  release_date: string;
  total_tracks: number;
  tracks: { items: SpotifyTrackRaw[] };
  genres: string[];
  popularity: number;
}

export interface ArtistDetailResponse {
  artist: SpotifyArtistRaw;
  topTracks: { tracks: SpotifyTrackRaw[] };
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface SearchResponse {
  tracks?: {
    items: SpotifyTrackRaw[];
    total: number;
  };
  artists?: {
    items: SpotifyArtistRaw[];
    total: number;
  };
  albums?: {
    items: {
      id: string;
      name: string;
      artists: { id: string; name: string }[];
      images: SpotifyImage[];
      release_date: string;
      total_tracks: number;
    }[];
    total: number;
  };
}
