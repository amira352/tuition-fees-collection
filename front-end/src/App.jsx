// src/App.jsx
import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";
import InstitutionLayout from "./components/InstitutionLayout";
import ComingSoon from "./components/ComingSoon";
import Login from "./pages/Login";
import SetPassword from "./pages/SetPassword";
import Dashboard from "./pages/Dashboard";
import SearchPage from "./pages/SearchPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import Admin from "./pages/Admin";
import InstitutionsManagement from "./pages/InstitutionsManagement";
import BackOfficeManagement from "./pages/BackOfficeManagement";
import NotFound from "./pages/NotFound";
import { getUser, isAuthenticated } from "./lib/auth";

const InstitutionDashboard = lazy(() =>
  import("./pages/institution/InstitutionDashboard"),
);

function Home() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return getUser()?.role === "institution" ? (
    <Navigate to="/institution" replace />
  ) : (
    <Navigate to="/dashboard" replace />
  );
}

export default function App() {
  return (
    <Suspense fallback={<div className="route-loading">Loading…</div>}>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated() ? <Navigate to="/" replace /> : <Login />}
        />

        <Route
          path="/set-password"
          element={
            <ProtectedRoute allowPasswordChange>
              <SetPassword />
            </ProtectedRoute>
          }
        />

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

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/browse" element={<SearchPage />} />
          <Route path="/history" element={<PlaceholderPage title="Transaction History" />} />
          <Route path="/receipts" element={<PlaceholderPage title="Receipts" />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/institutions"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <InstitutionsManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/back-office"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <BackOfficeManagement />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}