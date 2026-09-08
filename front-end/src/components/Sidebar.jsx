import "./Sidebar.css";
import { NAV_ITEMS } from "./navItems";
import { getUser } from "../lib/auth";

export { NAV_ITEMS };

/**
 * Left sidebar nav. `activePage` controls the highlighted item;
 * `onNavigate` fires with the clicked item's key.
 */
export default function Sidebar({ activePage = "dashboard", onNavigate }) {
  const role = getUser()?.role;
  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <nav className="sidebar">
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
    </nav>
  );
}
