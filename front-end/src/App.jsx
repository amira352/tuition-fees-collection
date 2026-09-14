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
// Discounts page is hidden for now. Re-enable by restoring this import and its route below.
// import DiscountsPage from "./pages/institution/DiscountsPage";

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
    <BrowserRouter>
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

          {/* Institution Portal */}
          <Route
            path="/institution"
            element={
              <ProtectedRoute>
                <InstitutionLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<InstitutionDashboard />} />
            <Route path="fees" element={<FeesManagement />} />
            {/* <Route path="discounts" element={<DiscountsPage />} /> */}
            <Route path="payments" element={<InstitutionPayments />} />
            <Route path="epp-plans" element={<InstitutionEppPlans />} />
            <Route path="upload-dues" element={<UploadDues />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="notifications" element={<ComingSoon />} />
            <Route path="profile" element={<ComingSoon />} />
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

          <Route path="/" element={<Home />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}