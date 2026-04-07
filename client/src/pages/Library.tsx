import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { PlaylistItem, ArtistItem } from "@/types/api";

type Tab = "Playlists" | "Artists" | "Albums";
type SortKey = "name" | "popularity";
type ViewMode = "grid" | "list";

function GridSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="card p-3">
          <div className="skeleton w-full aspect-square rounded-lg mb-3" />
          <div className="skeleton h-3.5 w-3/4 rounded mb-2" />
          <div className="skeleton h-3 w-1/2 rounded" />
        </div>
      ))}
    </>
  );
}

function ListSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <div className="skeleton w-12 h-12 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-1/2 rounded" />
            <div className="skeleton h-3 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </>
  );
}

export default function Library() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("Playlists");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortKey>("name");
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [albumItems, setAlbumItems] = useState<{ id: string; name: string; artist: string; art: string }[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.playlists(50), api.topArtists("medium_term", 50)])
      .then(([pl, ar]) => { setPlaylists(pl.items); setArtists(ar.items); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Lazy-load albums when that tab is first opened
  useEffect(() => {
    if (activeTab !== "Albums" || albumItems.length > 0) return;
    api.topTracks("medium_term", 50).then((res) => {
      const seen = new Set<string>();
      const albums: typeof albumItems = [];
      res.items.forEach((t) => {
        if (!seen.has(t.albumName)) {
          seen.add(t.albumName);
          albums.push({ id: t.id, name: t.albumName, artist: t.artists[0]?.name ?? "", art: t.albumArt });
        }
      });
      setAlbumItems(albums);
    }).catch(() => {});
  }, [activeTab, albumItems.length]);

  const sortedPlaylists = [...playlists].sort((a, b) =>
    sort === "name" ? a.name.localeCompare(b.name) : b.tracksTotal - a.tracksTotal
  );
  const sortedArtists = [...artists].sort((a, b) =>
    sort === "name" ? a.name.localeCompare(b.name) : b.popularity - a.popularity
  );
  const sortedAlbums = [...albumItems].sort((a, b) => a.name.localeCompare(b.name));

  const tabs: Tab[] = ["Playlists", "Artists", "Albums"];

  return (
    <div className="px-6 py-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Your Library</h1>
        <p className="text-text-secondary mt-1 text-sm">Everything you've saved and followed.</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-150 ${
                activeTab === tab
                  ? "bg-primary/20 text-primary-glow border border-primary/40"
                  : "btn-ghost"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="text-xs bg-elevated border border-border rounded-lg px-3 py-1.5 text-text-secondary focus:outline-none focus:border-primary/50 cursor-pointer"
          >
            <option value="name">Name</option>
            <option value="popularity">Popular</option>
          </select>
          <div className="flex bg-elevated rounded-lg overflow-hidden border border-border">
            {(["grid", "list"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`p-1.5 transition-colors ${viewMode === v ? "bg-primary/20 text-primary-glow" : "text-text-tertiary hover:text-text-secondary"}`}
                aria-label={`${v} view`}
              >
                {v === "grid" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 3h8v8H3zm0 10h8v8H3zm10-10h8v8h-8zm0 10h8v8h-8z" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Playlists */}
      {activeTab === "Playlists" && (
        viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {loading ? <GridSkeleton /> : sortedPlaylists.map((pl) => (
              <button key={pl.id} onClick={() => navigate(`/playlist/${pl.id}`)} className="card card-hover p-3 text-left group">
                {pl.coverImage ? (
                  <img src={pl.coverImage} alt={pl.name} className="w-full aspect-square object-cover rounded-lg mb-3 group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full aspect-square rounded-lg mb-3 bg-elevated flex items-center justify-center">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" className="text-text-tertiary">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                )}
                <p className="text-sm font-semibold text-text-primary truncate">{pl.name}</p>
                <p className="text-xs text-text-tertiary mt-0.5">{pl.tracksTotal} tracks</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {loading ? <ListSkeleton /> : sortedPlaylists.map((pl) => (
              <button key={pl.id} onClick={() => navigate(`/playlist/${pl.id}`)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-elevated transition-colors group text-left">
                {pl.coverImage ? (
                  <img src={pl.coverImage} alt={pl.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-elevated flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-text-tertiary">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{pl.name}</p>
                  <p className="text-xs text-text-tertiary">{pl.tracksTotal} tracks</p>
                </div>
                <span className="text-xs text-text-tertiary shrink-0">{pl.public ? "Public" : "Private"}</span>
              </button>
            ))}
          </div>
        )
      )}

      {/* Artists */}
      {activeTab === "Artists" && (
        viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {loading ? <GridSkeleton /> : sortedArtists.map((artist) => (
              <button key={artist.id} onClick={() => navigate(`/artist/${artist.id}`)} className="flex flex-col items-center gap-2 group">
                <div className="w-full aspect-square rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary transition-all duration-200 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]">
                  {artist.images[0] ? (
                    <img src={artist.images[0].url} alt={artist.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center text-3xl font-bold text-white">{artist.name[0]}</div>
                  )}
                </div>
                <p className="text-sm font-semibold text-text-primary group-hover:text-primary-glow transition-colors text-center truncate w-full">{artist.name}</p>
                <p className="text-xs text-text-tertiary truncate">{artist.genres[0] ?? "Artist"}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {loading ? <ListSkeleton /> : sortedArtists.map((artist) => (
              <button key={artist.id} onClick={() => navigate(`/artist/${artist.id}`)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-elevated transition-colors group text-left">
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                  {artist.images[0] ? (
                    <img src={artist.images[0].url} alt={artist.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center font-bold text-white">{artist.name[0]}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{artist.name}</p>
                  <p className="text-xs text-text-tertiary">{artist.genres.slice(0, 2).join(", ") || "Artist"}</p>
                </div>
                <span className="text-xs text-text-tertiary shrink-0">{artist.popularity}% pop.</span>
              </button>
            ))}
          </div>
        )
      )}

      {/* Albums */}
      {activeTab === "Albums" && (
        viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {sortedAlbums.length === 0
              ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="card p-3"><div className="skeleton w-full aspect-square rounded-lg mb-3" /><div className="skeleton h-3.5 w-3/4 rounded mb-2" /></div>)
              : sortedAlbums.map((album, i) => (
                  <button key={i} onClick={() => navigate(`/album/${album.id}`)} className="card card-hover p-3 text-left group">
                    <img src={album.art} alt={album.name} className="w-full aspect-square object-cover rounded-lg mb-3 group-hover:scale-105 transition-transform duration-300" />
                    <p className="text-sm font-semibold text-text-primary truncate">{album.name}</p>
                    <p className="text-xs text-text-tertiary mt-0.5 truncate">{album.artist}</p>
                  </button>
                ))}
          </div>
        ) : (
          <div className="space-y-1">
            {sortedAlbums.map((album, i) => (
              <button key={i} onClick={() => navigate(`/album/${album.id}`)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-elevated transition-colors text-left">
                <img src={album.art} alt={album.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{album.name}</p>
                  <p className="text-xs text-text-tertiary truncate">{album.artist}</p>
                </div>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}
