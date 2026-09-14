import { useNavigate } from "react-router-dom";
import { logout } from "../lib/auth";
import "./Navbar.css";

/**
 * Top navbar: logo + product title on the left, signed-in employee on the right.
 * All navigation links live in <Sidebar /> instead.
 */
export default function Navbar({
  employeeName = "Bank Agent",
  onSignOut,
  onProfileClick,
}) {
  const navigate = useNavigate();

  const initials = employeeName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "BA";

  const handleProfileClick = () => {
    if (typeof onProfileClick === "function") {
      onProfileClick();
      return;
    }
    navigate("/profile");
  };

  const handleSignOut = () => {
    if (typeof onSignOut === "function") {
      onSignOut();
      return;
    }
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <img
          className="navbar-logo"
          src="/cib-logo.png"
          alt="Commercial International Bank"
        />
        <span className="navbar-title">Tuition & Services Fees Collection</span>
      </div>

      <div className="navbar-user">
        <button
          type="button"
          className="navbar-user-btn"
          onClick={handleProfileClick}
        >
          <span>{employeeName}</span>
          <div className="navbar-avatar">{initials}</div>
        </button>
        <button
          type="button"
          className="navbar-signout"
          onClick={handleSignOut}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}