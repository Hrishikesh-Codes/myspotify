import { useParams } from "react-router-dom";

const MOCK_PLAYLIST = {
  name: "Late Night Drive",
  description: "Perfect tracks for cruising after midnight.",
  owner: "You",
  tracks: [
    { n: 1, title: "Blinding Lights", artist: "The Weeknd", duration: "3:20", image: "https://picsum.photos/seed/pl1/48/48" },
    { n: 2, title: "As It Was", artist: "Harry Styles", duration: "2:37", image: "https://picsum.photos/seed/pl2/48/48" },
    { n: 3, title: "Levitating", artist: "Dua Lipa", duration: "3:23", image: "https://picsum.photos/seed/pl3/48/48" },
    { n: 4, title: "Heat Waves", artist: "Glass Animals", duration: "3:59", image: "https://picsum.photos/seed/pl4/48/48" },
    { n: 5, title: "Stay", artist: "The Kid LAROI", duration: "2:21", image: "https://picsum.photos/seed/pl5/48/48" },
  ],
};

export default function Playlist() {
  const { id } = useParams();
  const playlist = { ...MOCK_PLAYLIST, id };

  return (
    <div className="px-6 py-6 animate-fade-in">
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        <div className="w-52 h-52 rounded-xl bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center shadow-purple-glow-lg shrink-0">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="white" className="opacity-60">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
        <div className="flex flex-col justify-end">
          <p className="text-xs text-text-tertiary uppercase tracking-widest mb-2">Playlist</p>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">{playlist.name}</h1>
          <p className="text-text-secondary text-sm">{playlist.description}</p>
          <p className="text-text-tertiary text-xs mt-1">By {playlist.owner} · {playlist.tracks.length} songs</p>
          <div className="flex gap-3 mt-5">
            <button className="play-btn w-12 h-12">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
            </button>
            <button className="btn-ghost">Edit</button>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div>
        <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 px-3 pb-2 border-b border-border text-xs text-text-tertiary uppercase tracking-wider mb-1">
          <span className="w-5">#</span>
          <span>Title</span>
          <span>Time</span>
        </div>
        <div className="space-y-0.5">
          {playlist.tracks.map((track) => (
            <div
              key={track.n}
              className="flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-elevated transition-colors cursor-pointer group"
            >
              <span className="w-5 text-right text-text-tertiary text-sm group-hover:hidden tabular-nums">
                {track.n}
              </span>
              <span className="w-5 hidden group-hover:flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <img src={track.image} alt="" className="w-10 h-10 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{track.title}</p>
                <p className="text-xs text-text-tertiary">{track.artist}</p>
              </div>
              <span className="text-xs text-text-tertiary tabular-nums">{track.duration}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
