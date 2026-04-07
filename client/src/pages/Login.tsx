import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Already authenticated — go home
  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#121212]">
        <div className="w-8 h-8 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center px-4">
      {/* Card */}
      <div className="w-full max-w-sm flex flex-col items-center gap-8 animate-fade-in">

        {/* Spotify logo */}
        <svg
          viewBox="0 0 167 50"
          className="h-10 text-white fill-current"
          aria-label="Spotify"
        >
          <path d="M83.996 0.277C37.747 0.277 0.253 37.77 0.253 84.019c0 46.251 37.494 83.741 83.743 83.741 46.254 0 83.744-37.49 83.744-83.741 0-46.246-37.49-83.738-83.745-83.738l.001-.004zm38.404 120.78a5.217 5.217 0 01-7.18 1.73c-19.662-12.01-44.414-14.73-73.564-8.07a5.222 5.222 0 01-6.249-3.93 5.213 5.213 0 013.926-6.25c31.9-7.291 59.263-4.15 81.337 9.34 2.46 1.51 3.24 4.72 1.73 7.18zm10.25-22.805c-1.89 3.075-5.91 4.045-8.98 2.155-22.51-13.839-56.823-17.846-83.448-9.764-3.453 1.043-7.1-.903-8.148-4.35a6.538 6.538 0 014.354-8.143c30.413-9.228 68.222-4.758 94.072 11.127 3.07 1.89 4.04 5.91 2.15 8.976v-.001zm.88-23.744c-26.99-16.031-71.52-17.505-97.289-9.684-4.138 1.255-8.514-1.081-9.768-5.219a7.835 7.835 0 015.221-9.771c29.581-8.98 78.756-7.245 109.83 11.202a7.823 7.823 0 012.74 10.733c-2.2 3.722-7.02 4.949-10.73 2.739z" />
        </svg>

        {/* App name */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">MySpotify</h1>
          <p className="mt-2 text-[#A7A7A7] text-sm">Your personal music companion</p>
        </div>

        {/* Login button */}
        <a
          href="/api/auth/login"
          className="w-full flex items-center justify-center gap-3 bg-[#1DB954] hover:bg-[#1ed760] active:scale-95 text-black font-bold text-sm tracking-widest uppercase py-4 px-8 rounded-full transition-all duration-150"
        >
          {/* Spotify mark */}
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          Connect with Spotify
        </a>

        <p className="text-[#6B6B6B] text-xs text-center max-w-xs leading-relaxed">
          By connecting you agree to Spotify's Terms of Service. MySpotify only reads
          your listening history — it never modifies your library.
        </p>
      </div>
    </div>
  );
}
