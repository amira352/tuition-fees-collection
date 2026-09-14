/**
 * Mock data + pure state helpers for the institution Discounts page.
 *
 * The backend has no discount endpoint or data model yet, so this module is
 * the single seam to replace later: a service layer can return the same rule
 * shape and the page component will not need to change.
 *
 * Rule shape
 * ─────────
 * id            number   stable identity
 * name          string   shown in the table
 * description   string   INTERNAL admin notes (approval memo, policy ref)
 * type          "pay_in_full" | "pay_early" | "custom"
 * valueType     "percentage" | "fixed"
 * value         number   percent (0–100) or EGP amount
 * maxCap        number|null  EGP ceiling, only meaningful for percentage
 * eligibility   string   STUDENT-FACING rule summary: who qualifies and when
 * feeTypes      string[] fee types the rule applies to; [] means "All Fees"
 * startDate     "YYYY-MM-DD"
 * endDate       "YYYY-MM-DD" | ""  (empty = open-ended)
 * stackable     boolean  may be combined with other discounts
 * status        "active" | "inactive"  (admin switch, independent of dates)
 * appliedCount  number   payments this rule has already been applied to;
 *                        > 0 blocks hard delete so history stays intact
 * createdAt / updatedAt  ISO timestamps
 */

export const DISCOUNT_TYPES = [
  { value: "pay_in_full", label: "Pay in Full", hint: "Reward paying the whole fee upfront." },
  { value: "pay_early", label: "Pay Early", hint: "Reward paying before a cut-off date." },
  { value: "custom", label: "Custom", hint: "Siblings, staff, scholarships, hardship…" },
];

export const FEE_TYPES = ["Tuition", "Bus Transport", "Registration", "Books & Lab", "Activities"];

export const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const CURRENCY = "EGP";

const now = "2026-09-14T09:00:00.000Z";

export const mockDiscounts = [
  {
    id: 1,
    name: "Full Payment – 10%",
    description: "Approved by the Finance Committee, memo FC-2026-04. Applies to the annual tuition invoice only; partial payments do not qualify.",
    type: "pay_in_full",
    valueType: "percentage",
    value: 10,
    maxCap: 6000,
    eligibility: "Parent settles 100% of annual tuition in a single payment before 15 Sept 2026.",
    feeTypes: ["Tuition"],
    startDate: "2026-07-01",
    endDate: "2026-09-15",
    stackable: false,
    status: "active",
    appliedCount: 214,
    createdAt: "2026-06-20T10:12:00.000Z",
    updatedAt: "2026-08-02T14:40:00.000Z",
  },
  {
    id: 2,
    name: "Early Bird – 5%",
    description: "Standing early-payment incentive renewed every academic year. Automatically superseded by the Full Payment rule when both match.",
    type: "pay_early",
    valueType: "percentage",
    value: 5,
    maxCap: null,
    eligibility: "Any tuition instalment paid at least 30 days before its due date.",
    feeTypes: ["Tuition", "Registration"],
    startDate: "2026-06-01",
    endDate: "2026-12-31",
    stackable: true,
    status: "active",
    appliedCount: 87,
    createdAt: "2026-05-28T08:00:00.000Z",
    updatedAt: "2026-05-28T08:00:00.000Z",
  },
  {
    id: 3,
    name: "Sibling Discount – 15%",
    description: "Board policy P-11. Second and subsequent children enrolled at the same time. Registrar must verify the family link before the discount is granted.",
    type: "custom",
    valueType: "percentage",
    value: 15,
    maxCap: 9000,
    eligibility: "Second and subsequent enrolled sibling, verified by the Registrar office.",
    feeTypes: [],
    startDate: "2026-01-01",
    endDate: "",
    stackable: true,
    status: "active",
    appliedCount: 142,
    createdAt: "2025-12-15T11:30:00.000Z",
    updatedAt: "2026-03-10T09:15:00.000Z",
  },
  {
    id: 4,
    name: "Bus Route Launch Offer",
    description: "Marketing-funded promotion for the new East Cairo bus routes. Budget owner: Transport Office.",
    type: "custom",
    valueType: "fixed",
    value: 750,
    maxCap: null,
    eligibility: "First-time bus subscribers on routes E1–E4 during the Fall 2026 term.",
    feeTypes: ["Bus Transport"],
    startDate: "2026-09-01",
    endDate: "2026-10-31",
    stackable: false,
    status: "active",
    appliedCount: 0,
    createdAt: "2026-08-25T13:05:00.000Z",
    updatedAt: "2026-08-25T13:05:00.000Z",
  },
  {
    id: 5,
    name: "Staff Children – 25%",
    description: "HR benefit for full-time academic and administrative staff. Turned off pending HR policy revision (ticket HR-3382).",
    type: "custom",
    valueType: "percentage",
    value: 25,
    maxCap: null,
    eligibility: "Children of full-time employees with an active HR contract on the invoice date.",
    feeTypes: ["Tuition"],
    startDate: "2025-09-01",
    endDate: "",
    stackable: false,
    status: "inactive",
    appliedCount: 38,
    createdAt: "2025-08-19T09:45:00.000Z",
    updatedAt: "2026-08-30T16:20:00.000Z",
  },
  {
    id: 6,
    name: "Spring Term Early Settlement",
    description: "Draft for Spring 2027. Values still to be confirmed by Finance; not to be activated before the December board meeting.",
    type: "pay_early",
    valueType: "fixed",
    value: 1200,
    maxCap: null,
    eligibility: "Spring 2027 tuition paid in full before 20 Dec 2026.",
    feeTypes: ["Tuition"],
    startDate: "2026-11-15",
    endDate: "2026-12-20",
    stackable: false,
    status: "inactive",
    appliedCount: 0,
    createdAt: now,
    updatedAt: now,
  },
];

/* ── Pure helpers (no React, no side effects) ─────────────────────────── */

export function emptyDiscountForm() {
  return {
    name: "",
    description: "",
    type: "pay_in_full",
    valueType: "percentage",
    value: "",
    maxCap: "",
    eligibility: "",
    feeTypes: [],
    startDate: "",
    endDate: "",
    stackable: false,
    status: "active",
  };
}

export function ruleToForm(rule) {
  return {
    name: rule.name,
    description: rule.description,
    type: rule.type,
    valueType: rule.valueType,
    value: String(rule.value),
    maxCap: rule.maxCap == null ? "" : String(rule.maxCap),
    eligibility: rule.eligibility,
    feeTypes: [...rule.feeTypes],
    startDate: rule.startDate,
    endDate: rule.endDate,
    stackable: rule.stackable,
    status: rule.status,
  };
}

/** Returns a map of field -> message. Empty object means valid. */
export function validateDiscountForm(form) {
  const errors = {};
  const value = Number(form.value);
  const cap = form.maxCap === "" ? null : Number(form.maxCap);

  if (!form.name.trim()) errors.name = "Give the discount a name.";
  else if (form.name.trim().length > 80) errors.name = "Keep the name under 80 characters.";

  if (form.value === "" || !Number.isFinite(value) || value <= 0) errors.value = "Enter a value greater than zero.";
  else if (form.valueType === "percentage" && value > 100) errors.value = "A percentage cannot exceed 100%.";

  if (form.valueType === "percentage" && cap !== null && (!Number.isFinite(cap) || cap <= 0)) {
    errors.maxCap = "The cap must be a positive amount, or left blank.";
  }

  if (!form.eligibility.trim()) errors.eligibility = "Describe who qualifies and when.";

  if (!form.startDate) errors.startDate = "Choose when the rule starts.";
  if (form.endDate && form.startDate && form.endDate < form.startDate) errors.endDate = "End date must be on or after the start date.";

  return errors;
}

export function formToRule(form, base = {}) {
  const timestamp = new Date().toISOString();
  return {
    id: base.id,
    createdAt: base.createdAt ?? timestamp,
    appliedCount: base.appliedCount ?? 0,
    name: form.name.trim(),
    description: form.description.trim(),
    type: form.type,
    valueType: form.valueType,
    value: Number(form.value),
    maxCap: form.valueType === "percentage" && form.maxCap !== "" ? Number(form.maxCap) : null,
    eligibility: form.eligibility.trim(),
    feeTypes: [...form.feeTypes],
    startDate: form.startDate,
    endDate: form.endDate,
    stackable: Boolean(form.stackable),
    status: form.status,
    updatedAt: timestamp,
  };
}

/**
 * Lifecycle combines the admin switch with the date window so the table can
 * show "Scheduled" / "Expired" without the admin having to read the dates.
 */
export function ruleLifecycle(rule, today = new Date().toISOString().slice(0, 10)) {
  if (rule.status !== "active") return "inactive";
  if (rule.startDate && rule.startDate > today) return "scheduled";
  if (rule.endDate && rule.endDate < today) return "expired";
  return "active";
}

export const LIFECYCLE_LABELS = {
  active: "Active",
  scheduled: "Scheduled",
  expired: "Expired",
  inactive: "Inactive",
};

export function typeLabel(type) {
  return DISCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function canDelete(rule) {
  return rule.appliedCount === 0;
}
