import { Navigate, useLocation } from "react-router-dom";
import { getUser, isAuthenticated, mustChangePassword } from "../lib/auth";

/**
 * Wrap any route that requires a signed-in user.
 * - unauthenticated visitors go to /login (remembering where they were headed)
 * - first-login accounts are forced to /set-password until they set one;
 *   pass `allowPasswordChange` on the /set-password route itself to opt out.
 * - pass `allowedRoles={["admin"]}` to also block signed-in users whose role
 *   isn't in the list (e.g. a back-office agent typing /admin/institutions
 *   directly into the address bar) — they're bounced to /dashboard.
 */
export default function ProtectedRoute({ children, allowPasswordChange = false, allowedRoles }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!allowPasswordChange && mustChangePassword()) {
    return <Navigate to="/set-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(getUser()?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}