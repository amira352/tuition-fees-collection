import { useMemo, useState } from "react";
import { apiPost } from "../../lib/api";
import { Icon } from "./icons";
import "./FeesManagement.css";

function feeStatus(status, amount, remaining) {
  if (status === "paid" || remaining === 0) return "paid";
  if (status === "partial" || status === "partially_paid" || (remaining > 0 && remaining < amount)) return "partial";
  return "outstanding";
}

function flattenFees(children = [], nationalId) {
  return children.flatMap((child) => (child.fees || []).map((fee) => {
    const amount = Number(fee.amount || 0);
    const remaining = Number(fee.outstanding_amount ?? amount);
    return {
      id: fee.id,
      student: child.name,
      studentCode: child.student_code || "N/A",
      nationalId,
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

export default function FeesManagement() {
  const [fees, setFees] = useState([]);
  const [filters, setFilters] = useState({ student: "", nationalId: "", feeType: "", status: "", period: "" });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentCandidates, setStudentCandidates] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [studentError, setStudentError] = useState("");
  const [form, setForm] = useState({ feeType: "", period: "", amount: "", currency: "EGP" });
  const [formError, setFormError] = useState("");

  const filteredFees = useMemo(() => {
    return fees.filter((fee) => {
      const student = filters.student.trim().toLowerCase();
      const nationalId = filters.nationalId.trim().toLowerCase();
      const matchesStudent = !student || [fee.student, fee.studentCode].some((value) => String(value).toLowerCase().includes(student));
      const matchesNationalId = !nationalId || String(fee.nationalId).toLowerCase().includes(nationalId);
      return matchesStudent && matchesNationalId && (!filters.feeType || fee.feeType === filters.feeType) && (!filters.status || fee.status === filters.status) && (!filters.period || fee.period === filters.period);
    });
  }, [fees, filters]);

  const feeTypes = [...new Set(fees.map((fee) => fee.feeType).filter(Boolean))];
  const periods = [...new Set(fees.map((fee) => fee.period).filter(Boolean))];
  const visibleStudents = studentCandidates.filter((student) => `${student.student} ${student.studentCode}`.toLowerCase().includes(studentQuery.trim().toLowerCase()));

  function openAddFee() {
    setSelectedStudent(null);
    setStudentQuery("");
    setStudentCandidates([]);
    setStudentError("");
    setForm({ feeType: "", period: "", amount: "", currency: "EGP" });
    setFormError("");
    setIsDrawerOpen(true);
  }

  async function searchStudent(event) {
    event.preventDefault();
    const query = studentQuery.trim();
    if (!query) return setStudentError("Enter a student name, student code, or National ID.");
    if (!/^\d{14}$/.test(query)) return setStudentError("The available backend search accepts a 14-digit National ID. Name and student-code search requires an institution student endpoint.");

    setIsSearching(true);
    setStudentError("");
    setSelectedStudent(null);
    try {
      const data = await apiPost("/bank/parents/search", { national_id: query });
      if (!data.found || !data.children?.length) {
        setStudentCandidates([]);
        setStudentError(data.message || "No students were found.");
        return;
      }
      setStudentCandidates(data.children.map((child) => ({
        id: child.id,
        student: child.name,
        studentCode: child.student_code || "N/A",
        nationalId: query,
        school: child.institution?.name || "Institution not provided",
      })));
    } catch (error) {
      setStudentError(error.status === 403 ? "This existing search endpoint is restricted to back-office users. An institution-scoped student endpoint is required." : error.message || "Unable to find students.");
    } finally {
      setIsSearching(false);
    }
  }

  function saveFee(event) {
    event.preventDefault();
    if (!selectedStudent) return setFormError("Select a student before saving the fee.");
    if (!form.feeType.trim() || !form.period.trim()) return setFormError("Fee type and collection period are required.");
    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) return setFormError("Amount must be greater than zero.");
    if (!/^[A-Z]{3}$/.test(form.currency.trim().toUpperCase())) return setFormError("Currency must be a 3-letter code, such as EGP.");
    setFormError("Single-fee creation is not currently supported by the backend. The existing backend only accepts fee creation through Excel upload.");
  }

  return (
    <div className="fees-page">
      <header className="fees-head">
        <div className="fees-heading-group"><span className="fees-heading-icon"><Icon.card /></span><div><h1 className="fees-title">Fee Management</h1><p className="fees-subtitle">Manage student fee records and collection status.</p></div></div>
        <button type="button" className="fees-primary-btn" onClick={openAddFee}><Icon.plus /> Add Fee</button>
      </header>

      <div className="fees-panel fees-toolbar">
        <label className="fees-query-field"><span className="fees-label-text">Student</span><span className="fees-input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg><input value={filters.student} placeholder="Search student or code" onChange={(event) => setFilters({ ...filters, student: event.target.value })} /></span></label>
        <label><span className="fees-label-text">National ID</span><input value={filters.nationalId} placeholder="Search National ID" onChange={(event) => setFilters({ ...filters, nationalId: event.target.value })} /></label>
        <label><span className="fees-label-text">Fee Type</span><select value={filters.feeType} onChange={(event) => setFilters({ ...filters, feeType: event.target.value })}><option value="">All fee types</option>{feeTypes.map((feeType) => <option key={feeType} value={feeType}>{feeType}</option>)}</select></label>
        <label><span className="fees-label-text">Status</span><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option><option value="outstanding">Outstanding</option><option value="partial">Partially Paid</option><option value="paid">Paid</option></select></label>
        <label><span className="fees-label-text">Collection Period</span><select value={filters.period} onChange={(event) => setFilters({ ...filters, period: event.target.value })}><option value="">All periods</option>{periods.map((period) => <option key={period} value={period}>{period}</option>)}</select></label>
      </div>

      <section className="fees-panel fees-table-panel">
        <div className="fees-table-head"><div><h2>Fee Records</h2><span>Keep track of student dues and collection activity.</span></div><strong>{filteredFees.length} records</strong></div>
        <div className="fees-table-scroll"><table><thead><tr><th>Student</th><th>National ID</th><th>Fee Type</th><th>Period</th><th>Amount</th><th>Paid</th><th>Remaining</th><th>Status</th></tr></thead><tbody>{filteredFees.map((fee) => <tr key={fee.id}><td><strong>{fee.student}</strong><small>{fee.studentCode}</small></td><td>{fee.nationalId}</td><td>{fee.feeType}</td><td>{fee.period}</td><td>{money(fee.amount, fee.currency)}</td><td>{money(fee.paid, fee.currency)}</td><td>{money(fee.remaining, fee.currency)}</td><td><span className={`fees-status fees-status-${fee.status}`}>{statusLabel(fee.status)}</span></td></tr>)}</tbody></table>{filteredFees.length === 0 && <div className="fees-empty"><strong>No fee records have been added yet</strong><span>New student fee records will appear here.</span></div>}</div>
      </section>

      {isDrawerOpen && <div className="fees-drawer-backdrop" onClick={() => setIsDrawerOpen(false)}><aside className="fees-drawer" onClick={(event) => event.stopPropagation()}><div className="fees-drawer-head"><div><span className="fees-eyebrow">Institution fees</span><h2>Add Fee</h2></div><button type="button" aria-label="Close add fee drawer" onClick={() => setIsDrawerOpen(false)}>×</button></div><form onSubmit={saveFee}><div className="student-lookup"><label htmlFor="student-query">Student</label><div className="fees-search-input"><input id="student-query" value={studentQuery} placeholder="Search student, code, or National ID" onChange={(event) => setStudentQuery(event.target.value)} /><button type="button" onClick={searchStudent} disabled={isSearching}>{isSearching ? "Searching..." : "Search"}</button></div>{studentError && <div className="fees-alert fees-alert-error">{studentError}</div>}{visibleStudents.length > 0 && <div className="student-candidates">{visibleStudents.map((student) => <button type="button" className={`student-candidate${selectedStudent?.id === student.id ? " is-selected" : ""}`} key={student.id} onClick={() => setSelectedStudent(student)}><strong>{student.student}</strong><span>{student.studentCode} · {student.school}</span><small>{student.nationalId}</small></button>)}</div>}</div>{selectedStudent && <div className="selected-student"><span>Selected Student</span><strong>{selectedStudent.student}</strong><small>Student Code: {selectedStudent.studentCode}</small><small>National ID: {selectedStudent.nationalId}</small></div>}<label>Fee Type<input required value={form.feeType} onChange={(event) => setForm({ ...form, feeType: event.target.value })} /></label><label>Collection Period<input required value={form.period} onChange={(event) => setForm({ ...form, period: event.target.value })} placeholder="e.g. Fall 2026" /></label><div className="fees-form-grid"><label>Amount<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label><label>Currency<input required maxLength={3} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} /></label></div>{formError && <div className="fees-alert fees-alert-error">{formError}</div>}<div className="fees-drawer-actions"><button type="button" className="fees-secondary-btn" onClick={() => setIsDrawerOpen(false)}>Cancel</button><button type="submit" className="fees-primary-btn">Save Fee</button></div></form></aside></div>}
    </div>
  );
}