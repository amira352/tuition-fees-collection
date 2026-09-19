import { useNavigate } from "react-router-dom";
import "./Navbar.css";

/**
 * Top navbar: logo + product title on the left, signed-in employee profile on the right.
 */
export default function Navbar({
  employeeName = "Bank Agent",
  onProfileClick,
}) {
  const navigate = useNavigate();

  const initials =
    employeeName
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
          title="View profile"
        >
          <span>{employeeName}</span>
          <div className="navbar-avatar">{initials}</div>
        </button>
      </div>
    </header>
  );
}