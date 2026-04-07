import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, fmtDuration } from "@/lib/api";
import { usePlayer } from "@/contexts/PlayerContext";
import type { SpotifyAlbumRaw, SpotifyTrackRaw } from "@/types/api";

function rawToTrackItem(t: SpotifyTrackRaw, album: SpotifyAlbumRaw) {
  return {
    id: t.id,
    name: t.name,
    artists: t.artists,
    albumName: album.name,
    albumArt: album.images?.[0]?.url ?? "",
    durationMs: t.duration_ms,
    previewUrl: t.preview_url ?? null,
    popularity: t.popularity ?? 0,
  };
}

function EqIcon() {
  return (
    <span className="inline-flex items-end gap-px h-4">
      {[3, 5, 2].map((h, i) => (
        <span
          key={i}
          className="w-0.5 bg-primary rounded-sm animate-pulse"
          style={{ height: `${h * 3}px`, animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

export default function AlbumView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { play, currentTrack, isPlaying, pause } = usePlayer();
  const [album, setAlbum] = useState<SpotifyAlbumRaw | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.album(id)
      .then(setAlbum)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="px-6 py-6 space-y-6 animate-fade-in">
        <div className="flex gap-6">
          <div className="skeleton w-48 h-48 rounded-xl shrink-0" />
          <div className="space-y-3 flex-1 pt-4">
            <div className="skeleton h-8 w-2/3 rounded" />
            <div className="skeleton h-4 w-1/3 rounded" />
            <div className="skeleton h-4 w-1/4 rounded" />
          </div>
        </div>
        <div className="space-y-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-3 py-2">
              <div className="skeleton w-5 h-4 rounded" />
              <div className="flex-1 space-y-1">
                <div className="skeleton h-3.5 w-1/2 rounded" />
                <div className="skeleton h-3 w-1/3 rounded" />
              </div>
              <div className="skeleton w-8 h-3 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!album) {
    return <div className="px-6 py-6 text-text-secondary">Album not found.</div>;
  }

  const trackItems = album.tracks.items.map((t) => rawToTrackItem(t, album));
  const totalDuration = album.tracks.items.reduce((s, t) => s + t.duration_ms, 0);
  const year = album.release_date?.slice(0, 4);

  return (
    <div className="px-6 py-6 space-y-8 animate-fade-in">
      {/* Hero */}
      <div className="flex flex-col sm:flex-row gap-6">
        <img
          src={album.images?.[0]?.url ?? ""}
          alt={album.name}
          className="w-48 h-48 rounded-xl object-cover shrink-0 shadow-purple-glow-lg"
        />
        <div className="flex flex-col justify-end gap-2">
          <p className="text-xs font-bold tracking-widest text-text-tertiary uppercase">Album</p>
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">{album.name}</h1>
          <div className="flex flex-wrap items-center gap-1 text-sm text-text-secondary">
            {album.artists.map((a, i) => (
              <span key={a.id}>
                <button
                  onClick={() => navigate(`/artist/${a.id}`)}
                  className="hover:text-primary hover:underline transition-colors"
                >
                  {a.name}
                </button>
                {i < album.artists.length - 1 && <span className="text-text-tertiary">, </span>}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {year && (
              <span className="text-xs text-text-tertiary bg-elevated px-2 py-0.5 rounded-full border border-border">{year}</span>
            )}
            <span className="text-xs text-text-tertiary bg-elevated px-2 py-0.5 rounded-full border border-border">
              {album.total_tracks} tracks
            </span>
            <span className="text-xs text-text-tertiary bg-elevated px-2 py-0.5 rounded-full border border-border">
              {fmtDuration(totalDuration)}
            </span>
          </div>

          {/* Play all button */}
          <button
            onClick={() => play(trackItems[0], trackItems)}
            className="play-btn w-12 h-12 mt-3"
            aria-label="Play album"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
          </button>
        </div>
      </div>

      {/* Track list */}
      <section>
        {/* Header row */}
        <div className="flex items-center gap-4 px-3 pb-2 border-b border-border text-xs text-text-tertiary font-medium uppercase tracking-wider">
          <span className="w-5 text-center">#</span>
          <span className="flex-1">Title</span>
          <span className="w-12 text-right">Time</span>
        </div>
        <div className="space-y-0.5 mt-1">
          {trackItems.map((track, i) => {
            const isActive = currentTrack?.id === track.id;
            const isPlaying_ = isActive && isPlaying;
            return (
              <button
                key={track.id}
                onClick={() => isPlaying_ ? pause() : play(track, trackItems)}
                className={`w-full flex items-center gap-4 px-3 py-2 rounded-lg transition-colors group text-left ${isActive ? "bg-primary/10" : "hover:bg-elevated"}`}
              >
                <span className={`w-5 text-center text-sm tabular-nums shrink-0 ${isActive ? "text-primary" : "text-text-tertiary group-hover:hidden"}`}>
                  {isPlaying_ ? <EqIcon /> : i + 1}
                </span>
                {!isPlaying_ && (
                  <span className="w-5 text-center hidden group-hover:block shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-primary mx-auto">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : "text-text-primary"}`}>
                    {track.name}
                  </p>
                  <p className="text-xs text-text-tertiary truncate">
                    {track.artists.map((a) => a.name).join(", ")}
                  </p>
                </div>
                <span className="text-xs text-text-tertiary shrink-0 w-12 text-right">
                  {fmtDuration(track.durationMs)}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
