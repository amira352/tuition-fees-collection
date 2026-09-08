import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { LockIcon } from "../components/Icons";
import { changePassword, mustChangePassword } from "../lib/auth";
import "./SetPassword.css";

const RULES = [
  { key: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  {
    key: "mix",
    label: "Contains a letter and a number",
    test: (p) => /[A-Za-z]/.test(p) && /\d/.test(p),
  },
];

export default function SetPassword() {
  const navigate = useNavigate();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const rules = useMemo(
    () => RULES.map((r) => ({ ...r, ok: r.test(next) })),
    [next],
  );
  const differs = next.length > 0 && next !== current;
  const matches = confirm.length > 0 && confirm === next;
  const valid =
    current.length > 0 && rules.every((r) => r.ok) && differs && matches;

  // Only first-login accounts belong on this page.
  if (!mustChangePassword()) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!valid) {
      setError("Please meet all the requirements listed below.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(current, next);
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err.status === 401
          ? "The temporary password is incorrect."
          : err.status
            ? err.message
            : "We couldn't reach the server. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} noValidate>
        <h1 className="title">Set your password</h1>
        <p className="subtitle">
          For security, choose a new password before continuing. The temporary
          password you received will stop working.
        </p>

        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}

        <PasswordField
          label="Temporary password"
          value={current}
          onChange={setCurrent}
          show={show}
          autoComplete="current-password"
          placeholder="The password CIB sent you"
          disabled={loading}
        />
        <PasswordField
          label="New password"
          value={next}
          onChange={setNext}
          show={show}
          autoComplete="new-password"
          placeholder="Choose a new password"
          disabled={loading}
          invalid={next.length > 0 && (!rules.every((r) => r.ok) || !differs)}
        />
        <PasswordField
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          show={show}
          autoComplete="new-password"
          placeholder="Re-enter the new password"
          disabled={loading}
          invalid={confirm.length > 0 && !matches}
        />

        <label className="show-row">
          <input
            type="checkbox"
            checked={show}
            onChange={(e) => setShow(e.target.checked)}
          />
          Show passwords
        </label>

        <ul className="rules">
          {rules.map((r) => (
            <li key={r.key} className={r.ok ? "is-ok" : ""}>
              <Dot ok={r.ok} />
              {r.label}
            </li>
          ))}
          <li className={differs ? "is-ok" : ""}>
            <Dot ok={differs} />
            Different from the temporary password
          </li>
          <li className={matches ? "is-ok" : ""}>
            <Dot ok={matches} />
            Both new-password fields match
          </li>
        </ul>

        <button type="submit" className="btn" disabled={loading || !valid}>
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading ? "Saving…" : "Set password & continue"}
        </button>
      </form>
    </AuthShell>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  invalid = false,
  ...inputProps
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-shell">
        <span className="input-icon"><LockIcon /></span>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid}
          {...inputProps}
        />
      </span>
    </label>
  );
}

function Dot({ ok }) {
  return (
    <span className={`rule-dot${ok ? " is-ok" : ""}`} aria-hidden="true">
      {ok ? "✓" : ""}
    </span>
  );
}
