import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function TopBar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    setShowDropdown(false);
    await logout();
    navigate("/login", { replace: true });
  }

  // Initials fallback when no profile image
  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "MS";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border/50">
      {/* Back / Forward */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full bg-elevated flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-border transition-all"
          aria-label="Go back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
        <button
          onClick={() => navigate(1)}
          className="w-8 h-8 rounded-full bg-elevated flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-border transition-all"
          aria-label="Go forward"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>
      </div>

      {/* User avatar + dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown((v) => !v)}
          className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center hover:scale-105 transition-transform ring-2 ring-transparent hover:ring-primary/50"
          aria-label="User menu"
          aria-expanded={showDropdown}
        >
          {user?.profileImage ? (
            <img
              src={user.profileImage}
              alt={user.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="w-full h-full bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </span>
          )}
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-10 w-48 bg-surface border border-border rounded-xl shadow-purple-glow py-1 z-50 animate-scale-in">
            {user && (
              <div className="px-4 py-2 border-b border-border mb-1">
                <p className="text-sm font-semibold text-text-primary truncate">{user.displayName}</p>
                <p className="text-xs text-text-tertiary truncate">{user.email}</p>
              </div>
            )}
            <button
              onClick={() => setShowDropdown(false)}
              className="w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-elevated text-left transition-colors"
            >
              Profile
            </button>
            <button
              onClick={() => setShowDropdown(false)}
              className="w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-elevated text-left transition-colors"
            >
              Settings
            </button>
            <div className="border-t border-border my-1" />
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-sm text-danger hover:bg-elevated text-left transition-colors"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
