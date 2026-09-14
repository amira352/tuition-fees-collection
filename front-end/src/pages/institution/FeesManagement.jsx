import { useEffect, useMemo, useState } from "react";
import { getUser } from "../../lib/auth";
import { getInstitutionFees, createInstitutionFee } from "../../lib/feeService";
import { Icon } from "./icons";
import "./FeesManagement.css";

function feeStatus(status, amount, remaining) {
  if (status === "paid" || remaining === 0) return "paid";
  if (status === "partial" || status === "partially_paid" || (remaining > 0 && remaining < amount)) return "partial";
  return "outstanding";
}

/** Discount percentage from the API's discount_percentage field, or null when there is none (missing, null, or zero). */
function discountOf(fee) {
  const percentage = Number(fee.discount_percentage);
  return Number.isFinite(percentage) && percentage > 0 ? percentage : null;
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
      discountPercentage: discountOf(fee),
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

export default function FeesManagement() {
  const institutionId = getUser()?.id;
  const [fees, setFees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState({ student: "", parentId: "", feeType: "", status: "", period: "" });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ studentCode: "", feeType: "", period: "", amount: "", currency: "EGP" });
  const [formError, setFormError] = useState("");

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

  function openAddFee() {
    setForm({ studentCode: "", feeType: "", period: "", amount: "", currency: "EGP" });
    setFormError("");
    setIsDrawerOpen(true);
  }

  async function saveFee(event) {
    event.preventDefault();
    setFormError("");
    if (!form.studentCode.trim()) return setFormError("Enter the student code.");
    if (!form.feeType.trim() || !form.period.trim()) return setFormError("Fee type and collection period are required.");
    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) return setFormError("Amount must be greater than zero.");
    if (!/^[A-Z]{3}$/.test(form.currency.trim().toUpperCase())) return setFormError("Currency must be a 3-letter code, such as EGP.");

    setIsSaving(true);
    try {
      await createInstitutionFee(institutionId, {
        student_code: form.studentCode.trim(),
        fee_type: form.feeType.trim(),
        period: form.period.trim(),
        amount: Number(form.amount),
        currency: form.currency.trim().toUpperCase(),
      });
      setIsDrawerOpen(false);
      const data = await getInstitutionFees(institutionId);
      setFees(flattenFees(data.children));
    } catch (error) {
      setFormError(error.message || "Unable to save fee.");
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

      <section className="fees-panel fees-table-panel">
        <div className="fees-table-head"><div><h2>Fee Records</h2><span>Keep track of student dues and collection activity.</span></div><strong>{filteredFees.length} records</strong></div>
        <div className="fees-table-scroll">{isLoading ? <div className="fees-empty"><strong>Loading fee records...</strong></div> : loadError ? <div className="fees-empty"><strong>Fee records could not be loaded</strong><span>Resolve the request error above and refresh the page.</span></div> : <><table><thead><tr><th>Student</th><th>Student Code</th><th>Fee Type</th><th>Period</th><th>Amount</th><th>Discount</th><th>Currency</th><th>Status</th><th>Remaining</th></tr></thead><tbody>{filteredFees.map((fee) => <tr key={fee.id}><td><strong>{fee.student}</strong></td><td>{fee.studentCode}</td><td>{fee.feeType}</td><td>{fee.period}</td><td>{Number(fee.amount).toLocaleString()}</td><td>{fee.discountPercentage == null ? "-" : `${fee.discountPercentage}%`}</td><td>{fee.currency}</td><td><span className={`fees-status fees-status-${fee.status}`}>{statusLabel(fee.status)}</span></td><td>{money(fee.remaining, fee.currency)}</td></tr>)}</tbody></table>{filteredFees.length === 0 && <div className="fees-empty"><strong>No fee records have been added yet</strong><span>New student fee records will appear here.</span></div>}</>}</div>
      </section>

      {isDrawerOpen && <div className="fees-drawer-backdrop" onClick={() => setIsDrawerOpen(false)}><aside className="fees-drawer" onClick={(event) => event.stopPropagation()}><div className="fees-drawer-head"><div><span className="fees-eyebrow">Institution fees</span><h2>Add Fee</h2></div><button type="button" aria-label="Close add fee drawer" onClick={() => setIsDrawerOpen(false)}>×</button></div><form onSubmit={saveFee}><label htmlFor="student-code">Student Code<input id="student-code" required value={form.studentCode} placeholder="e.g. STU-00231" onChange={(event) => setForm({ ...form, studentCode: event.target.value })} /></label><label>Fee Type<input required value={form.feeType} onChange={(event) => setForm({ ...form, feeType: event.target.value })} /></label><label>Collection Period<input required value={form.period} onChange={(event) => setForm({ ...form, period: event.target.value })} placeholder="e.g. Fall 2026" /></label><div className="fees-form-grid"><label>Amount<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label><label>Currency<input required maxLength={3} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} /></label></div>{formError && <div className="fees-alert fees-alert-error">{formError}</div>}<div className="fees-drawer-actions"><button type="button" className="fees-secondary-btn" onClick={() => setIsDrawerOpen(false)}>Cancel</button><button type="submit" className="fees-primary-btn" disabled={isSaving}>{isSaving ? "Saving..." : "Save Fee"}</button></div></form></aside></div>}
    </div>
  );
}