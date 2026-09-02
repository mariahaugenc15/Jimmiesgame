import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LockedInLogo } from "../components/LockedInLogo";
import { buttonPrimary } from "../lib/ui";

/** Catches any URL that doesn't match a real route - without this, React Router renders nothing at all for a bad link, a blank screen with just the nav bar. */
export function NotFoundPage() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <LockedInLogo mode="static" size={40} />
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Page not found</h1>
        <p className="mt-2 text-sm text-slate-400">That link doesn't lead anywhere in Locked In.</p>
      </div>
      <Link to={user ? "/" : "/login"} className={buttonPrimary}>
        {user ? "Back to Dashboard" : "Back to login"}
      </Link>
    </div>
  );
}
