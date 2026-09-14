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
 * description   string   the whole rule in prose: kind of discount, who
 *                        qualifies and by when, approval memo, policy ref
 * value         number   percent (0–100)
 * feeTypes      string[] fee types the rule applies to; [] means "All Fees"
 * startDate     "YYYY-MM-DD"
 * endDate       "YYYY-MM-DD" | ""  (empty = open-ended)
 * stackable     boolean  may be combined with other discounts
 * status        "active" | "inactive"  (admin switch, independent of dates)
 * appliedCount  number   payments this rule has already been applied to;
 *                        > 0 blocks hard delete so history stays intact
 * createdAt / updatedAt  ISO timestamps
 */

export const FEE_TYPES = ["Tuition", "Bus Transport", "Registration", "Books & Lab", "Activities"];

export const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const now = "2026-09-14T09:00:00.000Z";

export const mockDiscounts = [
  {
    id: 1,
    description: "Full Payment – 10%. Parent settles 100% of annual tuition in a single payment before 15 Sept 2026. Approved by the Finance Committee, memo FC-2026-04.",
    value: 10,
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
    description: "Early Bird – 5%. Any tuition instalment paid at least 30 days before its due date. Renewed every academic year; superseded by Full Payment when both match.",
    value: 5,
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
    description: "Sibling Discount – 15%. Second and subsequent enrolled sibling, verified by the Registrar office. Board policy P-11.",
    value: 15,
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
    description: "Bus Route Launch – 12%. First-time bus subscribers on routes E1–E4 during the Fall 2026 term. Marketing-funded; budget owner: Transport Office.",
    value: 12,
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
    description: "Staff Children – 25%. Children of full-time employees with an active HR contract on the invoice date. Turned off pending HR policy revision, ticket HR-3382.",
    value: 25,
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
    description: "Spring Early Settlement – 5%. Spring 2027 tuition paid in full before 20 Dec 2026. Draft; values to be confirmed by Finance before the December board meeting.",
    value: 5,
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
    description: "",
    value: "",
    feeTypes: [],
    startDate: "",
    endDate: "",
    stackable: false,
    status: "active",
  };
}

export function ruleToForm(rule) {
  return {
    description: rule.description,
    value: String(rule.value),
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

  if (!form.description.trim()) errors.description = "Describe the discount.";
  else if (form.description.trim().length > 300) errors.description = "Keep the description under 300 characters.";

  if (form.value === "" || !Number.isFinite(value) || value <= 0) errors.value = "Enter a value greater than zero.";
  else if (value > 100) errors.value = "A percentage cannot exceed 100%.";

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
    description: form.description.trim(),
    value: Number(form.value),
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

export function canDelete(rule) {
  return rule.appliedCount === 0;
}
