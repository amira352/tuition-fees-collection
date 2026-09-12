import { useEffect, useMemo, useState } from "react";
import { getUser } from "../../lib/auth";
import { apiGet } from "../../lib/api";
import { formatEGP } from "../../lib/format";
import { SectionCard, StatusPill } from "./widgets";
import { Icon } from "./icons";
// This page reuses the shared .dash/.panel/.table/.pill classes that live in
// InstitutionDashboard.css rather than redefining them. Since this page is
// lazy-loaded on its own route, its bundle needs its own import of that
// stylesheet too — otherwise those classes are only styled if the dashboard
// happened to load earlier in the same session (e.g. a fresh visit straight
// to /institution/payments would render unstyled).
import "./InstitutionDashboard.css";
import "./InstitutionPayments.css";

const DEFAULT_LIMIT = 20;
// Used instead of DEFAULT_LIMIT while a client-side-only filter (method /
// fee type) is active, so filtering has more rows to work with than a
// single 20-row page. See the pf-note rendered below the toolbar.
const WIDE_LIMIT = 100;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

// Fixed on purpose: the backend only ever stores one of these three
// (payment.service.js validateShape), so this isn't a guess.
const METHOD_OPTIONS = [
  { value: "", label: "All methods" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "account", label: "Bank transfer" },
];

const METHOD_LABEL = { cash: "Cash", card: "Card", account: "Bank transfer" };

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function shortPaymentId(id) {
  return id ? `PMT-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}` : "—";
}

function uniqueStudents(lines = []) {
  const names = [...new Set(lines.map((l) => l.student).filter(Boolean))];
  if (names.length === 0) return "—";
  return names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`;
}

function uniqueFeeTypes(lines = []) {
  const types = [...new Set(lines.map((l) => l.fee_type).filter(Boolean))];
  return types.length ? types.join(", ") : "—";
}

function uniqueMethods(paidFrom = []) {
  const methods = [...new Set(paidFrom.map((t) => t.method))];
  return methods.length ? methods.map((m) => METHOD_LABEL[m] || m).join(" + ") : "—";
}

export default function InstitutionPayments() {
  const user = getUser();
  const institutionId = user?.id;

  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [feeType, setFeeType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [offset, setOffset] = useState(0);

  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pageInfo, setPageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  // "Fee type" isn't a filter the API supports yet, so its options come
  // from whatever fee types are actually on screen, not a hardcoded list.
  const feeTypeOptions = useMemo(() => {
    const types = new Set();
    payments.forEach((p) => (p.lines || []).forEach((l) => l.fee_type && types.add(l.fee_type)));
    return [...types].sort();
  }, [payments]);

  const clientSideFilterActive = Boolean(method || feeType);
  const limit = clientSideFilterActive ? WIDE_LIMIT : DEFAULT_LIMIT;

  useEffect(() => {
    if (!institutionId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          institutionId,
          limit: String(limit),
          offset: String(offset),
        });
        if (status) params.set("status", status);
        if (from) params.set("from", from);
        if (to) params.set("to", to);

        const data = await apiGet(`/payments/history?${params.toString()}`);
        if (cancelled) return;
        setPayments(data.payments || []);
        setSummary(data.summary || null);
        setPageInfo(data.page || null);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Couldn't load payments.");
          setPayments([]);
          setSummary(null);
          setPageInfo(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [institutionId, status, from, to, limit, offset]);

  // method / feeType have no backend filter yet, so they're applied here
  // on whatever page of rows is already loaded.
  const rows = useMemo(() => {
    return payments.filter((p) => {
      if (method && !(p.paid_from || []).some((t) => t.method === method)) return false;
      if (feeType && !(p.lines || []).some((l) => l.fee_type === feeType)) return false;
      return true;
    });
  }, [payments, method, feeType]);

  function updateFilter(setter) {
    return (value) => {
      setOffset(0);
      setter(value);
    };
  }

  const handleStatus = updateFilter(setStatus);
  const handleFrom = updateFilter(setFrom);
  const handleTo = updateFilter(setTo);
  const handleMethod = updateFilter(setMethod);
  const handleFeeType = updateFilter(setFeeType);

  const hasActiveFilters = status || method || feeType || from || to;

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <h1 className="dash-title">Payments</h1>
          <p className="dash-subtitle">Payments made toward your institution&apos;s fees.</p>
        </div>
      </div>

      <SectionCard
        title="All payments"
        icon="card"
        action={
          summary && (
            <span className="panel-pill">
              {summary.total_matching} total · {formatEGP(summary.collected_on_this_page)} collected here
            </span>
          )
        }
      >
        <div className="pf-toolbar">
          <label className="pf-field">
            <span className="pf-label">Status</span>
            <select className="pf-select" value={status} onChange={(e) => handleStatus(e.target.value)}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label className="pf-field">
            <span className="pf-label">Payment method</span>
            <select className="pf-select" value={method} onChange={(e) => handleMethod(e.target.value)}>
              {METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>

          <label className="pf-field">
            <span className="pf-label">Fee type</span>
            <select className="pf-select" value={feeType} onChange={(e) => handleFeeType(e.target.value)}>
              <option value="">All fee types</option>
              {feeTypeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label className="pf-field">
            <span className="pf-label">From</span>
            <input type="date" className="pf-date" value={from} onChange={(e) => handleFrom(e.target.value)} />
          </label>

          <label className="pf-field">
            <span className="pf-label">To</span>
            <input type="date" className="pf-date" value={to} onChange={(e) => handleTo(e.target.value)} />
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              className="pf-clear"
              onClick={() => {
                setOffset(0);
                setStatus("");
                setMethod("");
                setFeeType("");
                setFrom("");
                setTo("");
              }}
            >
              <Icon.close /> Clear
            </button>
          )}
        </div>

        {clientSideFilterActive && (
          <p className="pf-note">
            Payment method and fee type are filtered on the {WIDE_LIMIT} most recent matching payments —
            clear them to page through the full list.
          </p>
        )}

        {error && <div className="alert" role="alert">{error}</div>}

        {loading ? (
          <div className="placeholder-card">Loading payments…</div>
        ) : rows.length === 0 ? (
          <div className="placeholder-card">No payments match these filters.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Student</th>
                  <th>Fee type</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Transaction ref.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.payment_id}>
                    <td className="table-mono" title={p.payment_id}>{shortPaymentId(p.payment_id)}</td>
                    <td>{uniqueStudents(p.lines)}</td>
                    <td className="table-muted">{uniqueFeeTypes(p.lines)}</td>
                    <td className="table-amount">{formatEGP(p.amount)}</td>
                    <td className="table-muted">{uniqueMethods(p.paid_from)}</td>
                    <td><StatusPill status={p.status} /></td>
                    <td className="table-muted">{formatDateTime(p.date)}</td>
                    <td className="table-mono table-muted">{p.receipt_number || "—"}</td>
                    <td>
                      <button type="button" className="panel-link" onClick={() => setSelected(p)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!clientSideFilterActive && pageInfo && payments.length > 0 && (
          <div className="pf-pagination">
            <button
              type="button"
              className="pf-page-btn"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              <Icon.chevronLeft /> Prev
            </button>
            <span className="pf-page-info">
              {summary ? `${offset + 1}–${offset + payments.length} of ${summary.total_matching}` : ""}
            </span>
            <button
              type="button"
              className="pf-page-btn"
              disabled={!pageInfo.has_more}
              onClick={() => setOffset(offset + limit)}
            >
              Next <Icon.chevronRight />
            </button>
          </div>
        )}
      </SectionCard>

      {selected && <PaymentDetailDrawer payment={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* ---------- Payment detail drawer with timeline ---------- */

// Only three real statuses exist at the database level (pending / completed
// / failed) — there is no per-step timestamp yet (see BE-3-NOTES.md). These
// five stages are inferred from status + receipt_number, not read from
// separate event data, which is why the drawer says so explicitly.
function buildTimeline(payment) {
  const { status, date, receipt_number: receiptNumber, failure_reason: failureReason } = payment;
  const step = (label, state, note) => ({ label, state, note });

  if (status === "failed") {
    return [
      step("Payment initiated", "done", formatDateTime(date)),
      step("Authorized", "failed", failureReason || "Declined by the bank"),
      step("Captured", "pending"),
      step("Fee updated", "pending"),
      step("Receipt generated", "pending"),
    ];
  }

  if (status === "completed") {
    return [
      step("Payment initiated", "done", formatDateTime(date)),
      step("Authorized", "done"),
      step("Captured", "done"),
      step("Fee updated", "done"),
      step("Receipt generated", receiptNumber ? "done" : "pending", receiptNumber || "Not issued yet"),
    ];
  }

  return [
    step("Payment initiated", "done", formatDateTime(date)),
    step("Authorized", "active", "Waiting on the bank"),
    step("Captured", "pending"),
    step("Fee updated", "pending"),
    step("Receipt generated", "pending"),
  ];
}

function PaymentDetailDrawer({ payment, onClose }) {
  const timeline = buildTimeline(payment);

  return (
    <div className="pd-backdrop" onClick={onClose}>
      <aside className="pd-panel" onClick={(e) => e.stopPropagation()}>
        <header className="pd-head">
          <div>
            <h3 className="pd-title">{shortPaymentId(payment.payment_id)}</h3>
            <p className="pd-subtitle">{payment.payer || "—"}</p>
          </div>
          <button type="button" className="pd-close" onClick={onClose} aria-label="Close">
            <Icon.close />
          </button>
        </header>

        <section className="pd-section">
          <h4 className="pd-section-title">Payment timeline</h4>
          <p className="pd-timeline-note">
            Based on the payment&apos;s current status — the backend doesn&apos;t record a timestamp
            per step yet.
          </p>
          <ol className="pd-timeline">
            {timeline.map((s) => (
              <li key={s.label} className={`pd-step pd-step--${s.state}`}>
                <span className="pd-step-mark">
                  {s.state === "done" ? (
                    <Icon.checkCircle />
                  ) : s.state === "failed" ? (
                    <Icon.warning />
                  ) : (
                    <Icon.dotCircle />
                  )}
                </span>
                <span className="pd-step-text">
                  <span className="pd-step-label">{s.label}</span>
                  {s.note && <span className="pd-step-note">{s.note}</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="pd-section">
          <h4 className="pd-section-title">Fee lines</h4>
          <ul className="pd-lines">
            {(payment.lines || []).map((l, i) => (
              <li key={i} className="pd-line">
                <span>
                  {l.student} — {l.fee_type} {l.period ? `(${l.period})` : ""}
                </span>
                <strong>{formatEGP(l.amount)}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="pd-section">
          <h4 className="pd-section-title">Paid from</h4>
          <ul className="pd-lines">
            {(payment.paid_from || []).map((t, i) => (
              <li key={i} className="pd-line">
                <span>
                  {METHOD_LABEL[t.method] || t.method} {t.account ? `· ${t.account}` : ""}
                </span>
                <strong>{formatEGP(t.amount)}</strong>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
