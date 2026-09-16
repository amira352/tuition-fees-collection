/**
 * Extra institution-profile fields the backend doesn't have yet.
 * institution.repository.js only stores { id, name, type, email,
 * password_hash, must_change_password, is_active } — the display ID, joined
 * date, and phone below are mock, kept here so it's obvious what's real vs.
 * illustrative.
 *
 * Real, from the logged-in session: name, type, email (see getUser()).
 */

export function getMockProfileExtras(user) {
  return {
    displayId: `INS-${String(user?.id || "000000").slice(-6).toUpperCase().padStart(6, "0")}`,
    joinedDate: "2020-01-15",
    contact: {
      phone: "+20 2 2612 3456",
    },
  };
}
