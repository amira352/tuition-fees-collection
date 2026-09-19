import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getUser, logout } from "../lib/auth";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { NAV_ITEMS } from "./navItems";
import "./AppShell.css";

function resolveActivePage(location) {
  const { pathname, search, state } = location;

  // 1. Profile route
  if (pathname.startsWith("/profile")) {
    return "profile";
  }

  // 2. Admin creation forms routed via query params: /admin?tab=...
  if (pathname === "/admin") {
    const params = new URLSearchParams(search);
    const tab = params.get("tab");

    if (tab === "employee") {
      const boItem = NAV_ITEMS.find((item) => item.path === "/admin/back-office");
      return boItem?.key ?? "back-office";
    }

    if (tab === "institution") {
      const instItem = NAV_ITEMS.find((item) => item.path === "/admin/institutions");
      return instItem?.key ?? "institutions";
    }
  }

  // 3. Receipts archive section
  if (pathname.startsWith("/receipts")) {
    return "receipts";
  }

  if (
      pathname.startsWith("/payment") ||
      pathname === "/receipt" ||
      pathname.startsWith("/receipt?")
    ) {
      return "browse";
    }

  // 6. Match direct paths from NAV_ITEMS (exact or prefix match)
  const match = NAV_ITEMS.find((item) => pathname.startsWith(item.path));
  return match?.key ?? "dashboard";
}

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const employeeName = user?.name || user?.email || "Bank Agent";
  const activePage = resolveActivePage(location);

  function handleNavigate(key) {
    if (key === "profile") {
      navigate("/profile");
      return;
    }

    const item = NAV_ITEMS.find((entry) => entry.key === key);
    if (item) {
      navigate(item.path);
    }
  }

  function handleSignOut() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="shell">
      <Navbar
        employeeName={employeeName}
        onProfileClick={() => navigate("/profile")}
      />

      <div className="shell-body">
        <Sidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          onSignOut={handleSignOut}
        />

        <main className="shell-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}