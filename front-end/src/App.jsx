import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UploadDues from "./pages/UploadDues";
import NotFound from "./pages/NotFound";
import { isAuthenticated } from "./lib/auth";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={isAuthenticated() ? <Navigate to="/" replace /> : <Login />}
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
        <Route path="/upload-dues" element={<UploadDues />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
