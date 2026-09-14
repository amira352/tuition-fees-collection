import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatEGP } from "../../lib/format";
import { Icon } from "./icons";
import {
  CURRENCY,
  DISCOUNT_TYPES,
  FEE_TYPES,
  LIFECYCLE_LABELS,
  STATUS_OPTIONS,
  emptyDiscountForm,
  formToRule,
  mockDiscounts,
  ruleLifecycle,
  ruleToForm,
  typeLabel,
  validateDiscountForm,
} from "./discountsData";
import "./DiscountsPage.css";

/* ── Small presentational helpers ────────────────────────────────────── */

function valueLabel(rule) {
  return rule.valueType === "percentage" ? `${rule.value}%` : formatEGP(rule.value);
}

function scopeLabel(feeTypes) {
  return feeTypes.length === 0 ? "All Fees" : feeTypes.join(", ");
}

function dateLabel(date) {
  if (!date) return "Open-ended";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function StatusPill({ lifecycle }) {
  return <span className={`disc-pill disc-pill-${lifecycle}`}><i />{LIFECYCLE_LABELS[lifecycle]}</span>;
}

/* ── Row action menu (rendered fixed so the table scroll box cannot clip it) ── */

function RowMenu({ rule, onView, onEdit, onToggle }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const isActive = rule.status === "active";

  useEffect(() => {
    if (!open) return undefined;
    function close(event) {
      if (menuRef.current?.contains(event.target) || buttonRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    function onKey(event) { if (event.key === "Escape") setOpen(false); }
    function onScroll() { setOpen(false); }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onScroll);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  function toggle() {
    if (!open) {
      const rect = buttonRef.current.getBoundingClientRect();
      const openUp = window.innerHeight - rect.bottom < 210;
      setPos({ top: openUp ? rect.top - 8 : rect.bottom + 6, right: window.innerWidth - rect.right, openUp });
    }
    setOpen(!open);
  }

  function run(action) {
    setOpen(false);
    action(rule);
  }

  return (
    <>
      <button ref={buttonRef} type="button" className={`disc-more${open ? " is-open" : ""}`} aria-haspopup="menu" aria-expanded={open} aria-label={`Actions for ${rule.name}`} onClick={toggle}><Icon.more /></button>
      {open && (
        <div ref={menuRef} role="menu" className="disc-menu" style={{ top: pos.openUp ? undefined : pos.top, bottom: pos.openUp ? window.innerHeight - pos.top : undefined, right: pos.right }}>
          <button type="button" role="menuitem" onClick={() => run(onView)}><Icon.eye /> View details</button>
          <button type="button" role="menuitem" onClick={() => run(onEdit)}><Icon.edit /> Edit rule</button>
          <button type="button" role="menuitem" onClick={() => run(onToggle)}><Icon.power /> {isActive ? "Turn off" : "Turn on"}</button>
        </div>
      )}
    </>
  );
}

/* ── Add / Edit drawer ───────────────────────────────────────────────── */

function Field({ label, hint, error, children, htmlFor }) {
  return (
    <div className={`disc-field${error ? " has-error" : ""}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <span className="disc-field-error">{error}</span> : hint ? <span className="disc-field-hint">{hint}</span> : null}
    </div>
  );
}

function DiscountDrawer({ mode, rule, onSave, onClose }) {
  const [form, setForm] = useState(() => (mode === "edit" ? ruleToForm(rule) : emptyDiscountForm()));
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);
  const isEdit = mode === "edit";
  const allFees = form.feeTypes.length === 0;

  useEffect(() => {
    function onKey(event) { if (event.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function set(patch) {
    const next = { ...form, ...patch };
    setForm(next);
    if (touched) setErrors(validateDiscountForm(next));
  }

  function toggleFeeType(feeType) {
    set({ feeTypes: form.feeTypes.includes(feeType) ? form.feeTypes.filter((f) => f !== feeType) : [...form.feeTypes, feeType] });
  }

  function submit(event) {
    event.preventDefault();
    const nextErrors = validateDiscountForm(form);
    setTouched(true);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSave(formToRule(form, isEdit ? rule : {}));
  }

  return (
    <div className="disc-backdrop" onClick={onClose}>
      <aside className="disc-drawer" role="dialog" aria-modal="true" aria-labelledby="disc-drawer-title" onClick={(event) => event.stopPropagation()}>
        <header className="disc-drawer-head">
          <div>
            <span className="disc-eyebrow">{isEdit ? "Edit discount rule" : "New discount rule"}</span>
            <h2 id="disc-drawer-title">{isEdit ? rule.name : "Add Discount"}</h2>
          </div>
          <button type="button" className="disc-icon-btn" aria-label="Close" onClick={onClose}><Icon.close /></button>
        </header>

        {isEdit && rule.appliedCount > 0 && (
          <div className="disc-note"><Icon.info /><span>This rule has already been applied to <strong>{rule.appliedCount}</strong> payments. Changes only affect future payments; past receipts keep the values they were issued with.</span></div>
        )}

        <form onSubmit={submit} noValidate>
          <section className="disc-form-section">
            <h3>1. Basics</h3>
            <Field label="Discount name" htmlFor="disc-name" error={errors.name} hint="Shown on the rules list and on receipts.">
              <input id="disc-name" value={form.name} maxLength={80} placeholder="e.g. Full Payment – 10%" onChange={(event) => set({ name: event.target.value })} />
            </Field>
            <Field label="Discount type" htmlFor="disc-type">
              <div className="disc-type-grid" role="radiogroup" aria-label="Discount type">
                {DISCOUNT_TYPES.map((type) => (
                  <button key={type.value} type="button" role="radio" aria-checked={form.type === type.value} className={`disc-type-card${form.type === type.value ? " is-selected" : ""}`} onClick={() => set({ type: type.value })}>
                    <strong>{type.label}</strong><span>{type.hint}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Internal notes" htmlFor="disc-description" hint="Admin-only: approval memo, budget owner, policy reference. Never shown to parents.">
              <textarea id="disc-description" rows={3} value={form.description} placeholder="e.g. Approved by Finance Committee, memo FC-2026-04" onChange={(event) => set({ description: event.target.value })} />
            </Field>
          </section>

          <section className="disc-form-section">
            <h3>2. Value</h3>
            <div className="disc-form-grid">
              <Field label="Value type" htmlFor="disc-value">
                <div className="disc-segmented" role="radiogroup" aria-label="Value type">
                  <button type="button" role="radio" aria-checked={form.valueType === "percentage"} className={form.valueType === "percentage" ? "is-selected" : ""} onClick={() => set({ valueType: "percentage" })}>Percentage %</button>
                  <button type="button" role="radio" aria-checked={form.valueType === "fixed"} className={form.valueType === "fixed" ? "is-selected" : ""} onClick={() => set({ valueType: "fixed", maxCap: "" })}>Fixed {CURRENCY}</button>
                </div>
              </Field>
              <Field label="Discount value" htmlFor="disc-value" error={errors.value}>
                <div className="disc-adorned">
                  <input id="disc-value" type="number" inputMode="decimal" min="0" step={form.valueType === "percentage" ? "0.5" : "1"} max={form.valueType === "percentage" ? 100 : undefined} value={form.value} placeholder={form.valueType === "percentage" ? "10" : "750"} onChange={(event) => set({ value: event.target.value })} />
                  <span>{form.valueType === "percentage" ? "%" : CURRENCY}</span>
                </div>
              </Field>
            </div>
            {form.valueType === "percentage" && (
              <Field label="Maximum discount cap (optional)" htmlFor="disc-cap" error={errors.maxCap} hint="Limits how much a percentage can take off a single fee.">
                <div className="disc-adorned">
                  <input id="disc-cap" type="number" inputMode="numeric" min="0" step="1" value={form.maxCap} placeholder="e.g. 6000" onChange={(event) => set({ maxCap: event.target.value })} />
                  <span>{CURRENCY}</span>
                </div>
              </Field>
            )}
          </section>

          <section className="disc-form-section">
            <h3>3. Eligibility &amp; scope</h3>
            <Field label="Who qualifies, and when" htmlFor="disc-eligibility" error={errors.eligibility} hint="Written for parents and cashiers. Say the condition and the deadline in one sentence.">
              <textarea id="disc-eligibility" rows={2} value={form.eligibility} placeholder="e.g. Paid 100% of annual tuition upfront before 15 Sept" onChange={(event) => set({ eligibility: event.target.value })} />
            </Field>
            <Field label="Applicable fee types">
              <div className="disc-checks">
                <label className={`disc-check${allFees ? " is-selected" : ""}`}>
                  <input type="checkbox" checked={allFees} onChange={() => set({ feeTypes: [] })} /> All Fees
                </label>
                {FEE_TYPES.map((feeType) => (
                  <label key={feeType} className={`disc-check${form.feeTypes.includes(feeType) ? " is-selected" : ""}`}>
                    <input type="checkbox" checked={form.feeTypes.includes(feeType)} onChange={() => toggleFeeType(feeType)} /> {feeType}
                  </label>
                ))}
              </div>
            </Field>
          </section>

          <section className="disc-form-section">
            <h3>4. Schedule &amp; behaviour</h3>
            <div className="disc-form-grid">
              <Field label="Start date" htmlFor="disc-start" error={errors.startDate}>
                <input id="disc-start" type="date" value={form.startDate} onChange={(event) => set({ startDate: event.target.value })} />
              </Field>
              <Field label="End date" htmlFor="disc-end" error={errors.endDate} hint="Leave blank for an open-ended rule.">
                <input id="disc-end" type="date" min={form.startDate || undefined} value={form.endDate} onChange={(event) => set({ endDate: event.target.value })} />
              </Field>
            </div>
            <label className="disc-switch-row">
              <span><strong>Stackable</strong><small>Can be combined with other discounts on the same fee.</small></span>
              <button type="button" role="switch" aria-checked={form.stackable} className={`disc-switch${form.stackable ? " is-on" : ""}`} onClick={() => set({ stackable: !form.stackable })}><i /></button>
            </label>
            <label className="disc-switch-row">
              <span><strong>Active</strong><small>{form.status === "active" ? "Rule will apply within its date window." : "Saved but not applied to any payment."}</small></span>
              <button type="button" role="switch" aria-checked={form.status === "active"} className={`disc-switch${form.status === "active" ? " is-on" : ""}`} onClick={() => set({ status: form.status === "active" ? "inactive" : "active" })}><i /></button>
            </label>
          </section>

          {touched && Object.keys(errors).length > 0 && <div className="disc-alert disc-alert-error">Fix the highlighted fields to save this rule.</div>}

          <footer className="disc-drawer-actions">
            <button type="button" className="disc-secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="disc-primary-btn">{isEdit ? "Save changes" : "Create discount"}</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

/* ── Read-only details drawer ─────────────────────────────────────────── */

function DetailDrawer({ rule, onEdit, onClose }) {
  const lifecycle = ruleLifecycle(rule);

  useEffect(() => {
    function onKey(event) { if (event.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="disc-backdrop" onClick={onClose}>
      <aside className="disc-drawer" role="dialog" aria-modal="true" aria-labelledby="disc-detail-title" onClick={(event) => event.stopPropagation()}>
        <header className="disc-drawer-head">
          <div>
            <span className="disc-eyebrow">{typeLabel(rule.type)}</span>
            <h2 id="disc-detail-title">{rule.name}</h2>
          </div>
          <button type="button" className="disc-icon-btn" aria-label="Close" onClick={onClose}><Icon.close /></button>
        </header>

        <div className="disc-detail-hero">
          <strong>{valueLabel(rule)}</strong>
          <span>{rule.valueType === "percentage" ? (rule.maxCap ? `capped at ${formatEGP(rule.maxCap)}` : "no cap") : "fixed amount"}</span>
          <StatusPill lifecycle={lifecycle} />
        </div>

        <dl className="disc-detail-list">
          <div><dt>Eligibility</dt><dd>{rule.eligibility}</dd></div>
          <div><dt>Applies to</dt><dd>{scopeLabel(rule.feeTypes)}</dd></div>
          <div><dt>Valid</dt><dd>{dateLabel(rule.startDate)} → {dateLabel(rule.endDate)}</dd></div>
          <div><dt>Stackable</dt><dd>{rule.stackable ? "Yes, combines with other discounts" : "No, exclusive"}</dd></div>
          <div><dt>Applied</dt><dd>{rule.appliedCount === 0 ? "Not applied to any payment yet" : `${rule.appliedCount.toLocaleString()} payments`}</dd></div>
          <div><dt>Internal notes</dt><dd className="disc-detail-notes">{rule.description || <em>No notes recorded.</em>}</dd></div>
          <div><dt>Last updated</dt><dd>{new Date(rule.updatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</dd></div>
        </dl>

        <footer className="disc-drawer-actions">
          <button type="button" className="disc-secondary-btn" onClick={onClose}>Close</button>
          <button type="button" className="disc-primary-btn" onClick={() => onEdit(rule)}><Icon.edit /> Edit rule</button>
        </footer>
      </aside>
    </div>
  );
}

/* ── Toast ───────────────────────────────────────────────────────────── */

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onDismiss, 3800);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;
  return (
    <div className={`disc-toast disc-toast-${toast.tone}`} role="status" aria-live="polite">
      {toast.tone === "success" ? <Icon.checkCircle /> : <Icon.info />}
      <span>{toast.message}</span>
      {toast.undo && <button type="button" onClick={() => { toast.undo(); onDismiss(); }}>Undo</button>}
      <button type="button" className="disc-toast-close" aria-label="Dismiss" onClick={onDismiss}><Icon.close /></button>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

let nextId = Math.max(...mockDiscounts.map((rule) => rule.id)) + 1;

export default function DiscountsPage() {
  // Local mock store. Swap the initializer for a service call when the API lands.
  const [discounts, setDiscounts] = useState(() => mockDiscounts.map((rule) => ({ ...rule, feeTypes: [...rule.feeTypes] })));
  const [filters, setFilters] = useState({ keyword: "", status: "", type: "" });
  const [panel, setPanel] = useState(null); // { kind: "add" | "edit" | "view", rule? }
  const [toast, setToast] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const today = new Date().toISOString().slice(0, 10);

  const rows = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    return discounts
      .map((rule) => ({ rule, lifecycle: ruleLifecycle(rule, today) }))
      .filter(({ rule }) => {
        const matchesKeyword = !keyword || [rule.name, rule.description, rule.eligibility, typeLabel(rule.type), scopeLabel(rule.feeTypes)].some((text) => text.toLowerCase().includes(keyword));
        const matchesStatus = !filters.status || rule.status === filters.status;
        const matchesType = !filters.type || rule.type === filters.type;
        return matchesKeyword && matchesStatus && matchesType;
      });
  }, [discounts, filters, today]);

  const summary = useMemo(() => {
    const lifecycles = discounts.map((rule) => ruleLifecycle(rule, today));
    return {
      live: lifecycles.filter((l) => l === "active").length,
      scheduled: lifecycles.filter((l) => l === "scheduled").length,
      inactive: lifecycles.filter((l) => l === "inactive" || l === "expired").length,
      applied: discounts.reduce((sum, rule) => sum + rule.appliedCount, 0),
    };
  }, [discounts, today]);

  const hasFilters = Boolean(filters.keyword || filters.status || filters.type);

  function notify(message, tone = "success", undo) {
    setToast({ id: Date.now(), message, tone, undo });
  }

  /* CRUD handlers — each is a pure replacement of the array, never a mutation. */

  function createDiscount(rule) {
    const created = { ...rule, id: nextId++ };
    setDiscounts((current) => [created, ...current]);
    setPanel(null);
    notify(`“${created.name}” created${created.status === "active" ? " and active" : " as inactive"}.`);
  }

  function updateDiscount(rule) {
    setDiscounts((current) => current.map((item) => (item.id === rule.id ? rule : item)));
    setPanel(null);
    notify(`“${rule.name}” updated.`);
  }

  function toggleDiscount(rule) {
    const nextStatus = rule.status === "active" ? "inactive" : "active";
    const apply = (status) => setDiscounts((current) => current.map((item) => (item.id === rule.id ? { ...item, status, updatedAt: new Date().toISOString() } : item)));
    apply(nextStatus);
    setPanel(null);
    notify(nextStatus === "active" ? `“${rule.name}” turned on.` : `“${rule.name}” turned off. Existing receipts are unaffected.`, "success", () => apply(rule.status));
  }

  const openAdd = () => setPanel({ kind: "add" });
  const openEdit = (rule) => setPanel({ kind: "edit", rule });
  const openView = (rule) => setPanel({ kind: "view", rule });
  const closePanel = () => setPanel(null);

  return (
    <div className="disc-page">
      <header className="disc-head">
        <div className="disc-heading-group">
          <span className="disc-heading-icon"><Icon.tag /></span>
          <div>
            <h1>Discounts</h1>
            <p>Set up, schedule and switch off the discount rules your institution offers.</p>
          </div>
        </div>
        <button type="button" className="disc-primary-btn" onClick={openAdd}><Icon.plus /> Add Discount</button>
      </header>

      <div className="disc-summary">
        <div className="disc-stat"><span>Live now</span><strong>{summary.live}</strong></div>
        <div className="disc-stat"><span>Scheduled</span><strong>{summary.scheduled}</strong></div>
        <div className="disc-stat"><span>Off / expired</span><strong>{summary.inactive}</strong></div>
        <div className="disc-stat"><span>Payments discounted</span><strong>{summary.applied.toLocaleString()}</strong></div>
      </div>

      <div className="disc-panel disc-toolbar">
        <label className="disc-search">
          <span className="disc-label-text">Search</span>
          <span className="disc-input-wrap"><Icon.search /><input value={filters.keyword} placeholder="Name, notes, eligibility, fee type…" onChange={(event) => setFilters({ ...filters, keyword: event.target.value })} /></span>
        </label>
        <label>
          <span className="disc-label-text">Status</span>
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          <span className="disc-label-text">Type</span>
          <select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}>
            <option value="">All types</option>
            {DISCOUNT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        {hasFilters && <button type="button" className="disc-secondary-btn disc-clear" onClick={() => setFilters({ keyword: "", status: "", type: "" })}>Clear</button>}
      </div>

      <section className="disc-panel disc-table-panel">
        <div className="disc-table-head">
          <div><h2>Discount Rules</h2><span>Turning a rule off stops it applying immediately and keeps its history.</span></div>
          <strong>{rows.length} of {discounts.length} rules</strong>
        </div>

        <div className="disc-table-scroll">
          {rows.length > 0 ? (
            <table>
              <thead>
                <tr><th>Description</th><th>Value</th><th>Status</th><th className="disc-actions-col">Actions</th></tr>
              </thead>
              <tbody>
                {rows.map(({ rule, lifecycle }) => (
                  <tr key={rule.id} className={rule.status === "inactive" ? "is-inactive" : ""}>
                    <td className="disc-desc-cell">
                      <div className="disc-desc-title">
                        <button type="button" className="disc-link" onClick={() => openView(rule)}>{rule.name}</button>
                        <span className={`disc-type disc-type-${rule.type}`}>{typeLabel(rule.type)}</span>
                        {rule.stackable && <span className="disc-tag">Stackable</span>}
                      </div>
                      <p className="disc-desc-elig" title={rule.eligibility}>{rule.eligibility}</p>
                      <small>{scopeLabel(rule.feeTypes)} · {dateLabel(rule.startDate)} → {dateLabel(rule.endDate)}</small>
                    </td>
                    <td className="disc-value-cell">
                      <strong>{valueLabel(rule)}</strong>
                      {rule.valueType === "percentage" && rule.maxCap && <small>cap {formatEGP(rule.maxCap)}</small>}
                    </td>
                    <td>
                      <StatusPill lifecycle={lifecycle} />
                      {rule.appliedCount > 0 && <small className="disc-applied">applied {rule.appliedCount.toLocaleString()}×</small>}
                    </td>
                    <td className="disc-actions-col">
                      <div className="disc-row-actions">
                        <button type="button" role="switch" aria-checked={rule.status === "active"} aria-label={`${rule.status === "active" ? "Turn off" : "Turn on"} ${rule.name}`} className={`disc-switch disc-switch-sm${rule.status === "active" ? " is-on" : ""}`} onClick={() => toggleDiscount(rule)}><i /></button>
                        <RowMenu rule={rule} onView={openView} onEdit={openEdit} onToggle={toggleDiscount} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="disc-empty">
              <span className="disc-empty-icon"><Icon.tag /></span>
              {hasFilters ? (
                <>
                  <strong>No rules match these filters</strong>
                  <span>Try a different keyword, or clear the status and type filters.</span>
                  <button type="button" className="disc-secondary-btn" onClick={() => setFilters({ keyword: "", status: "", type: "" })}>Clear filters</button>
                </>
              ) : (
                <>
                  <strong>No discount rules yet</strong>
                  <span>Create your first rule to reward full or early payment.</span>
                  <button type="button" className="disc-primary-btn" onClick={openAdd}><Icon.plus /> Add Discount</button>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {panel?.kind === "add" && <DiscountDrawer mode="add" onSave={createDiscount} onClose={closePanel} />}
      {panel?.kind === "edit" && <DiscountDrawer key={panel.rule.id} mode="edit" rule={panel.rule} onSave={updateDiscount} onClose={closePanel} />}
      {panel?.kind === "view" && <DetailDrawer rule={discounts.find((r) => r.id === panel.rule.id) ?? panel.rule} onEdit={openEdit} onClose={closePanel} />}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
