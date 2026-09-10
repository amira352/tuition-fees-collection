import { useState } from "react";
import { apiPost } from "../lib/api";
import { useSearchParams } from "react-router-dom";
import {
  BuildingIcon,
  MailIcon,
  UserIcon,
  BranchIcon,
  LockIcon,
  ChevronDownIcon,
  CheckCircleIcon,
} from "../components/Icons";
import "./shared.css";
import "../Styles/Admin.css";

const INSTITUTION_TYPES = [
  { value: "school", label: "School" },
  { value: "university", label: "University" },
];


const SPECIAL_CHARACTERS = "!@#$%^&*()-_=+[]{};:'\",.<>/?\\|`~";

function passwordProblems(password) {
  const problems = [];
  if (password.length < 8) problems.push("at least 8 characters");
  if (!/\d/.test(password)) problems.push("a number");
  if (!password.split("").some((c) => SPECIAL_CHARACTERS.includes(c))) {
    problems.push("a special character");
  }
  if (password.trim() !== password) problems.push("no leading/trailing spaces");
  return problems;
}

export default function Admin() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "employee" ? "employee" : "institution";
  const [tab, setTab] = useState("institution");
  
  

  return (
    <div className="page">
      <h1 className="page-title">Admin</h1>
      <p className="page-subtitle">Create back-office employee and institution accounts.</p>

      <div className="admin-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "institution"}
          className={`admin-tab${tab === "institution" ? " active" : ""}`}
          onClick={() => setTab("institution")}
        >
          Institution
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "employee"}
          className={`admin-tab${tab === "employee" ? " active" : ""}`}
          onClick={() => setTab("employee")}
        >
          Back-office employee
        </button>
      </div>

      {tab === "institution" ? <InstitutionForm /> : <EmployeeForm />}
    </div>
  );
}

function OptionalPasswordField({ password, setPassword, error, setError, loading }) {
  const [manual, setManual] = useState(false);
  const [show, setShow] = useState(false);

  function handleToggle(useManual) {
    setManual(useManual);
    if (!useManual) {
      setPassword("");
      setError("");
    }
  }

  function handleChange(value) {
    setPassword(value);
    if (!value) {
      setError("");
      return;
    }
    const problems = passwordProblems(value);
    setError(problems.length ? `Password needs ${problems.join(", ")}.` : "");
  }

  return (
    <div className="field">
      <span className="field-label">Password</span>
      <div className="admin-password-toggle">
        <button
          type="button"
          className={`admin-toggle-pill${!manual ? " active" : ""}`}
          onClick={() => handleToggle(false)}
          disabled={loading}
        >
          Auto-generate
        </button>
        <button
          type="button"
          className={`admin-toggle-pill${manual ? " active" : ""}`}
          onClick={() => handleToggle(true)}
          disabled={loading}
        >
          Set it myself
        </button>
      </div>

      {manual && (
        <span className="input-shell" style={{ marginTop: "0.6rem" }}>
          <span className="input-icon">
            <LockIcon />
          </span>
          <input
            type={show ? "text" : "password"}
            placeholder="At least 8 chars, a number, a special character"
            value={password}
            onChange={(e) => handleChange(e.target.value)}
            aria-invalid={Boolean(error)}
            disabled={loading}
          />
          <button
            type="button"
            className="reveal"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? "Hide" : "Show"}
          </button>
        </span>
      )}
      {manual && error && <p className="admin-field-error">{error}</p>}
      {!manual && (
        <p className="help-text admin-hint">
          A temporary password will be generated and shown once after creation.
        </p>
      )}
    </div>
  );
}

function InstitutionForm() {
  const [name, setName] = useState("");
  const [type, setType] = useState("school");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!name.trim() || !email.trim()) {
      setError("Please fill in the institution name and email.");
      return;
    }
    if (password && passwordError) {
      setError("Please fix the password before continuing.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiPost("/admin/users/institution", {
        name: name.trim(),
        type,
        email: email.trim(),
        ...(password ? { password } : {}),
      });
      setResult(data.institution ? { ...data.institution, temporaryPassword: data.temporaryPassword } : null);
      setName("");
      setEmail("");
      setType("school");
      setPassword("");
    } catch (err) {
      setError(err.message || "Couldn't create the institution. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <CreatedAccount
        label="Institution"
        name={result.name}
        email={result.email}
        tempPassword={result.temporaryPassword}
        onDone={() => setResult(null)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card admin-card">
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <label className="field">
        <span className="field-label">Institution name</span>
        <span className="input-shell">
          <span className="input-icon">
            <BuildingIcon />
          </span>
          <input
            type="text"
            placeholder="e.g. Nile International School"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(error)}
            disabled={loading}
          />
        </span>
      </label>

      <label className="field">
        <span className="field-label">Type</span>
        <span className="input-shell">
          <select value={type} onChange={(e) => setType(e.target.value)} disabled={loading}>
            {INSTITUTION_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="input-icon">
            <ChevronDownIcon />
          </span>
        </span>
      </label>

      <label className="field">
        <span className="field-label">Email address</span>
        <span className="input-shell">
          <span className="input-icon">
            <MailIcon />
          </span>
          <input
            type="email"
            inputMode="email"
            placeholder="admissions@school.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(error)}
            disabled={loading}
          />
        </span>
      </label>

      <OptionalPasswordField
        password={password}
        setPassword={setPassword}
        error={passwordError}
        setError={setPasswordError}
        loading={loading}
      />

      <button type="submit" className="btn" disabled={loading}>
        {loading && <span className="spinner" aria-hidden="true" />}
        {loading ? "Creating…" : "Create institution"}
      </button>
    </form>
  );
}

function EmployeeForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [branch, setBranch] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim() || !branch.trim()) {
      setError("Please fill in the name, email and branch.");
      return;
    }
    if (password && passwordError) {
      setError("Please fix the password before continuing.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiPost("/admin/users/back-office", {
        fullName: fullName.trim(),
        email: email.trim(),
        branch: branch.trim(),
        ...(password ? { password } : {}),
      });
      setResult(data.user ? { ...data.user, temporaryPassword: data.temporaryPassword } : null);
      setFullName("");
      setEmail("");
      setBranch("");
      setPassword("");
    } catch (err) {
      setError(err.message || "Couldn't create the employee. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <CreatedAccount
        label="Employee"
        name={result.full_name || result.email}
        email={result.email}
        tempPassword={result.temporaryPassword}
        onDone={() => setResult(null)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card admin-card">
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <label className="field">
        <span className="field-label">Full name</span>
        <span className="input-shell">
          <span className="input-icon">
            <UserIcon />
          </span>
          <input
            type="text"
            placeholder="e.g. Sara Ahmed"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            aria-invalid={Boolean(error)}
            disabled={loading}
          />
        </span>
      </label>

      <label className="field">
        <span className="field-label">Email address</span>
        <span className="input-shell">
          <span className="input-icon">
            <MailIcon />
          </span>
          <input
            type="email"
            inputMode="email"
            placeholder="name@cibeg.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(error)}
            disabled={loading}
          />
        </span>
      </label>

      <label className="field">
        <span className="field-label">Branch</span>
        <span className="input-shell">
          <span className="input-icon">
            <BranchIcon />
          </span>
          <input
            type="text"
            placeholder="e.g. Maadi"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            aria-invalid={Boolean(error)}
            disabled={loading}
          />
        </span>
      </label>

      <OptionalPasswordField
        password={password}
        setPassword={setPassword}
        error={passwordError}
        setError={setPasswordError}
        loading={loading}
      />

      <button type="submit" className="btn" disabled={loading}>
        {loading && <span className="spinner" aria-hidden="true" />}
        {loading ? "Creating…" : "Create employee"}
      </button>
    </form>
  );
}

function CreatedAccount({ label, name, email, tempPassword, onDone }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the password is still visible to copy by hand.
    }
  }

  return (
    <div className="card admin-card">
      <div className="alert-success admin-success" role="status">
        <CheckCircleIcon />
        <span>
          {label} created for {name}.
        </span>
      </div>

      <p className="field-label">Temporary password</p>
      <div className="admin-temp-password">
        <code>{tempPassword}</code>
        <button type="button" className="reveal" onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="help-text admin-temp-note">
        Share this with {email} outside of this screen — they'll be asked to set a new
        password the first time they sign in.
      </p>

      <button type="button" className="btn" onClick={onDone}>
        Add another
      </button>
    </div>
  );
}