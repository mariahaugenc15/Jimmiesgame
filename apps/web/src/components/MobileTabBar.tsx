import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const TABS = [
  { to: "/", label: "Home", end: true },
  { to: "/roster", label: "Roster", end: false },
  { to: "/leagues", label: "Leagues", end: false },
];

export function MobileTabBar() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-800 bg-slate-950 sm:hidden">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `flex-1 py-3 text-center text-sm font-medium ${isActive ? "text-emerald-400" : "text-slate-400"}`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
