// src/App.jsx
import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";
import InstitutionLayout from "./components/InstitutionLayout";
import ComingSoon from "./components/ComingSoon";
import Login from "./pages/Login";
import SetPassword from "./pages/SetPassword";
import Dashboard from "./pages/Dashboard";
import SearchPage from "./pages/SearchPage";
import FeePaymentPage from "./pages/FeePaymentPage";
import ReceiptPage from "./pages/ReceiptPage";
import ReceiptsPage from "./pages/ReceiptsPage";
import TransactionHistoryPage from "./pages/TransactionHistoryPage";
import Admin from "./pages/Admin";
import InstitutionsManagement from "./pages/InstitutionsManagement";
import BackOfficeManagement from "./pages/BackOfficeManagement";
import NotFound from "./pages/NotFound";
import { getUser, isAuthenticated } from "./lib/auth";
import ReportsPage from "./pages/institution/ReportsPage";

// Lazy-loaded pages
const InstitutionDashboard = lazy(() =>
  import("./pages/institution/InstitutionDashboard")
);
const InstitutionPayments = lazy(() =>
  import("./pages/institution/InstitutionPayments")
);
const InstitutionEppPlans = lazy(() =>
  import("./pages/institution/InstitutionEppPlans")
);
const StudentsPage = lazy(() =>
  import("./pages/institution/StudentsPage")
);

// Fallbacks for files that may not exist on all branches
const FeesManagement = lazy(() =>
  import("./pages/institution/FeesManagement").catch(() => ({
    default: () => <ComingSoon />,
  }))
);
const UploadDues = lazy(() =>
  import("./pages/UploadDues").catch(() => ({
    default: () => <ComingSoon />,
  }))
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage").catch(() => ({
    default: () => <ComingSoon />,
  }))
);
const InstitutionProfile = lazy(() =>
  import("./pages/institution/InstitutionProfile").catch(() => ({
    default: () => <ComingSoon />,
  }))
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

function PublicOnlyRoute({ children }) {
  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="route-loading">Loading…</div>}>
        <Routes>
          {/* Root Redirect */}
          <Route path="/" element={<Home />} />

          {/* Public Authentication Route */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />

          <Route
            path="/set-password"
            element={
              <ProtectedRoute allowPasswordChange>
                <SetPassword />
              </ProtectedRoute>
            }
          />

          {/* Institution Portal */}
          <Route
            path="/institution"
            element={
              <ProtectedRoute allowedRoles={["institution"]}>
                <InstitutionLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<InstitutionDashboard />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="fees" element={<FeesManagement />} />
            <Route path="payments" element={<InstitutionPayments />} />
            <Route path="epp-plans" element={<InstitutionEppPlans />} />
            <Route path="upload-dues" element={<UploadDues />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="notifications" element={<ComingSoon />} />
            <Route path="profile" element={<InstitutionProfile />} />
          </Route>

          {/* Back-Office Operations & Admin */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload-dues" element={<UploadDues />} />
            <Route path="/browse" element={<SearchPage />} />
            <Route path="/payment" element={<FeePaymentPage />} />
            <Route path="/receipt" element={<ReceiptPage />} />
            <Route path="/history" element={<TransactionHistoryPage />} />
            <Route path="/receipts" element={<ReceiptsPage />} />
            <Route path="/profile" element={<ProfilePage />} />

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

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}