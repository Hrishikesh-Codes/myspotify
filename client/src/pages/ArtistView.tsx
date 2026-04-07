import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, fmtDuration } from "@/lib/api";
import { usePlayer } from "@/contexts/PlayerContext";
import type { ArtistDetailResponse, SpotifyTrackRaw } from "@/types/api";

function rawToTrackItem(t: SpotifyTrackRaw) {
  return {
    id: t.id,
    name: t.name,
    artists: t.artists,
    albumName: t.album.name,
    albumArt: t.album.images?.[0]?.url ?? "",
    durationMs: t.duration_ms,
    previewUrl: t.preview_url ?? null,
    popularity: t.popularity ?? 0,
  };
}

export default function ArtistView() {
  const { id } = useParams<{ id: string }>();
  const { play, currentTrack, isPlaying, pause } = usePlayer();
  const [data, setData] = useState<ArtistDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.artist(id)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="skeleton h-64 w-full" />
        <div className="px-6 py-6 space-y-4">
          <div className="skeleton h-10 w-1/3 rounded" />
          <div className="skeleton h-4 w-1/4 rounded" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
              <div className="skeleton w-5 h-5 rounded" />
              <div className="skeleton w-10 h-10 rounded" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3.5 w-1/2 rounded" />
                <div className="skeleton h-3 w-1/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="px-6 py-6 text-text-secondary">Artist not found.</div>;
  }

  const { artist, topTracks } = data;
  const heroImage = artist.images?.[0]?.url ?? "";
  const trackItems = topTracks.tracks.map(rawToTrackItem);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="relative h-64 overflow-hidden">
        {heroImage && (
          <img src={heroImage} alt={artist.name} className="w-full h-full object-cover object-top" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-transparent to-background" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <h1 className="text-5xl font-extrabold tracking-tight text-white drop-shadow-lg">{artist.name}</h1>
          <p className="text-sm text-white/70 mt-1">
            {(artist.followers.total).toLocaleString()} followers
          </p>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Genre tags */}
        {artist.genres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {artist.genres.slice(0, 6).map((g) => (
              <span
                key={g}
                className="tag capitalize"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Popular Tracks */}
        <section>
          <h2 className="text-xl font-bold tracking-tight text-text-primary mb-4">Popular Tracks</h2>
          <div className="space-y-1">
            {trackItems.map((track, i) => {
              const isPlaying_ = currentTrack?.id === track.id && isPlaying;
              return (
                <button
                  key={track.id}
                  onClick={() => isPlaying_ ? pause() : play(track, trackItems)}
                  className="w-full flex items-center gap-4 px-3 py-2 rounded-lg hover:bg-elevated transition-colors group text-left"
                >
                  {/* Rank */}
                  <span className={`w-5 text-center text-sm tabular-nums shrink-0 font-bold ${isPlaying_ ? "text-primary" : "text-text-tertiary group-hover:hidden"}`}>
                    {isPlaying_ ? (
                      <EqIcon />
                    ) : (
                      i + 1
                    )}
                  </span>
                  {!isPlaying_ && (
                    <span className="w-5 text-center hidden group-hover:block shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-primary mx-auto">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  )}
                  <img src={track.albumArt} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isPlaying_ ? "text-primary" : "text-text-primary"}`}>
                      {track.name}
                    </p>
                    <p className="text-xs text-text-tertiary truncate">{track.albumName}</p>
                  </div>
                  <span className="text-xs text-text-tertiary shrink-0">{fmtDuration(track.durationMs)}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
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
