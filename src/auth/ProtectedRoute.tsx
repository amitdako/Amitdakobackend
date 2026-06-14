import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * Gate for authenticated routes. While the initial session restore is running
 * we render nothing meaningful (avoids a flash of the login page on reload).
 * Once settled, unauthenticated users are redirected to /login.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-container">
        <p style={{ color: "#999" }}>Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
