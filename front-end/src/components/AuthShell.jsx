import "./AuthShell.css";

const LOGO_SRC = "/cib-logo.png";

/**
 * Centered card layout for unauthenticated pages
 * (login, and later: forgot password, reset password, etc.).
 */
export default function AuthShell({ children }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <header className="auth-card-head">
          <img className="auth-logo" src={LOGO_SRC} alt="Commercial International Bank" />
        </header>
        {children}
      </div>

      <footer className="auth-foot">
        © {new Date().getFullYear()} Commercial International Bank · Authorized access only
      </footer>
    </div>
  );
}
