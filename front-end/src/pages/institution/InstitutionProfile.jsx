import { useMemo, useRef, useState } from "react";
import { BuildingIcon, LockIcon } from "../../components/Icons";
import { changePassword, getUser } from "../../lib/auth";
import { getMockProfileExtras } from "./profileData";
import { SectionCard } from "./widgets";
import "./InstitutionProfile.css";

const TYPE_LABEL = { school: "School", university: "University" };
const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2MB

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function avatarKey(userId) {
  return `institution_avatar_${userId ?? "unknown"}`;
}

export default function InstitutionProfile() {
  const user = getUser();
  const extras = useMemo(() => getMockProfileExtras(user), [user]);
  const [editOpen, setEditOpen] = useState(false);

  const [avatar, setAvatar] = useState(() => {
    try {
      return localStorage.getItem(avatarKey(user?.id)) || null;
    } catch {
      return null;
    }
  });

  function handleAvatarSelected(dataUrl) {
    setAvatar(dataUrl);
    // TODO: upload to the backend once a profile-picture endpoint exists.
    // Stored locally in this browser only, for now.
    try {
      localStorage.setItem(avatarKey(user?.id), dataUrl);
    } catch {
      // storage full/unavailable — the picture still shows for this session
    }
  }

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <h1 className="dash-title">Institution Profile</h1>
          <p className="dash-subtitle">View and manage your institution information and settings.</p>
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-card-banner" />

        <div className="profile-card-content">
          <span className="profile-avatar profile-avatar--floating">
            {avatar ? <img src={avatar} alt="" /> : <BuildingIcon />}
          </span>

          <div className="profile-card-main">
            <div className="profile-card-top">
              <div className="profile-name-line">
                <h2 className="profile-name">{user?.name || "Your Institution"}</h2>
                <span className="badge">{TYPE_LABEL[user?.type] || user?.type || "Institution"}</span>
                <span className="badge badge--active">
                  <span className="badge-dot" />
                  Active
                </span>
              </div>
              <button type="button" className="profile-edit-btn" onClick={() => setEditOpen(true)}>
                <PencilIcon />
                Edit Profile
              </button>
            </div>
            <p className="profile-meta">
              Institution ID <strong>{extras.displayId}</strong>
              <span className="profile-meta-sep" aria-hidden="true" />
              Joined {formatDate(extras.joinedDate)}
            </p>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        <SectionCard title="Institution Information" icon="building">
          <dl className="profile-fields">
            <Field label="Institution Name" value={user?.name} />
            <Field label="Institution Type" value={TYPE_LABEL[user?.type] || user?.type} />
            <Field label="Institution ID" value={extras.displayId} />
            <Field
              label="Status"
              value={<span className="badge badge--active"><span className="badge-dot" />Active</span>}
              raw
            />
            <Field label="Joined Date" value={formatDate(extras.joinedDate)} />
          </dl>
        </SectionCard>

        <SectionCard title="Contact Information" icon="card">
          <dl className="profile-fields">
            <Field label="Email" value={user?.email} />
            <Field label="Phone" value={extras.contact.phone} />
          </dl>
        </SectionCard>
      </div>

      {editOpen && (
        <EditProfileModal onClose={() => setEditOpen(false)} onAvatarSelected={handleAvatarSelected} />
      )}
    </div>
  );
}

function Field({ label, value, raw = false }) {
  return (
    <div className="profile-field">
      <dt>{label}</dt>
      <dd>{raw ? value : value || "—"}</dd>
    </div>
  );
}

/* ============================= Edit Profile modal ============================= */

function EditProfileModal({ onClose, onAvatarSelected }) {
  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div
        className="profile-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="profile-modal-head">
          <h2 className="profile-modal-title">Edit Profile</h2>
          <button type="button" className="profile-modal-close" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <AvatarPicker onSelected={onAvatarSelected} />
        <ChangePasswordForm />

        <button type="button" className="profile-done-btn" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

function AvatarPicker({ onSelected }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  function handleChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError("Image must be 2MB or smaller.");
      return;
    }

    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
      onSelected(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <section className="profile-modal-section">
      <h3 className="profile-modal-section-title">Profile Picture</h3>
      <div className="avatar-picker">
        <span className="profile-avatar profile-avatar--sm">
          {preview ? <img src={preview} alt="" /> : <BuildingIcon />}
        </span>
        <div>
          <button type="button" className="profile-edit-btn" onClick={() => fileInputRef.current?.click()}>
            <CameraIcon />
            Change Picture
          </button>
          <p className="profile-hint">JPG or PNG, up to 2MB. Saved to this device only for now.</p>
          {error && <p className="profile-avatar-error">{error}</p>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="profile-avatar-input"
          onChange={handleChange}
        />
      </div>
    </section>
  );
}

// Mirrors backend/src/utils/password.util.js's getPasswordProblems().
const RULES = [
  { key: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { key: "number", label: "Contains a number", test: (p) => /\d/.test(p) },
  {
    key: "special",
    label: "Contains a special character",
    test: (p) => /[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/.test(p),
  },
  { key: "space", label: "No leading or trailing space", test: (p) => p.trim() === p && p.length > 0 },
];

function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const rules = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(next) })), [next]);
  const differs = next.length > 0 && next !== current;
  const matches = confirm.length > 0 && confirm === next;
  const valid = current.length > 0 && rules.every((r) => r.ok) && differs && matches;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess(false);
    if (!valid) {
      setError("Please meet all the requirements listed below.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(current, next, confirm);
      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
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
    <section className="profile-modal-section">
      <h3 className="profile-modal-section-title">Change Password</h3>
      <form onSubmit={handleSubmit} noValidate>
        {error && <div className="alert" role="alert">{error}</div>}
        {success && <div className="alert-success" role="status">Password updated successfully.</div>}

        <label className="field">
          <span className="field-label">Current password</span>
          <span className="input-shell">
            <span className="input-icon"><LockIcon /></span>
            <input
              type={show ? "text" : "password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />
          </span>
        </label>

        <label className="field">
          <span className="field-label">New password</span>
          <span className="input-shell">
            <span className="input-icon"><LockIcon /></span>
            <input
              type={show ? "text" : "password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
              aria-invalid={next.length > 0 && (!rules.every((r) => r.ok) || !differs)}
            />
          </span>
        </label>

        <label className="field">
          <span className="field-label">Confirm new password</span>
          <span className="input-shell">
            <span className="input-icon"><LockIcon /></span>
            <input
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
              aria-invalid={confirm.length > 0 && !matches}
            />
          </span>
        </label>

        <label className="show-row">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          Show passwords
        </label>

        <ul className="profile-rules">
          {rules.map((r) => (
            <li key={r.key} className={r.ok ? "is-ok" : ""}>
              <span className="profile-rule-dot" />
              {r.label}
            </li>
          ))}
          <li className={differs ? "is-ok" : ""}>
            <span className="profile-rule-dot" />
            Different from the current password
          </li>
          <li className={matches ? "is-ok" : ""}>
            <span className="profile-rule-dot" />
            Both new-password fields match
          </li>
        </ul>

        <button type="submit" className="profile-save-btn" disabled={loading || !valid}>
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </section>
  );
}

/* ---------- Small local icons ---------- */
function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
      <path d="M4 20h4L18.5 9.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 15.5V20Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M13.5 6.5 17.5 10.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
