import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { MailIcon, LockIcon } from "../components/Icons";
import { login } from "../lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      // First-time accounts must set a password before they can go anywhere.
      navigate(result.mustChangePassword ? "/set-password" : redirectTo, {
        replace: true,
      });
    } catch (err) {
      setError(
        err.status
          ? err.message
          : "We couldn't reach the server. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
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
    </AuthShell>
  );
}
