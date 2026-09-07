import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../lib/auth";

/**
 * Wrap any route that requires a signed-in user.
 * Sends unauthenticated visitors to /login and remembers where they
 * were headed so Login can send them back after signing in.
 */
export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
