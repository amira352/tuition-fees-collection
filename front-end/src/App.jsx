import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";
import InstitutionLayout from "./components/InstitutionLayout";
import ComingSoon from "./components/ComingSoon";
import Login from "./pages/Login";
import SetPassword from "./pages/SetPassword";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { getUser, isAuthenticated } from "./lib/auth";

// The institution dashboard pulls in the charting library — load it on demand
// so it doesn't weigh down the login page.
const InstitutionDashboard = lazy(() =>
  import("./pages/institution/InstitutionDashboard"),
);

// "/" sends institutions to their portal; everyone else gets the back-office view.
function Home() {
  return getUser()?.role === "institution" ? (
    <Navigate to="/institution" replace />
  ) : (
    <Dashboard />
  );
}

export default function App() {
  return (
    <Suspense fallback={<div className="route-loading">Loading…</div>}>
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={isAuthenticated() ? <Navigate to="/" replace /> : <Login />}
        />

<<<<<<< HEAD
      {/* First-login password reset — signed in, but not yet let into the app */}
      <Route
        path="/set-password"
        element={
          <ProtectedRoute allowPasswordChange>
            <SetPassword />
          </ProtectedRoute>
        }
      />

      {/* Authenticated area — shares the AppShell layout */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        {/*
          New authenticated pages go here — one <Route> each, e.g.
          <Route path="/students" element={<Students />} />
        */}
      </Route>
=======
        {/* Institution portal — sidebar layout */}
        <Route
          path="/institution"
          element={
            <ProtectedRoute>
              <InstitutionLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<InstitutionDashboard />} />
          <Route path="fees" element={<ComingSoon />} />
          <Route path="discounts" element={<ComingSoon />} />
          <Route path="payments" element={<ComingSoon />} />
          <Route path="epp-plans" element={<ComingSoon />} />
          <Route path="reports" element={<ComingSoon />} />
          <Route path="notifications" element={<ComingSoon />} />
          <Route path="profile" element={<ComingSoon />} />
        </Route>
>>>>>>> origin/feat/institution-dashboard

        {/* Back-office area — top-bar layout */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Home />} />
          {/*
            New back-office pages go here — one <Route> each, e.g.
            <Route path="/students" element={<Students />} />
          */}
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
