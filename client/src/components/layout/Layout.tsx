import { Outlet, NavLink } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import PlayerBar from "./PlayerBar";

export default function Layout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — hidden on mobile */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Main area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto page-gradient">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Player bar — hidden on smallest screens to avoid overlap */}
      <PlayerBar />

      {/* Mobile bottom tab bar */}
      <MobileTabBar />
    </div>
  );
}

function MobileTabBar() {
  const tabs = [
    { label: "Home", to: "/", icon: HomeIcon, exact: true },
    { label: "Explore", to: "/explore", icon: ExploreIcon, exact: false },
    { label: "Library", to: "/library", icon: LibraryIcon, exact: false },
    { label: "Stats", to: "/stats/mood", icon: StatsIcon, exact: false },
  ];

  return (
    <nav className="md:hidden flex items-center justify-around bg-surface border-t border-border px-2 py-1 shrink-0">
      {tabs.map(({ label, to, icon: Icon, exact }) => (
        <NavLink
          key={to}
          to={to}
          end={exact}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
              isActive ? "text-primary" : "text-text-tertiary"
            }`
          }
        >
          <Icon />
          <span className="text-[9px] font-semibold">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}
function ExploreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  );
}
function LibraryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z" />
    </svg>
  );
}
function StatsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
    </svg>
  );
}
