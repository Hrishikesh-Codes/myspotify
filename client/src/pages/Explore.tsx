import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtDuration } from "@/lib/api";
import { usePlayer } from "@/contexts/PlayerContext";
import type { SearchResponse, SpotifyTrackRaw } from "@/types/api";

// ── Genre cards config ────────────────────────────────────────────────────────

const GENRES = [
  { label: "Pop", gradient: "from-[#8B5CF6] to-[#E879F9]" },
  { label: "Hip-Hop", gradient: "from-[#6366F1] to-[#8B5CF6]" },
  { label: "R&B", gradient: "from-[#C084FC] to-[#E879F9]" },
  { label: "Electronic", gradient: "from-[#7C3AED] to-[#2563EB]" },
  { label: "Rock", gradient: "from-[#DC2626] to-[#7C3AED]" },
  { label: "Indie", gradient: "from-[#0891B2] to-[#7C3AED]" },
  { label: "Jazz", gradient: "from-[#D97706] to-[#9333EA]" },
  { label: "Classical", gradient: "from-[#0D9488] to-[#7C3AED]" },
  { label: "Latin", gradient: "from-[#DC2626] to-[#F59E0B]" },
  { label: "K-Pop", gradient: "from-[#EC4899] to-[#8B5CF6]" },
  { label: "Metal", gradient: "from-[#374151] to-[#7C3AED]" },
  { label: "Acoustic", gradient: "from-[#92400E] to-[#7C3AED]" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SearchSkeleton() {
  return (
    <div className="space-y-6">
      <div className="card p-4">
        <div className="skeleton h-32 w-full rounded-xl mb-3" />
        <div className="skeleton h-4 w-1/3 rounded mb-2" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <div className="skeleton w-10 h-10 rounded" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-1/2 rounded" />
            <div className="skeleton h-3 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Explore() {
  const navigate = useNavigate();
  const { play } = usePlayer();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults(null); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.search(query.trim());
        setResults(data);
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 350);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const topTrack = results?.tracks?.items?.[0];
  const otherTracks = results?.tracks?.items?.slice(1, 6) ?? [];
  const artists = results?.artists?.items?.slice(0, 6) ?? [];
  const albums = results?.albums?.items?.slice(0, 6) ?? [];

  return (
    <div className="px-6 py-6 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Explore</h1>
        <p className="text-text-secondary mt-1 text-sm">Discover music by searching or browsing genres.</p>
      </div>

      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          width="18" height="18" viewBox="0 0 24 24" fill="currentColor"
        >
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs, artists, albums..."
          className="w-full bg-surface border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.1)] transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        )}
      </div>

      {/* Pre-search: genre grid */}
      {!query && (
        <section>
          <h2 className="text-xl font-bold tracking-tight text-text-primary mb-4">Browse by Genre</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {GENRES.map(({ label, gradient }) => (
              <button
                key={label}
                onClick={() => setQuery(label)}
                className={`relative h-24 rounded-xl bg-gradient-to-br ${gradient} overflow-hidden group cursor-pointer hover:-translate-y-0.5 transition-transform duration-200`}
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                <span className="relative font-extrabold text-white text-lg tracking-tight drop-shadow">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Loading */}
      {searching && <SearchSkeleton />}

      {/* Results */}
      {!searching && results && (
        <div className="space-y-8">
          {/* Top Result */}
          {topTrack && (
            <section>
              <h2 className="text-xl font-bold tracking-tight text-text-primary mb-4">Top Result</h2>
              <button
                onClick={() => play(rawToTrackItem(topTrack), results.tracks?.items?.map(rawToTrackItem))}
                className="card card-hover p-4 text-left group w-full max-w-sm relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent-pink/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                <div className="relative">
                  <img
                    src={topTrack.album.images?.[0]?.url ?? ""}
                    alt={topTrack.album.name}
                    className="w-24 h-24 rounded-xl object-cover mb-4 shadow-purple-glow"
                  />
                  <p className="text-xl font-extrabold text-text-primary truncate">{topTrack.name}</p>
                  <p className="text-sm text-text-secondary truncate mt-1">
                    {topTrack.artists.map((a) => a.name).join(", ")} · {topTrack.album.name}
                  </p>
                  <span className="inline-block mt-3 text-[10px] font-bold tracking-widest text-text-tertiary uppercase">Song</span>
                </div>
                <div className="absolute bottom-4 right-4 play-btn w-10 h-10 opacity-0 group-hover:opacity-100">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </button>
            </section>
          )}

          {/* Songs list */}
          {otherTracks.length > 0 && (
            <section>
              <h2 className="text-xl font-bold tracking-tight text-text-primary mb-3">Songs</h2>
              <div className="space-y-1">
                {otherTracks.map((track, i) => (
                  <button
                    key={track.id}
                    onClick={() => play(rawToTrackItem(track), results.tracks?.items?.map(rawToTrackItem))}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-elevated transition-colors group text-left"
                  >
                    <span className="w-5 text-center text-text-tertiary text-sm tabular-nums group-hover:hidden shrink-0">{i + 2}</span>
                    <span className="w-5 hidden group-hover:block shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-primary mx-auto">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                    <img src={track.album.images?.[0]?.url ?? ""} alt="" className="w-10 h-10 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{track.name}</p>
                      <p className="text-xs text-text-tertiary truncate">{track.artists.map((a) => a.name).join(", ")}</p>
                    </div>
                    <span className="text-xs text-text-tertiary shrink-0">{fmtDuration(track.duration_ms)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Artists */}
          {artists.length > 0 && (
            <section>
              <h2 className="text-xl font-bold tracking-tight text-text-primary mb-4">Artists</h2>
              <div className="flex gap-6 flex-wrap">
                {artists.map((artist) => (
                  <button
                    key={artist.id}
                    onClick={() => navigate(`/artist/${artist.id}`)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary transition-all group-hover:shadow-[0_0_16px_rgba(139,92,246,0.5)]">
                      {artist.images?.[0] ? (
                        <img src={artist.images[0].url} alt={artist.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-elevated flex items-center justify-center text-2xl font-bold text-text-secondary">
                          {artist.name[0]}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">{artist.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Albums */}
          {albums.length > 0 && (
            <section>
              <h2 className="text-xl font-bold tracking-tight text-text-primary mb-4">Albums</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {albums.map((album) => (
                  <button
                    key={album.id}
                    onClick={() => navigate(`/album/${album.id}`)}
                    className="card card-hover p-3 text-left group"
                  >
                    <img
                      src={album.images?.[0]?.url ?? ""}
                      alt={album.name}
                      className="w-full aspect-square object-cover rounded-lg mb-2 group-hover:scale-105 transition-transform duration-300"
                    />
                    <p className="text-xs font-semibold text-text-primary truncate">{album.name}</p>
                    <p className="text-[10px] text-text-tertiary truncate mt-0.5">
                      {album.artists.map((a) => a.name).join(", ")}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
