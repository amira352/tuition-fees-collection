import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SearchPage from "./pages/SearchPage";
import FeePaymentPage from "./pages/FeePaymentPage";
import ReceiptPage from "./pages/ReceiptPage";
import ReceiptsPage from "./pages/ReceiptsPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";
import { isAuthenticated } from "./lib/auth";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated() ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/browse" element={<SearchPage />} />
          <Route path="/payment" element={<FeePaymentPage />} />
          <Route path="/receipt" element={<ReceiptPage />} />
          <Route path="/history" element={<PlaceholderPage title="Transaction History" />} />
          <Route path="/receipts" element={<ReceiptsPage />} />
        </Route>

        <Route
          path="/"
          element={<Navigate to={isAuthenticated() ? "/dashboard" : "/login"} replace />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}