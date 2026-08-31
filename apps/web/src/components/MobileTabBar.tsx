import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DashboardIcon, LeaguesIcon, RosterIcon } from "./navIcons";

const TABS = [
  { to: "/", label: "Home", end: true, icon: DashboardIcon },
  { to: "/roster", label: "Roster", end: false, icon: RosterIcon },
  { to: "/leagues", label: "Leagues", end: false, icon: LeaguesIcon },
];

export function MobileTabBar() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-surface-border bg-surface-page/95 backdrop-blur sm:hidden">
      {TABS.map(({ to, label, end, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 border-t-2 py-2.5 text-xs font-medium transition-colors ${
              isActive ? "border-primary-400 text-primary-300" : "border-transparent text-slate-500"
            }`
          }
        >
          <Icon />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
