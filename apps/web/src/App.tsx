import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Nav } from "./components/Nav";
import { MobileTabBar } from "./components/MobileTabBar";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { RosterPage } from "./pages/RosterPage";
import { MatchPage } from "./pages/MatchPage";
import { LeaguesPage } from "./pages/LeaguesPage";
import { JoinLeaguePage } from "./pages/JoinLeaguePage";
import { BrandTestPage } from "./pages/BrandTestPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LockedInLogo } from "./components/LockedInLogo";
import { RouteBackdrop } from "./components/playdiagram/RouteBackdrop";

function AppLoading() {
  return (
    <div className="flex h-[70vh] items-center justify-center">
      <LockedInLogo mode="loop" size={48} />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <AppLoading />;
  // Carries the page someone was trying to reach (e.g. a shared league
  // invite link) through the login/signup detour, so LoginPage/SignupPage
  // can send them there afterward instead of always to the Dashboard.
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <div className="min-h-screen bg-surface-page text-slate-100">
      <RouteBackdrop />
      <Nav />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        {/* Component/style reference page for development only - not reachable in the production build. */}
        {import.meta.env.DEV && <Route path="/brand" element={<BrandTestPage />} />}
        <Route
          path="/"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/roster"
          element={
            <RequireAuth>
              <RosterPage />
            </RequireAuth>
          }
        />
        <Route
          path="/leagues"
          element={
            <RequireAuth>
              <LeaguesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/match/:matchId"
          element={
            <RequireAuth>
              <MatchPage />
            </RequireAuth>
          }
        />
        <Route
          path="/join-league/:leagueId"
          element={
            <RequireAuth>
              <JoinLeaguePage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <MobileTabBar />
    </div>
  );
}
