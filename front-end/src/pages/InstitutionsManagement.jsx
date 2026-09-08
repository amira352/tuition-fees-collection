import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../lib/api";
import ManageDetailsModal from "../components/ManageDetailsModal";
import "./shared.css";
import "../Styles/AdminManagement.css";

const TYPE_LABELS = { school: "K-12", university: "University" };

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function InstitutionsManagement() {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await apiGet("/admin/users");
        if (!cancelled) setInstitutions(data.institutions || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Couldn't load institutions.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeCount = institutions.filter((i) => i.is_active).length;
  const pendingOnboardingCount = institutions.filter((i) => i.must_change_password).length;

  return (
    <div className="page">
      <div className="mgmt-header-row">
        <div>
          <h1 className="page-title">Institutions</h1>
          <p className="page-subtitle">Schools and universities registered on the network.</p>
        </div>
        <Link to="/admin?tab=institution" className="btn">
          Register Institution
        </Link>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Active Institutions</div>
          <div className="stat-value">{loading ? "—" : activeCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending onboarding</div>
          <div className="stat-value">{loading ? "—" : pendingOnboardingCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Fees submitted today</div>
          <div className="stat-value">—</div>
          <div className="stat-delta-muted">Needs a fees endpoint</div>
        </div>
      </div>

      <div className="card">
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="placeholder-card">Loading institutions…</div>
        ) : institutions.length === 0 ? (
          <div className="placeholder-card">No institutions registered yet.</div>
        ) : (
          <div className="mgmt-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Type</th>
                  <th>Email</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((inst) => (
                  <tr key={inst.id}>
                    <td>{inst.name}</td>
                    <td>{TYPE_LABELS[inst.type] || inst.type}</td>
                    <td>{inst.email}</td>
                    <td className="mgmt-actions-cell">
                      <button
                        type="button"
                        className="btn btn-secondary btn-manage"
                        onClick={() => setSelected(inst)}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <ManageDetailsModal
          title={selected.name}
          onClose={() => setSelected(null)}
          fields={[
            { label: "Type", value: TYPE_LABELS[selected.type] || selected.type },
            { label: "Email", value: selected.email },
            { label: "Account status", value: selected.is_active ? "Active" : "Inactive" },
            {
              label: "Login status",
              value: selected.must_change_password ? "Awaiting first login" : "Password set",
            },
            { label: "Registered", value: formatDate(selected.created_at) },
          ]}
        />
      )}
    </div>
  );
}