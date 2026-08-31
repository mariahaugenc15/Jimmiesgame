import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Nav() {
  const { user, logout } = useAuth();
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-emerald-700 text-white" : "text-slate-300 hover:bg-slate-800"}`;

  return (
    <nav className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-emerald-400">Locked In</span>
        {user && (
          <div className="ml-4 hidden gap-1 sm:flex">
            <NavLink to="/" end className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/roster" className={linkClass}>
              Roster
            </NavLink>
            <NavLink to="/leagues" className={linkClass}>
              Leagues
            </NavLink>
          </div>
        )}
      </div>
      {user && (
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <span>{user.username}</span>
          <button onClick={logout} className="rounded-md bg-slate-800 px-3 py-1 hover:bg-slate-700">
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}
