import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Nav } from "./components/Nav";
import { MobileTabBar } from "./components/MobileTabBar";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { RosterPage } from "./pages/RosterPage";
import { MatchPage } from "./pages/MatchPage";
import { LeaguesPage } from "./pages/LeaguesPage";
import { BrandTestPage } from "./pages/BrandTestPage";
import { LockedInLogo } from "./components/LockedInLogo";

function AppLoading() {
  return (
    <div className="flex h-[70vh] items-center justify-center">
      <LockedInLogo mode="loop" size={48} />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <AppLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <div className="min-h-screen bg-surface-page text-slate-100">
      <Nav />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/brand" element={<BrandTestPage />} />
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
      </Routes>
      <MobileTabBar />
    </div>
  );
}
