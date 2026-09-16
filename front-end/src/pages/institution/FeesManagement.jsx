import { useEffect, useMemo, useState } from "react";
import { getUser } from "../../lib/auth";
import { getInstitutionFees, createInstitutionFee, updateInstitutionFee, deleteInstitutionFee } from "../../lib/feeService";
import { Icon } from "./icons";
import "./FeesManagement.css";

function feeStatus(status, amount, remaining) {
  if (status === "paid" || remaining === 0) return "paid";
  if (status === "partial" || status === "partially_paid" || (remaining > 0 && remaining < amount)) return "partial";
  return "outstanding";
}

function flattenFees(children = []) {
  return children.flatMap((child) => (child.fees || []).map((fee) => {
    const amount = Number(fee.amount || 0);
    const remaining = Number(fee.outstanding_amount ?? amount);
    return {
      id: fee.id,
      student: child.name,
      studentCode: child.student_code || "N/A",
      parentId: child.parent_id || "N/A",
      feeType: fee.fee_type,
      period: fee.period,
      amount,
      paid: Math.max(0, amount - remaining),
      remaining,
      currency: fee.currency || "EGP",
      status: feeStatus(fee.status, amount, remaining),
    };
  }));
}

function statusLabel(status) {
  if (status === "paid") return "Paid";
  if (status === "partial") return "Partially Paid";
  return "Outstanding";
}

function money(value, currency) {
  return `${currency} ${Number(value).toLocaleString()}`;
}

// The backend rejects edits and deletes (409) once any payment has been recorded against the fee.
function canEditFee(fee) {
  return fee.paid === 0;
}
const canDeleteFee = canEditFee;

const EMPTY_FORM = { studentCode: "", feeType: "", period: "", amount: "", currency: "EGP" };

export default function FeesManagement() {
  const institutionId = getUser()?.id;
  const [fees, setFees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState({ student: "", parentId: "", feeType: "", status: "", period: "" });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(null); // null = "Add Fee" mode, otherwise the flattened fee row being edited
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deletingFee, setDeletingFee] = useState(null); // flattened fee row awaiting delete confirmation
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const isEditMode = editingFee !== null;

  const filteredFees = useMemo(() => {
    return fees.filter((fee) => {
      const student = filters.student.trim().toLowerCase();
      const parentId = filters.parentId.trim().toLowerCase();
      const matchesStudent = !student || [fee.student, fee.studentCode].some((value) => String(value).toLowerCase().includes(student));
      const matchesParent = !parentId || String(fee.parentId).toLowerCase().includes(parentId);
      return matchesStudent && matchesParent && (!filters.feeType || fee.feeType === filters.feeType) && (!filters.status || fee.status === filters.status) && (!filters.period || fee.period === filters.period);
    });
  }, [fees, filters]);

  const feeTypes = [...new Set(fees.map((fee) => fee.feeType).filter(Boolean))];
  const periods = [...new Set(fees.map((fee) => fee.period).filter(Boolean))];

  useEffect(() => {
    let active = true;

    async function loadFees() {
      if (!institutionId) {
        setLoadError("Your institution account is missing an institution ID.");
        setIsLoading(false);
        return;
      }

      try {
        const data = await getInstitutionFees(institutionId);
        if (active) setFees(flattenFees(data.children));
      } catch (error) {
        if (active) setLoadError(error.message || "Unable to load institution fees.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadFees();
    return () => { active = false; };
  }, [institutionId]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  function openAddFee() {
    setEditingFee(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setIsDrawerOpen(true);
  }

  function openEditFee(fee) {
    if (!canEditFee(fee)) return;
    setEditingFee(fee);
    setForm({
      studentCode: fee.studentCode,
      feeType: fee.feeType || "",
      period: fee.period || "",
      amount: String(fee.amount ?? ""),
      currency: fee.currency || "EGP",
    });
    setFormError("");
    setIsDrawerOpen(true);
  }

  function closeDrawer() {
    if (isSaving) return;
    setIsDrawerOpen(false);
    setEditingFee(null);
  }

  function openDeleteFee(fee) {
    if (!canDeleteFee(fee)) return;
    setDeletingFee(fee);
    setDeleteError("");
  }

  function closeDeleteDialog() {
    if (isDeleting) return;
    setDeletingFee(null);
    setDeleteError("");
  }

  async function confirmDeleteFee() {
    if (!deletingFee) return;
    setDeleteError("");
    setIsDeleting(true);
    try {
      const result = await deleteInstitutionFee(institutionId, deletingFee.id);
      // Drop the row immediately, then refetch so the list matches the server.
      setFees((current) => current.filter((fee) => fee.id !== deletingFee.id));
      setDeletingFee(null);
      setSuccessMessage(result?.message || "Fee deleted successfully");
      const data = await getInstitutionFees(institutionId);
      setFees(flattenFees(data.children));
    } catch (error) {
      if (error.status === 404) {
        setDeleteError("This fee no longer exists. Close this dialog and refresh the list.");
      } else {
        // 409 = a payment was recorded since the page loaded; the backend message explains it.
        setDeleteError(error.message || "Unable to delete fee.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  async function saveFee(event) {
    event.preventDefault();
    setFormError("");
    if (!isEditMode && !form.studentCode.trim()) return setFormError("Enter the student code.");
    if (!form.feeType.trim() || !form.period.trim()) return setFormError("Fee type and collection period are required.");
    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) return setFormError("Amount must be greater than zero.");
    if (!/^[A-Z]{3}$/.test(form.currency.trim().toUpperCase())) return setFormError("Currency must be a 3-letter code, such as EGP.");

    const feeFields = {
      fee_type: form.feeType.trim(),
      period: form.period.trim(),
      amount: Number(form.amount),
      currency: form.currency.trim().toUpperCase(),
    };

    setIsSaving(true);
    try {
      let result;
      if (isEditMode) {
        result = await updateInstitutionFee(institutionId, editingFee.id, feeFields);
      } else {
        result = await createInstitutionFee(institutionId, { student_code: form.studentCode.trim(), ...feeFields });
      }
      setIsDrawerOpen(false);
      setEditingFee(null);
      setSuccessMessage(result?.message || (isEditMode ? "Fee updated successfully" : "Fee created successfully"));
      const data = await getInstitutionFees(institutionId);
      setFees(flattenFees(data.children));
    } catch (error) {
      if (isEditMode && error.status === 409) {
        // Payment recorded since the page loaded, or the new type/period collides with another fee for this student.
        setFormError(error.message || "This fee can no longer be edited.");
      } else if (isEditMode && error.status === 404) {
        setFormError("This fee no longer exists. Close the drawer and refresh the list.");
      } else {
        setFormError(error.message || (isEditMode ? "Unable to update fee." : "Unable to save fee."));
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fees-page">
      <header className="fees-head">
        <div className="fees-heading-group"><span className="fees-heading-icon"><Icon.card /></span><div><h1 className="fees-title">Fee Management</h1><p className="fees-subtitle">Manage student fee records and collection status.</p></div></div>
        <button type="button" className="fees-primary-btn" onClick={openAddFee}><Icon.plus /> Add Fee</button>
      </header>

      <div className="fees-panel fees-toolbar">
        <label className="fees-query-field"><span className="fees-label-text">Student</span><span className="fees-input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg><input value={filters.student} placeholder="Search student or code" onChange={(event) => setFilters({ ...filters, student: event.target.value })} /></span></label>
        <label><span className="fees-label-text">Parent ID</span><input value={filters.parentId} placeholder="Search Parent ID" onChange={(event) => setFilters({ ...filters, parentId: event.target.value })} /></label>
        <label><span className="fees-label-text">Fee Type</span><select value={filters.feeType} onChange={(event) => setFilters({ ...filters, feeType: event.target.value })}><option value="">All fee types</option>{feeTypes.map((feeType) => <option key={feeType} value={feeType}>{feeType}</option>)}</select></label>
        <label><span className="fees-label-text">Status</span><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option><option value="outstanding">Outstanding</option><option value="partial">Partially Paid</option><option value="paid">Paid</option></select></label>
        <label><span className="fees-label-text">Collection Period</span><select value={filters.period} onChange={(event) => setFilters({ ...filters, period: event.target.value })}><option value="">All periods</option>{periods.map((period) => <option key={period} value={period}>{period}</option>)}</select></label>
      </div>

      {loadError && <div className="fees-alert fees-alert-error">{loadError}</div>}
      {successMessage && <div className="fees-alert fees-alert-success" role="status"><Icon.checkCircle /> <span>{successMessage}</span><button type="button" aria-label="Dismiss" onClick={() => setSuccessMessage("")}>×</button></div>}

      <section className="fees-panel fees-table-panel">
        <div className="fees-table-head"><div><h2>Fee Records</h2><span>Keep track of student dues and collection activity.</span></div><strong>{filteredFees.length} records</strong></div>
        <div className="fees-table-scroll">{isLoading ? <div className="fees-empty"><strong>Loading fee records...</strong></div> : loadError ? <div className="fees-empty"><strong>Fee records could not be loaded</strong><span>Resolve the request error above and refresh the page.</span></div> : <><table><thead><tr><th>Student</th><th>Student Code</th><th>Fee Type</th><th>Period</th><th>Amount</th><th>Currency</th><th>Status</th><th>Remaining</th><th>Actions</th></tr></thead><tbody>{filteredFees.map((fee) => <tr key={fee.id}><td><strong>{fee.student}</strong></td><td>{fee.studentCode}</td><td>{fee.feeType}</td><td>{fee.period}</td><td>{Number(fee.amount).toLocaleString()}</td><td>{fee.currency}</td><td><span className={`fees-status fees-status-${fee.status}`}>{statusLabel(fee.status)}</span></td><td>{money(fee.remaining, fee.currency)}</td><td><div className="fees-row-actions"><button type="button" className="fees-edit-btn" disabled={!canEditFee(fee)} title={canEditFee(fee) ? "Edit fee" : "Fees with recorded payments cannot be edited"} aria-label={`Edit ${fee.feeType} fee for ${fee.student}`} onClick={() => openEditFee(fee)}><Icon.edit /> Edit</button><button type="button" className="fees-delete-btn" disabled={!canDeleteFee(fee)} title={canDeleteFee(fee) ? "Delete fee" : "Fees with recorded payments cannot be deleted"} aria-label={`Delete ${fee.feeType} fee for ${fee.student}`} onClick={() => openDeleteFee(fee)}><Icon.trash /> Delete</button></div></td></tr>)}</tbody></table>{filteredFees.length === 0 && <div className="fees-empty"><strong>No fee records have been added yet</strong><span>New student fee records will appear here.</span></div>}</>}</div>
      </section>

      {isDrawerOpen && <div className="fees-drawer-backdrop" onClick={closeDrawer}><aside className="fees-drawer" onClick={(event) => event.stopPropagation()}><div className="fees-drawer-head"><div><span className="fees-eyebrow">Institution fees</span><h2>{isEditMode ? "Edit Fee" : "Add Fee"}</h2></div><button type="button" aria-label={isEditMode ? "Close edit fee drawer" : "Close add fee drawer"} onClick={closeDrawer}>×</button></div>
        {isEditMode && <div className="fees-edit-context"><span>Editing fee for</span><strong>{editingFee.student}</strong><small>{editingFee.studentCode}</small></div>}
        <form onSubmit={saveFee}><label htmlFor="student-code">Student Code<input id="student-code" required={!isEditMode} readOnly={isEditMode} disabled={isEditMode} value={form.studentCode} placeholder="e.g. STU-00231" onChange={(event) => setForm({ ...form, studentCode: event.target.value })} /></label><label>Fee Type<input required value={form.feeType} onChange={(event) => setForm({ ...form, feeType: event.target.value })} /></label><label>Collection Period<input required value={form.period} onChange={(event) => setForm({ ...form, period: event.target.value })} placeholder="e.g. Fall 2026" /></label><div className="fees-form-grid"><label>Amount<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label><label>Currency<input required maxLength={3} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} /></label></div>
        {isEditMode && <p className="fees-drawer-copy">Saving resets the outstanding balance to the new amount and marks the fee as unpaid.</p>}
        {formError && <div className="fees-alert fees-alert-error">{formError}</div>}<div className="fees-drawer-actions"><button type="button" className="fees-secondary-btn" onClick={closeDrawer} disabled={isSaving}>Cancel</button><button type="submit" className="fees-primary-btn" disabled={isSaving}>{isSaving ? "Saving..." : isEditMode ? "Save Changes" : "Save Fee"}</button></div></form></aside></div>}

      {deletingFee && <div className="fees-modal-backdrop" onClick={closeDeleteDialog}><div className="fees-modal" role="dialog" aria-modal="true" aria-labelledby="fees-delete-title" onClick={(event) => event.stopPropagation()}>
        <span className="fees-modal-icon"><Icon.trash /></span>
        <h2 id="fees-delete-title">Delete this fee?</h2>
        <p className="fees-drawer-copy">This permanently removes the <strong>{deletingFee.feeType}</strong> fee for <strong>{deletingFee.period}</strong> from <strong>{deletingFee.student}</strong> ({deletingFee.studentCode}). This cannot be undone.</p>
        <div className="fees-modal-summary"><span>Amount</span><strong>{money(deletingFee.amount, deletingFee.currency)}</strong></div>
        {deleteError && <div className="fees-alert fees-alert-error">{deleteError}</div>}
        <div className="fees-drawer-actions"><button type="button" className="fees-secondary-btn" onClick={closeDeleteDialog} disabled={isDeleting}>Cancel</button><button type="button" className="fees-danger-btn" onClick={confirmDeleteFee} disabled={isDeleting}>{isDeleting ? "Deleting..." : "Delete Fee"}</button></div>
      </div></div>}
    </div>
  );
}