import { useState } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { getUser, logout } from "../lib/auth";
import { Icon } from "../pages/institution/icons";
import "./InstitutionLayout.css";

const NAV = [
  { to: "/institution", label: "Dashboard", icon: "grid", end: true },
  { to: "/institution/fees", label: "Fees", icon: "receipt" },
  { to: "/institution/discounts", label: "Discounts", icon: "tag" },
  { to: "/institution/payments", label: "Payments", icon: "card" },
  { to: "/institution/epp-plans", label: "EPP Plans", icon: "plan" },
  { to: "/institution/upload-dues", label: "Upload Dues", icon: "upload" },
  { to: "/institution/reports", label: "Reports", icon: "chart" },
  { to: "/institution/notifications", label: "Notifications", icon: "bell", badge: 3 },
  { to: "/institution/profile", label: "Institution Profile", icon: "building" },
];

const LOGO_SRC = "/cib-logo.png";

export default function InstitutionLayout() {
  const navigate = useNavigate();
  const user = getUser();
  const [menuOpen, setMenuOpen] = useState(false);

  // This area is for institution accounts only.
  if (user?.role !== "institution") {
    return <Navigate to="/" replace />;
  }

  const institutionName = user?.name || "Your Institution";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="inst">
      {menuOpen && (
        <button
          type="button"
          className="inst-scrim"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`inst-sidebar${menuOpen ? " is-open" : ""}`}>
        <div className="inst-brand">
          <img src={LOGO_SRC} alt="CIB" className="inst-brand-logo" />
          <span className="inst-brand-divider" />
          <span className="inst-brand-text">
            <span className="inst-brand-name">{institutionName}</span>
            <span className="inst-brand-sub">Institution Portal</span>
          </span>
        </div>

        <nav className="inst-nav">
          {NAV.map((item) => {
            const Glyph = Icon[item.icon];
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className="inst-nav-link"
                onClick={() => setMenuOpen(false)}
              >
                <span className="inst-nav-icon"><Glyph /></span>
                <span className="inst-nav-label">{item.label}</span>
                {item.badge ? <span className="inst-nav-badge">{item.badge}</span> : null}
              </NavLink>
            );
          })}
        </nav>

        <button type="button" className="inst-logout" onClick={handleLogout}>
          <span className="inst-nav-icon"><Icon.logout /></span>
          <span>Logout</span>
        </button>
      </aside>

      <div className="inst-main">
        <header className="inst-topbar">
          <button
            type="button"
            className="inst-menu-btn"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Icon.menu />
          </button>

          <div className="inst-topbar-right">
            <button type="button" className="inst-icon-btn" aria-label="Notifications">
              <Icon.bell />
              <span className="inst-icon-badge">3</span>
            </button>
            <span className="inst-topbar-divider" />
            <div className="inst-account">
              <span className="inst-avatar" aria-hidden="true">
                {initials(institutionName)}
              </span>
              <span className="inst-account-text">
                <span className="inst-account-name">{institutionName}</span>
                <span className="inst-account-role">Institution Admin</span>
              </span>
            </div>
          </div>
        </header>

        <main className="inst-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}
