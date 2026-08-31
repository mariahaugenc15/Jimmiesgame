import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DashboardIcon, LeaguesIcon, RosterIcon } from "./navIcons";

const NAV_ITEMS = [
  { to: "/", end: true, label: "Dashboard", icon: DashboardIcon },
  { to: "/roster", end: false, label: "Roster", icon: RosterIcon },
  { to: "/leagues", end: false, label: "Leagues", icon: LeaguesIcon },
];

export function Nav() {
  const { user, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between border-b border-surface-border bg-surface-page/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="text-lg font-extrabold tracking-tight text-primary-400">Locked In</span>
        {user && (
          <div className="ml-4 hidden gap-1 sm:flex">
            {NAV_ITEMS.map(({ to, end, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `group relative flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "text-white" : "text-slate-400 hover:text-slate-200"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon />
                    {label}
                    <span
                      className={`absolute inset-x-2 -bottom-[13px] h-0.5 rounded-full transition-colors ${
                        isActive ? "bg-primary-400" : "bg-transparent group-hover:bg-surface-border"
                      }`}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </div>
        )}
      </div>
      {user && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600/20 text-xs font-bold text-primary-300 ring-1 ring-primary-500/30">
              {user.username.charAt(0).toUpperCase()}
            </span>
            <span className="hidden text-sm font-medium text-slate-300 sm:inline">{user.username}</span>
          </div>
          <button
            onClick={logout}
            className="rounded-md border border-surface-border bg-surface-card px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-danger-500/40 hover:text-danger-300"
          >
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}
