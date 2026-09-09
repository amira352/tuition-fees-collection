// BE-3 item 9: this file used to be a second, independent implementation
// of the exact same role check as auth.middleware.js's requireRole() —
// same logic, different error shape (this one never got the flat
// { code, message, field } fix, and would have silently drifted out of
// sync again the next time either file changed). Consolidated to one real
// implementation, re-exported under the old name so nothing that already
// imports { authorizeRoles } from here has to change.
//
// New code should import requireRole directly from auth.middleware.js —
// this file exists only so existing imports keep working.
export { requireRole as authorizeRoles } from "./auth.middleware.js";
