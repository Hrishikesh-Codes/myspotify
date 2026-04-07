import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PlayerProvider } from "@/contexts/PlayerContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/layout/Layout";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Explore from "@/pages/Explore";
import Library from "@/pages/Library";
import TrackView from "@/pages/TrackView";
import ArtistView from "@/pages/ArtistView";
import AlbumView from "@/pages/AlbumView";
import Playlist from "@/pages/Playlist";
import MoodTrends from "@/pages/stats/MoodTrends";
import ListeningPatterns from "@/pages/stats/ListeningPatterns";
import TasteProfile from "@/pages/stats/TasteProfile";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlayerProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected — all app routes under Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="explore" element={<Explore />} />
            <Route path="library" element={<Library />} />
            <Route path="track/:id" element={<TrackView />} />
            <Route path="artist/:id" element={<ArtistView />} />
            <Route path="album/:id" element={<AlbumView />} />
            <Route path="playlist/:id" element={<Playlist />} />
            <Route path="stats/mood" element={<MoodTrends />} />
            <Route path="stats/patterns" element={<ListeningPatterns />} />
            <Route path="stats/taste" element={<TasteProfile />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </PlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
