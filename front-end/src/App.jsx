import { useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Logo lives in public/. To use the official PNG: save it as public/cib-logo.png
// and change this to "/cib-logo.png".
const LOGO_SRC = "/cib-logo.png";

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/loginUser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Sign in failed. Please try again.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser({ ...data.user, role: data.role });
    } catch {
      setError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <div className="card">
        <header className="card-head">
          <img className="logo" src={LOGO_SRC} alt="Commercial International Bank" />
        </header>

        {user ? (
          <div className="signed-in">
            <h1 className="title">You're signed in</h1>
            <p className="subtitle">
              {user.name || user.email}
              <span className="role-badge">{user.role.replace("_", " ")}</span>
            </p>
            <button
              className="btn"
              onClick={() => {
                localStorage.clear();
                setUser(null);
                setEmail("");
                setPassword("");
              }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <h1 className="title">Sign in to your account</h1>
            <p className="subtitle">Use your registered email and password.</p>

            {error && (
              <div className="alert" role="alert">
                {error}
              </div>
            )}

            <label className="field">
              <span className="field-label">Email address</span>
              <span className="input-shell">
                <span className="input-icon"><MailIcon /></span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(error)}
                  disabled={loading}
                />
              </span>
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <span className="input-shell">
                <span className="input-icon"><LockIcon /></span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(error)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="reveal"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
            </label>

            <button type="submit" className="btn" disabled={loading}>
              {loading && <span className="spinner" aria-hidden="true" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <p className="help-text">
              Trouble signing in? Contact your system administrator.
            </p>
          </form>
        )}
      </div>

      <footer className="page-foot">
        © {new Date().getFullYear()} Commercial International Bank · Authorized access only
      </footer>
    </div>
  );
}
