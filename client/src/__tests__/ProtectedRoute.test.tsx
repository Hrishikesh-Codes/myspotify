/**
 * Tests for ProtectedRoute — ensures unauthenticated users are redirected
 * to /login and authenticated users see their children.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthContext } from "@/contexts/AuthContext";
import type { AuthUser } from "@/contexts/AuthContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_USER: AuthUser = {
  spotifyId: "spotify_abc",
  displayName: "Test User",
  email: "test@example.com",
  profileImage: "",
  lastLogin: "2024-01-01T00:00:00Z",
};

function renderWithAuth(
  user: AuthUser | null,
  loading: boolean,
  initialPath = "/protected"
) {
  const authValue = {
    user,
    loading,
    logout: vi.fn(),
    refresh: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ProtectedRoute", () => {
  it("shows a loading spinner while auth status is being determined", () => {
    const { container } = renderWithAuth(null, true);
    // Spinner div should be present, not the protected content
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("redirects to /login when user is null and not loading", () => {
    renderWithAuth(null, false);
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("renders children when user is authenticated", () => {
    renderWithAuth(MOCK_USER, false);
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
  });
});
