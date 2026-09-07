import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getUser, logout } from "../lib/auth";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { NAV_ITEMS } from "./navItems";
import "./AppShell.css";

function resolveActivePage(pathname) {
  const match = NAV_ITEMS.find((item) => pathname.startsWith(item.path));
  return match?.key ?? "dashboard";
}

/**
 * Layout for authenticated pages: navbar, sidebar, and page content via <Outlet />.
 */
export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const employeeName = user?.name || user?.email || "Bank Agent";
  const activePage = resolveActivePage(location.pathname);

  function handleNavigate(key) {
    const item = NAV_ITEMS.find((entry) => entry.key === key);
    if (item) navigate(item.path);
  }

  function handleSignOut() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="shell">
      <Navbar employeeName={employeeName} onSignOut={handleSignOut} />

      <div className="shell-body">
        <Sidebar activePage={activePage} onNavigate={handleNavigate} />
        <main className="shell-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
