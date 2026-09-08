import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../lib/api";
import ManageDetailsModal from "../components/ManageDetailsModal";
import "./shared.css";
import "../Styles/AdminManagement.css";

const ROLE_LABELS = { admin: "Admin", back_office: "Agent" };

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Real id is a Supabase UUID — shorten it into something that reads like the
// mockup's employee-id without inventing a fake identifier.
function shortId(id) {
  return id ? `BO-${id.replace(/-/g, "").slice(0, 5).toUpperCase()}` : "—";
}

export default function BackOfficeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await apiGet("/admin/users");
        if (!cancelled) setEmployees(data.bankEmployees || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Couldn't load back-office employees.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeCount = employees.filter((e) => e.is_active).length;
  const adminCount = employees.filter((e) => e.role === "admin").length;
  const pendingInvitesCount = employees.filter((e) => e.must_change_password).length;

  return (
    <div className="page">
      <div className="mgmt-header-row">
        <div>
          <h1 className="page-title">Back Office Employees</h1>
          <p className="page-subtitle">Back office staff, their roles, and access.</p>
        </div>
        <Link to="/admin?tab=employee" className="btn">
          Add Employee
        </Link>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Active Employees</div>
          <div className="stat-value">{loading ? "—" : activeCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Admins</div>
          <div className="stat-value">{loading ? "—" : adminCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Invites</div>
          <div className="stat-value">{loading ? "—" : pendingInvitesCount}</div>
        </div>
      </div>

      <div className="card">
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="placeholder-card">Loading employees…</div>
        ) : employees.length === 0 ? (
          <div className="placeholder-card">No back-office employees yet.</div>
        ) : (
          <div className="mgmt-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Employee ID</th>
                  <th>Role</th>
                  <th>Branch</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.full_name}</td>
                    <td>{shortId(emp.id)}</td>
                    <td>
                      <span className="role-badge">{ROLE_LABELS[emp.role] || emp.role}</span>
                    </td>
                    <td>{emp.branch}</td>
                    <td className="mgmt-actions-cell">
                      <button
                        type="button"
                        className="btn btn-secondary btn-manage"
                        onClick={() => setSelected(emp)}
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
          title={selected.full_name}
          onClose={() => setSelected(null)}
          fields={[
            { label: "Employee ID", value: shortId(selected.id) },
            { label: "Email", value: selected.email },
            { label: "Role", value: ROLE_LABELS[selected.role] || selected.role },
            { label: "Branch", value: selected.branch },
            { label: "Account status", value: selected.is_active ? "Active" : "Inactive" },
            {
              label: "Login status",
              value: selected.must_change_password ? "Awaiting first login" : "Password set",
            },
            { label: "Added", value: formatDate(selected.created_at) },
          ]}
        />
      )}
    </div>
  );
}