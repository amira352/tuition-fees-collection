/**
 * Shared chart palette for the institution dashboard and EPP plans pages.
 * The dashboard's actual figures now come from the real
 * GET /institutions/:id/dashboard endpoint (see InstitutionDashboard.jsx) —
 * this file only holds presentation colors, since the backend doesn't (and
 * shouldn't) send those.
 */

export const CHART_COLORS = {
  navy: "#245fa9",
  teal: "#2f9c99",
  amber: "#e0a13c",
  slate: "#8ea3bd",
  green: "#1f9d6b",
  muted: "#cdd9e8",
};
