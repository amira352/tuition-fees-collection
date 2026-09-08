import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated, mustChangePassword } from "../lib/auth";

/**
 * Wrap any route that requires a signed-in user.
 * - unauthenticated visitors go to /login (remembering where they were headed)
 * - first-login accounts are forced to /set-password until they set one;
 *   pass `allowPasswordChange` on the /set-password route itself to opt out.
 */
export default function ProtectedRoute({ children, allowPasswordChange = false }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!allowPasswordChange && mustChangePassword()) {
    return <Navigate to="/set-password" replace />;
  }

  return children;
}
