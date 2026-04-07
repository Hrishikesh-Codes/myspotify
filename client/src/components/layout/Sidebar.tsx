import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { api } from "@/lib/api";
import type { PlaylistItem } from "@/types/api";

const navItems = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/explore", label: "Explore", icon: ExploreIcon },
  { to: "/library", label: "Your Library", icon: LibraryIcon },
];

const statsItems = [
  { to: "/stats/mood", label: "Mood Trends", icon: MoodIcon },
  { to: "/stats/patterns", label: "Listening Patterns", icon: PatternIcon },
  { to: "/stats/taste", label: "Taste Profile", icon: TasteIcon },
];

export default function Sidebar() {
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);

  useEffect(() => {
    api.playlists(20).then((r) => setPlaylists(r.items)).catch(() => {});
  }, []);

  return (
    <aside className="w-60 shrink-0 bg-surface flex flex-col h-full border-r border-border overflow-hidden">
      {/* Logo */}
      <div className="px-6 py-5">
        <span className="text-xl font-extrabold tracking-tight text-gradient-purple drop-shadow-[0_0_12px_rgba(139,92,246,0.4)]">
          MySpotify
        </span>
      </div>

      {/* Main nav */}
      <nav className="px-3 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "nav-item-active"
                  : "text-text-secondary hover:text-text-primary hover:bg-elevated"
              }`
            }
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Stats section */}
      <div className="mt-5 px-3">
        <p className="px-3 mb-2 text-[10px] font-bold tracking-widest text-text-tertiary uppercase">
          My Stats
        </p>
        <div className="space-y-0.5">
          {statsItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "nav-item-active"
                    : "text-text-secondary hover:text-text-primary hover:bg-elevated"
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="my-4 mx-4 border-t border-border" />

      {/* Playlists */}
      <div className="px-3 flex-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-bold tracking-widest text-text-tertiary uppercase">
          Playlists
        </p>
        <div className="space-y-0.5">
          {playlists.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-3 py-2">
                  <div className="skeleton h-3.5 rounded w-3/4" />
                </div>
              ))
            : playlists.map((pl) => (
                <NavLink
                  key={pl.id}
                  to={`/playlist/${pl.id}`}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm transition-all duration-150 truncate ${
                      isActive
                        ? "text-text-primary bg-elevated"
                        : "text-text-tertiary hover:text-text-secondary hover:bg-elevated"
                    }`
                  }
                >
                  {pl.name}
                </NavLink>
              ))}
        </div>
      </div>
    </aside>
  );
}

/* ── Icons ── */
function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}
function ExploreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  );
}
function LibraryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z" />
    </svg>
  );
}
function MoodIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
    </svg>
  );
}
function PatternIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
    </svg>
  );
}
function TasteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
    </svg>
  );
}
