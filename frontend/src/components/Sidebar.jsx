import { NavLink } from "react-router-dom";
import { Zap, LayoutGrid, PenLine } from "lucide-react";

const navItems = [
  { to: "/tracker", icon: <LayoutGrid size={16} />, label: "Job Tracker" },
  { to: "/generate", icon: <Zap size={16} />, label: "Generate Resume" },
  { to: "/edit", icon: <PenLine size={16} />, label: "Manual Edit" },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">
          Apply<span>Flow</span>
        </div>
        <div className="sidebar-logo-sub">v2 · Resume Engine</div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-text">Shreyas Achary · 2026</div>
      </div>
    </aside>
  );
}
