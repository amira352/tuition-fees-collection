import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPatch } from "../lib/api";
import { changePassword, getToken, getUser } from "../lib/auth";
import "./shared.css";
import "../Styles/ProfilePage.css";

const ROLE_LABEL = {
  admin: "System Administrator",
  back_office: "Back Office Agent",
};

const ROLE_CAPABILITIES = {
  back_office: [
    "National ID Lookup",
    "Manual Fee Collection",
    "Issue Official Receipts",
    "EPP Plan Activation",
  ],
  admin: [
    "National ID Lookup",
    "Manual Fee Collection",
    "Issue Official Receipts",
    "EPP Plan Activation",
    "Add / Manage Institutions",
    "Register Back-Office Staff",
  ],
};

const PASSWORD_RULES = [
  { key: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  {
    key: "mix",
    label: "Contains a letter and a number",
    test: (p) => /[A-Za-z]/.test(p) && /\d/.test(p),
  },
];

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initialsOf(name) {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const localUser = getUser();

  const [profile, setProfile] = useState(localUser);
  const [todayStats, setTodayStats] = useState(null);
  const [statsUnavailable, setStatsUnavailable] = useState(false);
  const [lookupCount, setLookupCount] = useState(null);
  const [auditUnavailable, setAuditUnavailable] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(localUser?.fullName || "");
  const [savingName, setSavingName] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    apiGet("/auth/me")
      .then((data) => {
        if (!cancelled && data?.user) {
          setProfile(data.user);
          setNameDraft(data.user.fullName || "");
        }
      })
      .catch(() => {});

    apiGet("/payments/me/today")
      .then((data) => !cancelled && setTodayStats(data))
      .catch(() => !cancelled && setStatsUnavailable(true));

    apiGet("/bank/me/lookups")
      .then((data) => !cancelled && setLookupCount(data?.lookups?.length ?? 0))
      .catch(() => !cancelled && setAuditUnavailable(true));

    return () => {
      cancelled = true;
    };
  }, []);

  const role = profile?.role || localUser?.role;
  const isAdmin = role === "admin";
  const capabilities = ROLE_CAPABILITIES[role] || [];

  async function handleSaveName(event) {
    event.preventDefault();
    setSavingName(true);
    try {
      const data = await apiPatch("/auth/me", { fullName: nameDraft.trim() });
      if (data?.user) {
        setProfile(data.user);
        // Sync local storage cache
        const cached = getUser();
        if (cached) {
          localStorage.setItem("user", JSON.stringify({ ...cached, fullName: data.user.fullName }));
        }
      }
      setEditingName(false);
    } catch {
      // API fallback handling
    } finally {
      setSavingName(false);
    }
  }

  const pwRules = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(next) }));
  const pwValid =
    current.length > 0 &&
    pwRules.every((r) => r.ok) &&
    next !== current &&
    confirm === next &&
    confirm.length > 0;

  async function handleChangePassword(event) {
    event.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (!pwValid) {
      setPwError("Please meet all the requirements listed below.");
      return;
    }
    setPwLoading(true);
    try {
      await changePassword(current, next);
      setPwSuccess("Password changed successfully.");
      setCurrent("");
      setNext("");
      setConfirm("");
      setShowPasswordForm(false);
    } catch (err) {
      setPwError(
        err.status === 401
          ? "Your current password is incorrect."
          : err.message || "Something went wrong. Please try again."
      );
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">My profile</h1>
      <p className="page-subtitle">Account details, access and activity.</p>

      {/* Identity header */}
      <div className="card profile-header">
        <div className="profile-avatar">{initialsOf(profile?.fullName)}</div>
        <div className="profile-header-info">
          {editingName ? (
            <form className="profile-name-edit" onSubmit={handleSaveName}>
              <input
                className="field-input"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn btn-sm" disabled={savingName}>
                {savingName ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEditingName(false);
                  setNameDraft(profile?.fullName || "");
                }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <h2 className="profile-name">
              {profile?.fullName || "—"}
              <button
                type="button"
                className="btn-link profile-edit-link"
                onClick={() => setEditingName(true)}
              >
                Edit
              </button>
            </h2>
          )}

          <span className="profile-meta">{profile?.email}</span>

          <div className="profile-badges">
            <span className="status-pill status-settled">
              {ROLE_LABEL[role] || "Back Office Agent"}
            </span>
            {profile?.branch && <span className="profile-branch-pill">{profile.branch}</span>}
          </div>
        </div>
      </div>

      <div className="profile-grid">
        {/* Access & permissions */}
        <div className="card">
          <h3 className="profile-card-title">Access & permissions</h3>
          <p className="profile-card-subtitle">
            {isAdmin
              ? "This account has administrator privileges."
              : "This account does not have administrator privileges."}
          </p>
          <ul className="capability-list">
            {capabilities.map((cap) => (
              <li key={cap}>
                <span className="capability-check">✓</span> {cap}
              </li>
            ))}
          </ul>
        </div>

        {/* Security */}
        <div className="card">
          <h3 className="profile-card-title">Security</h3>
          <dl className="profile-facts">
            <div>
              <dt>Password last changed</dt>
              <dd>{formatDateTime(profile?.password_changed_at || profile?.passwordChangedAt)}</dd>
            </div>
            {profile?.lastLoginAt && (
              <div>
                <dt>Last login</dt>
                <dd>{formatDateTime(profile.lastLoginAt)}</dd>
              </div>
            )}
            {profile?.lastLoginIp && (
              <div>
                <dt>Last login IP</dt>
                <dd>{profile.lastLoginIp}</dd>
              </div>
            )}
          </dl>

          {!showPasswordForm ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setPwSuccess("");
                setShowPasswordForm(true);
              }}
            >
              Change password
            </button>
          ) : (
            <form className="profile-password-form" onSubmit={handleChangePassword}>
              <label className="field-label">Current password</label>
              <input
                type="password"
                className="field-input"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />

              <label className="field-label">New password</label>
              <input
                type="password"
                className="field-input"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />

              <label className="field-label">Confirm new password</label>
              <input
                type="password"
                className="field-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />

              <ul className="password-rules">
                {pwRules.map((r) => (
                  <li key={r.key} className={r.ok ? "ok" : ""}>
                    {r.ok ? "✓" : "•"} {r.label}
                  </li>
                ))}
              </ul>

              {pwError && <p className="profile-form-error">{pwError}</p>}

              <div className="profile-password-actions">
                <button type="submit" className="btn btn-sm" disabled={pwLoading}>
                  {pwLoading ? "Saving…" : "Save new password"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowPasswordForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {pwSuccess && <p className="profile-form-success">{pwSuccess}</p>}
        </div>

        {/* Daily performance */}
        <div className="card">
          <h3 className="profile-card-title">Today's activity</h3>
          {statsUnavailable ? (
            <p className="profile-card-subtitle">Not available yet.</p>
          ) : (
            <div className="profile-stat-row">
              <div>
                <span className="profile-stat-value">{todayStats?.count ?? "—"}</span>
                <span className="profile-stat-label">Transactions processed</span>
              </div>
              <div>
                <span className="profile-stat-value">
                  {todayStats ? `EGP ${Number(todayStats.total).toLocaleString()}` : "—"}
                </span>
                <span className="profile-stat-label">Total settled</span>
              </div>
            </div>
          )}
        </div>

        {/* Audit footprint */}
        <div className="card">
          <h3 className="profile-card-title">Audit footprint</h3>
          <p className="profile-card-subtitle">
            {auditUnavailable
              ? "Lookup history is not available yet."
              : `${lookupCount ?? 0} National ID lookups on record.`}
          </p>
          <button
            type="button"
            className="btn-link"
            onClick={() => navigate("/receipts")}
          >
            View my transaction receipts →
          </button>
        </div>
      </div>
    </div>
  );
}
