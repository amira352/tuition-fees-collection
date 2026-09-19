import "./Sidebar.css";
import { NAV_ITEMS } from "./navItems";
import { getUser } from "../lib/auth";

export default function Sidebar({
  activePage = "dashboard",
  onNavigate,
  onSignOut,
}) {
  const role = getUser()?.role;
  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <nav className="sidebar">
      {/* Top Menu Links */}
      <div className="sidebar-menu">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`sidebar-link ${activePage === item.key ? "active" : ""}`}
            onClick={() => onNavigate?.(item.key)}
          >
            <span className="sidebar-dot" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Pinned Bottom Actions */}
      <div className="sidebar-footer">
        <hr className="sidebar-divider" />

        <button
          type="button"
          className={`sidebar-link ${activePage === "profile" ? "active" : ""}`}
          onClick={() => onNavigate?.("profile")}
        >
          <span className="sidebar-dot" />
          Profile
        </button>

        <button
          type="button"
          className="sidebar-link sidebar-signout-link"
          onClick={onSignOut}
        >
          <span className="sidebar-dot" />
          Sign out
        </button>
      </div>
    </nav>
  );
}