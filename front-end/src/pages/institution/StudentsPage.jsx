import { useEffect, useMemo, useState } from "react";
import { getUser } from "../../lib/auth";
import { getInstitutionFees } from "../../lib/feeService";
import { deactivateChild } from "../../lib/childrenService";
import { Icon } from "./icons";
import "./StudentsPage.css";

/*
 * The backend has no "list students" endpoint and the fees listing does not
 * return a child's is_active flag. So this page:
 *   - loads students from GET /institutions/:id/fees (children with their fees),
 *   - treats every student as Active unless we know otherwise,
 *   - learns a student is Inactive from the deactivate response (or its 400
 *     "already inactive" error) and remembers those ids in localStorage so the
 *     status survives a reload.
 */

function inactiveStorageKey(institutionId) {
  return `inst:${institutionId}:inactiveStudents`;
}

function readInactiveIds(institutionId) {
  try {
    const raw = localStorage.getItem(inactiveStorageKey(institutionId));
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeInactiveIds(institutionId, ids) {
  try {
    localStorage.setItem(inactiveStorageKey(institutionId), JSON.stringify([...ids]));
  } catch {
    // storage unavailable; status will only persist for this session
  }
}

function toStudents(children = [], inactiveIds) {
  return children.map((child) => {
    const fees = child.fees || [];
    const outstanding = fees.reduce((sum, fee) => sum + Number(fee.outstanding_amount ?? fee.amount ?? 0), 0);
    return {
      id: child.id,
      name: child.name,
      studentCode: child.student_code || "N/A",
      feeCount: fees.length,
      outstanding,
      currency: fees[0]?.currency || "EGP",
      isActive: !inactiveIds.has(child.id),
    };
  });
}

function money(value, currency) {
  return `${currency} ${Number(value).toLocaleString()}`;
}

export default function StudentsPage() {
  const institutionId = getUser()?.id;
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState({ query: "", status: "" });
  const [banner, setBanner] = useState(null); // { kind: "success" | "info", text }
  const [target, setTarget] = useState(null); // student awaiting deactivate confirmation
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [dialogError, setDialogError] = useState("");

  const filtered = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return students.filter((student) => {
      const matchesQuery = !query || [student.name, student.studentCode].some((value) => String(value).toLowerCase().includes(query));
      const matchesStatus = !filters.status || (filters.status === "active" ? student.isActive : !student.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [students, filters]);

  const activeCount = students.filter((student) => student.isActive).length;

  useEffect(() => {
    let active = true;

    async function loadStudents() {
      if (!institutionId) {
        setLoadError("Your institution account is missing an institution ID.");
        setIsLoading(false);
        return;
      }
      try {
        const data = await getInstitutionFees(institutionId);
        if (active) setStudents(toStudents(data.children, readInactiveIds(institutionId)));
      } catch (error) {
        if (active) setLoadError(error.message || "Unable to load students.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadStudents();
    return () => { active = false; };
  }, [institutionId]);

  useEffect(() => {
    if (!banner) return undefined;
    const timer = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(timer);
  }, [banner]);

  function markInactive(studentId) {
    const ids = readInactiveIds(institutionId);
    ids.add(studentId);
    writeInactiveIds(institutionId, ids);
    setStudents((current) => current.map((student) => (student.id === studentId ? { ...student, isActive: false } : student)));
  }

  function openDeactivate(student) {
    if (!student.isActive) return;
    setTarget(student);
    setDialogError("");
  }

  function closeDialog() {
    if (isDeactivating) return;
    setTarget(null);
    setDialogError("");
  }

  async function confirmDeactivate() {
    if (!target) return;
    setDialogError("");
    setIsDeactivating(true);
    try {
      const result = await deactivateChild(institutionId, target.id);
      if (result?.child?.is_active === false || !result?.child) markInactive(target.id);
      setTarget(null);
      setBanner({ kind: "success", text: result?.message || "Student deactivated successfully" });
    } catch (error) {
      if (error.status === 400) {
        // Backend says the student was already inactive: reflect that and move on.
        markInactive(target.id);
        setTarget(null);
        setBanner({ kind: "info", text: error.message || "This student is already inactive" });
      } else if (error.status === 404) {
        setDialogError("This student was not found for your institution. Close this dialog and refresh the list.");
      } else {
        setDialogError(error.message || "Unable to deactivate student.");
      }
    } finally {
      setIsDeactivating(false);
    }
  }

  return (
    <div className="students-page">
      <header className="students-head">
        <div className="students-heading-group">
          <span className="students-heading-icon"><Icon.users /></span>
          <div>
            <h1 className="students-title">Students</h1>
            <p className="students-subtitle">Review enrolled students and deactivate those who have left the institution.</p>
          </div>
        </div>
        <div className="students-stats">
          <div className="students-stat"><span>Total</span><strong>{students.length}</strong></div>
          <div className="students-stat"><span>Active</span><strong>{activeCount}</strong></div>
          <div className="students-stat"><span>Inactive</span><strong>{students.length - activeCount}</strong></div>
        </div>
      </header>

      <div className="students-panel students-toolbar">
        <label className="students-query-field">
          <span className="students-label-text">Search</span>
          <span className="students-input-wrap">
            <Icon.search />
            <input value={filters.query} placeholder="Student name or code" onChange={(event) => setFilters({ ...filters, query: event.target.value })} />
          </span>
        </label>
        <label>
          <span className="students-label-text">Status</span>
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">All students</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      {loadError && <div className="students-alert students-alert-error">{loadError}</div>}
      {banner && (
        <div className={`students-alert students-alert-${banner.kind}`} role="status">
          {banner.kind === "success" ? <Icon.checkCircle /> : <Icon.info />}
          <span>{banner.text}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setBanner(null)}>×</button>
        </div>
      )}

      <section className="students-panel students-table-panel">
        <div className="students-table-head">
          <div><h2>Student Records</h2><span>Deactivated students remain in the list but cannot be reactivated from here.</span></div>
          <strong>{filtered.length} records</strong>
        </div>
        <div className="students-table-scroll">
          {isLoading ? (
            <div className="students-empty"><strong>Loading students...</strong></div>
          ) : loadError ? (
            <div className="students-empty"><strong>Students could not be loaded</strong><span>Resolve the request error above and refresh the page.</span></div>
          ) : (
            <>
              <table>
                <thead>
                  <tr><th>Student</th><th>Student Code</th><th>Fees</th><th>Outstanding</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map((student) => (
                    <tr key={student.id} className={student.isActive ? "" : "is-inactive"}>
                      <td><strong>{student.name}</strong></td>
                      <td>{student.studentCode}</td>
                      <td>{student.feeCount}</td>
                      <td>{money(student.outstanding, student.currency)}</td>
                      <td><span className={`students-status students-status-${student.isActive ? "active" : "inactive"}`}>{student.isActive ? "Active" : "Inactive"}</span></td>
                      <td>
                        {student.isActive ? (
                          <button type="button" className="students-deactivate-btn" aria-label={`Deactivate ${student.name}`} onClick={() => openDeactivate(student)}><Icon.power /> Deactivate</button>
                        ) : (
                          <span className="students-muted">No actions</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="students-empty">
                  <strong>{students.length === 0 ? "No students have been added yet" : "No students match these filters"}</strong>
                  <span>{students.length === 0 ? "Students appear here once dues are uploaded or fees are added." : "Adjust the search or status filter."}</span>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {target && (
        <div className="students-modal-backdrop" onClick={closeDialog}>
          <div className="students-modal" role="dialog" aria-modal="true" aria-labelledby="students-deactivate-title" onClick={(event) => event.stopPropagation()}>
            <span className="students-modal-icon"><Icon.power /></span>
            <h2 id="students-deactivate-title">Deactivate this student?</h2>
            <p className="students-modal-copy"><strong>{target.name}</strong> ({target.studentCode}) will be marked inactive. Existing fee records are kept, but the student will no longer be treated as enrolled. This cannot be undone from the portal.</p>
            <div className="students-modal-summary">
              <div><span>Fees on record</span><strong>{target.feeCount}</strong></div>
              <div><span>Outstanding</span><strong>{money(target.outstanding, target.currency)}</strong></div>
            </div>
            {dialogError && <div className="students-alert students-alert-error">{dialogError}</div>}
            <div className="students-modal-actions">
              <button type="button" className="students-secondary-btn" onClick={closeDialog} disabled={isDeactivating}>Cancel</button>
              <button type="button" className="students-danger-btn" onClick={confirmDeactivate} disabled={isDeactivating}>{isDeactivating ? "Deactivating..." : "Deactivate Student"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
