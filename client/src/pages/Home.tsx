import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { api, getDominantMood, fmtDuration } from "@/lib/api";
import { SectionHeader } from "@/components/ui/Card";
import type { TrackItem, ArtistItem, PlayedTrack, AudioFeatures } from "@/types/api";

// ── Skeleton helpers ──────────────────────────────────────────────────────────

function RecentCardSkeleton() {
  return (
    <div className="card flex items-center gap-3 p-3 h-[72px]">
      <div className="skeleton w-12 h-12 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}

function ArtistChipSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 shrink-0 w-24">
      <div className="skeleton w-20 h-20 rounded-full" />
      <div className="skeleton h-3 w-16 rounded" />
    </div>
  );
}

function TrackCardSkeleton() {
  return (
    <div className="card p-3 w-44 shrink-0">
      <div className="skeleton w-full aspect-square rounded-lg mb-3" />
      <div className="skeleton h-3.5 w-3/4 rounded mb-2" />
      <div className="skeleton h-3 w-1/2 rounded" />
    </div>
  );
}

// ── Horizontal scroll with fade edges ────────────────────────────────────────

function ScrollRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* Left fade */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-background to-transparent" />
      {/* Right fade */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-background to-transparent" />
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin" style={{ scrollbarWidth: "none" }}>
        {children}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth();
  const { play } = usePlayer();
  const navigate = useNavigate();

  const [recent, setRecent] = useState<PlayedTrack[]>([]);
  const [topArtists, setTopArtists] = useState<ArtistItem[]>([]);
  const [topTracks, setTopTracks] = useState<TrackItem[]>([]);
  const [featuresMap, setFeaturesMap] = useState<Map<string, AudioFeatures>>(new Map());
  const [loading, setLoading] = useState(true);

  const firstName = user?.displayName?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    Promise.all([
      api.recentlyPlayed(12),
      api.topArtists("short_term", 12),
      api.topTracks("medium_term", 20),
    ])
      .then(([recentRes, artistsRes, tracksRes]) => {
        setRecent(recentRes.items);
        setTopArtists(artistsRes.items);
        setTopTracks(tracksRes.items);

        // Lazy-load audio features for mood badges
        if (tracksRes.items.length > 0) {
          const ids = tracksRes.items.map((t) => t.id);
          api.audioFeatures(ids).then((afRes) => {
            const map = new Map<string, AudioFeatures>();
            afRes.features.forEach(({ trackId, features }) => {
              if (features) map.set(trackId, features);
            });
            setFeaturesMap(map);
          }).catch(() => {});
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const recentTracks = recent.map((r) => r.track);

  return (
    <div className="px-6 py-6 space-y-10 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
          {greeting},{" "}
          <span className="text-gradient-purple">{firstName}</span>
        </h1>
        <p className="text-text-secondary mt-1 text-sm">Here's what's been on your mind lately.</p>
      </div>

      {/* Recently Played — 2-col × 3-row wide cards */}
      <section>
        <SectionHeader title="Recently Played" actionLabel="See all" onAction={() => navigate("/")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <RecentCardSkeleton key={i} />)
            : recent.slice(0, 6).map((item, i) => (
                <button
                  key={i}
                  onClick={() => play(item.track, recentTracks)}
                  className="card card-hover flex items-center gap-3 p-3 text-left group hover:border-primary/30"
                >
                  <img
                    src={item.track.albumArt}
                    alt={item.track.albumName}
                    className="w-12 h-12 rounded-lg object-cover shrink-0 group-hover:shadow-purple-glow transition-shadow"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {item.track.name}
                    </p>
                    <p className="text-xs text-text-tertiary truncate">
                      {item.track.artists.map((a) => a.name).join(", ")}
                    </p>
                  </div>
                  {/* Play icon on hover */}
                  <div className="play-btn w-8 h-8 opacity-0 group-hover:opacity-100 shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </button>
              ))}
        </div>
      </section>

      {/* Top Artists — horizontal scroll */}
      <section>
        <SectionHeader title="Your Top Artists" actionLabel="See all" onAction={() => navigate("/library")} />
        <ScrollRow>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <ArtistChipSkeleton key={i} />)
            : topArtists.map((artist) => (
                <button
                  key={artist.id}
                  onClick={() => navigate(`/artist/${artist.id}`)}
                  className="flex flex-col items-center gap-2 shrink-0 w-24 group"
                >
                  <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary transition-all duration-200 group-hover:shadow-[0_0_16px_rgba(139,92,246,0.5)]">
                    {artist.images[0] ? (
                      <img
                        src={artist.images[0].url}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center text-white text-xl font-bold">
                        {artist.name[0]}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors text-center truncate w-full">
                    {artist.name}
                  </span>
                </button>
              ))}
        </ScrollRow>
      </section>

      {/* Top Tracks This Month — horizontal scroll cards */}
      <section>
        <SectionHeader title="Top Tracks This Month" actionLabel="See all" onAction={() => navigate("/library")} />
        <ScrollRow>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <TrackCardSkeleton key={i} />)
            : topTracks.map((track) => {
                const feat = featuresMap.get(track.id);
                const mood = feat ? getDominantMood(feat) : null;
                return (
                  <button
                    key={track.id}
                    onClick={() => play(track, topTracks)}
                    className="card card-hover p-3 w-44 shrink-0 text-left group"
                  >
                    <div className="relative mb-3">
                      <img
                        src={track.albumArt}
                        alt={track.albumName}
                        className="w-full aspect-square object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute bottom-2 right-2 play-btn w-8 h-8 opacity-0 group-hover:opacity-100">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                      {mood && (
                        <div className={`absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-[10px] font-semibold px-2 py-0.5 rounded-full ${mood.color}`}>
                          {mood.label}
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-text-primary truncate">{track.name}</p>
                    <p className="text-xs text-text-tertiary truncate mt-0.5">
                      {track.artists.map((a) => a.name).join(", ")}
                    </p>
                    <p className="text-[10px] text-text-tertiary mt-1">{fmtDuration(track.durationMs)}</p>
                  </button>
                );
              })}
        </ScrollRow>
      </section>
    </div>
  );
}
