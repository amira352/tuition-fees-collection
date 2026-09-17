import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { BuildingIcon, LockIcon } from "../../components/Icons";
import { changePassword, getUser } from "../../lib/auth";
import { apiGet, apiPut } from "../../lib/api";
import { getInstitutionDisplayId } from "./profileData";
import { SectionCard } from "./widgets";
import "./InstitutionProfile.css";

const TYPE_LABEL = { school: "School", university: "University" };
const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2MB — mirrors the backend's AVATAR_MAX_LENGTH.

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function InstitutionProfile() {
  const user = getUser();
  const institutionId = user?.id;
  // Lets the sidebar/topbar avatars (rendered by InstitutionLayout, an
  // ancestor of this route) pick up a new picture immediately, without a
  // reload. Undefined when this page is rendered outside that layout.
  const { setAvatarUrl } = useOutletContext() ?? {};

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!institutionId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const result = await apiGet(`/institutions/${institutionId}/profile`);
        if (!cancelled) setProfile(result);
      } catch (err) {
        if (!cancelled) setError(err.message || "Couldn't load your profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [institutionId]);

  const displayId = useMemo(
    () => getInstitutionDisplayId(profile?.id ?? institutionId),
    [profile?.id, institutionId],
  );

  if (loading) {
    return (
      <div className="dash">
        <div className="placeholder-card">Loading profile…</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="dash">
        <div className="alert" role="alert">{error || "Couldn't load your profile."}</div>
      </div>
    );
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
            {profile.avatar_base64 ? <img src={profile.avatar_base64} alt="" /> : <BuildingIcon />}
          </span>

          <div className="profile-card-main">
            <div className="profile-card-top">
              <div className="profile-name-line">
                <h2 className="profile-name">{profile.name}</h2>
                <span className="badge">{TYPE_LABEL[profile.type] || profile.type || "Institution"}</span>
                <StatusBadge active={profile.is_active} />
              </div>
              <button type="button" className="profile-edit-btn" onClick={() => setEditOpen(true)}>
                <PencilIcon />
                Edit Profile
              </button>
            </div>
            <p className="profile-meta">
              Institution ID <strong>{displayId}</strong>
              <span className="profile-meta-sep" aria-hidden="true" />
              Joined {formatDate(profile.created_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        <SectionCard title="Institution Information" icon="building">
          <dl className="profile-fields">
            <Field label="Institution Name" value={profile.name} />
            <Field label="Institution Type" value={TYPE_LABEL[profile.type] || profile.type} />
            <Field label="Institution ID" value={displayId} />
            <Field label="Status" raw value={<StatusBadge active={profile.is_active} />} />
            <Field label="Joined Date" value={formatDate(profile.created_at)} />
          </dl>
        </SectionCard>

        <SectionCard title="Contact Information" icon="card">
          <dl className="profile-fields">
            <Field label="Email" value={profile.email} />
            <Field label="Phone" value={profile.phone} />
          </dl>
        </SectionCard>
      </div>

      {editOpen && (
        <EditProfileModal
          institutionId={institutionId}
          profile={profile}
          onClose={() => setEditOpen(false)}
          onProfileUpdated={(patch) => {
            setProfile((p) => ({ ...p, ...patch }));
            if (patch.avatar_base64 !== undefined) {
              setAvatarUrl?.(patch.avatar_base64);
            }
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ active }) {
  return (
    <span className={`badge${active ? " badge--active" : ""}`}>
      <span className="badge-dot" />
      {active ? "Active" : "Inactive"}
    </span>
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

function EditProfileModal({ institutionId, profile, onClose, onProfileUpdated }) {
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

        <AvatarPicker
          institutionId={institutionId}
          currentAvatar={profile.avatar_base64}
          onUpdated={onProfileUpdated}
        />
        <PhoneForm
          institutionId={institutionId}
          currentPhone={profile.phone}
          onUpdated={onProfileUpdated}
        />
        <ChangePasswordForm />

        <button type="button" className="profile-done-btn" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

function AvatarPicker({ institutionId, currentAvatar, onUpdated }) {
  const [preview, setPreview] = useState(currentAvatar || null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
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
    reader.onload = async () => {
      const dataUrl = reader.result;
      setPreview(dataUrl);
      setSaving(true);
      try {
        const updated = await apiPut(`/institutions/${institutionId}/avatar`, {
          avatar_base64: dataUrl,
        });
        onUpdated(updated);
      } catch (err) {
        setError(err.message || "Couldn't save the picture. Please try again.");
        setPreview(currentAvatar || null);
      } finally {
        setSaving(false);
      }
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
          <button
            type="button"
            className="profile-edit-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
          >
            <CameraIcon />
            {saving ? "Saving…" : "Change Picture"}
          </button>
          <p className="profile-hint">JPG or PNG, up to 2MB.</p>
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

function PhoneForm({ institutionId, currentPhone, onUpdated }) {
  const [phone, setPhone] = useState(currentPhone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const dirty = phone.trim() !== (currentPhone || "");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);
    try {
      const updated = await apiPut(`/institutions/${institutionId}/profile`, {
        phone: phone.trim(),
      });
      onUpdated(updated);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Couldn't save the phone number. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="profile-modal-section">
      <h3 className="profile-modal-section-title">Phone Number</h3>
      <form onSubmit={handleSubmit} noValidate>
        {error && <div className="alert" role="alert">{error}</div>}
        {success && <div className="alert-success" role="status">Phone number updated.</div>}

        <label className="field">
          <span className="field-label">Institution phone</span>
          <span className="input-shell">
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setSuccess(false);
              }}
              placeholder="e.g. +20 2 2612 3456"
              disabled={saving}
            />
          </span>
        </label>

        <button type="submit" className="profile-save-btn" disabled={saving || !dirty}>
          {saving && <span className="spinner" aria-hidden="true" />}
          {saving ? "Saving…" : "Save Phone"}
        </button>
      </form>
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
