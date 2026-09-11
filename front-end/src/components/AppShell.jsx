import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { getUser, logout } from "../lib/auth";
import "./AppShell.css";

/**
 * Layout for authenticated pages: top bar with the logo + navigation + sign-out,
 * and an <Outlet /> where the routed page renders.
 */
export default function AppShell() {
  const navigate = useNavigate();
  const user = getUser();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="shell">
      <header className="shell-bar">
        <div className="shell-left">
          <Link to="/" className="shell-brand">
            <img src="/cib-logo.png" alt="CIB" />
          </Link>
          <nav className="shell-nav">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `shell-nav-link ${isActive ? "active" : ""}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/upload-dues"
              className={({ isActive }) =>
                `shell-nav-link ${isActive ? "active" : ""}`
              }
            >
              Upload Dues
            </NavLink>
          </nav>
        </div>

        <div className="shell-user">
          <span className="shell-user-name">{user?.name || user?.email}</span>
          <button type="button" className="shell-logout" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
}
