import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { getUser, logout } from "../lib/auth";
import { apiGet } from "../lib/api";
import { Icon } from "../pages/institution/icons";
import "./InstitutionLayout.css";

const NAV = [
  { to: "/institution", label: "Dashboard", icon: "grid", end: true },
  { to: "/institution/students", label: "Students", icon: "users" },
  { to: "/institution/fees", label: "Fees", icon: "receipt" },
  // Discounts is hidden for now; restore this entry with its route in App.jsx.
  // { to: "/institution/discounts", label: "Discounts", icon: "tag" },
  { to: "/institution/payments", label: "Payments", icon: "card" },
  // EPP Plans is hidden for now; restore this entry to re-enable.
  // { to: "/institution/epp-plans", label: "EPP Plans", icon: "plan" },
  { to: "/institution/upload-dues", label: "Upload Dues", icon: "upload" },
  { to: "/institution/reports", label: "Reports", icon: "chart" },
  // Notifications is hidden for now; restore this entry to re-enable.
  // { to: "/institution/notifications", label: "Notifications", icon: "bell", badge: 3 },
  { to: "/institution/profile", label: "Institution Profile", icon: "building" },
];

const LOGO_SRC = "/cib-logo.png";

export default function InstitutionLayout() {
  const navigate = useNavigate();
  const user = getUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);

  // Loaded once for the sidebar/topbar avatars; the Profile page (reached
  // through the Outlet context below) pushes a fresh value here the moment
  // it saves a new picture, so both spots update without a reload.
  // Runs even for a non-institution user (harmless no-op below) — hooks
  // can't be called after the early return underneath.
  useEffect(() => {
    if (!user?.id || user?.role !== "institution") return;
    let cancelled = false;

    apiGet(`/institutions/${user.id}/profile`)
      .then((profile) => {
        if (!cancelled) setAvatarUrl(profile.avatar_base64 || null);
      })
      .catch(() => {
        // Non-critical — the initials fallback covers this.
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

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
          <span className="inst-brand-text">
            <span className="inst-brand-name">{institutionName}</span>
            <span className="inst-brand-sub">Institution Portal</span>
          </span>
        </div>

        <span className="inst-section-label">Menu</span>
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

        <div className="inst-sidebar-foot">
          <span className="inst-section-label">Account</span>
          <div className="inst-profile">
            <span className="inst-profile-avatar" aria-hidden="true">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : initials(institutionName)}
            </span>
            <span className="inst-profile-text">
              <span className="inst-profile-name">Institution Admin</span>
              <span className="inst-profile-sub">{institutionName}</span>
            </span>
            <button type="button" className="inst-logout" aria-label="Logout" title="Logout" onClick={handleLogout}>
              <Icon.logout />
            </button>
          </div>
        </div>
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
            <div className="inst-account">
              <span className="inst-avatar" aria-hidden="true">
                {avatarUrl ? <img src={avatarUrl} alt="" /> : initials(institutionName)}
              </span>
              <span className="inst-account-text">
                <span className="inst-account-name">{institutionName}</span>
                <span className="inst-account-role">Institution Admin</span>
              </span>
            </div>
          </div>
        </header>

        <main className="inst-content">
          <Outlet context={{ setAvatarUrl }} />
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
