import "./Sidebar.css";
import { NAV_ITEMS } from "./navItems";

export { NAV_ITEMS };

/**
 * Left sidebar nav. `activePage` controls the highlighted item;
 * `onNavigate` fires with the clicked item's key.
 */
export default function Sidebar({ activePage = "dashboard", onNavigate }) {
  return (
    <nav className="sidebar">
      {NAV_ITEMS.map((item) => (
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
