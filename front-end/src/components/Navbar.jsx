import { useNavigate } from "react-router-dom";
import { logout } from "../lib/auth";
import "./Navbar.css";

/**
 * Top navbar: logo + product title on the left, signed-in employee on the right.
 * All navigation links live in <Sidebar /> instead.
 */
export default function Navbar({ employeeName = "Bank Agent", onSignOut }) {
  const navigate = useNavigate();

  const initials = employeeName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = () => {
    // 1. Call external callback if provided
    if (typeof onSignOut === "function") {
      onSignOut();
      return;
    }

    // 2. Default: clear auth keys and redirect to login
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <img className="navbar-logo" src="/cib-logo.png" alt="Commercial International Bank" />
        <span className="navbar-title">Tuition & Services Fees Collection</span>
      </div>

      <div className="navbar-user">
        <span>{employeeName}</span>
        <div className="navbar-avatar">{initials}</div>
        <button type="button" className="navbar-signout" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}