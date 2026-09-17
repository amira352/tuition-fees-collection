/**
 * The Institution Profile page displays a short, human-friendly ID rather
 * than the raw database id — this is a purely presentational format, not
 * something the backend stores or needs to.
 */
export function getInstitutionDisplayId(id) {
  return `INS-${String(id || "000000").slice(-6).toUpperCase().padStart(6, "0")}`;
}
