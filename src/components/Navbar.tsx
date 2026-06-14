import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/events" style={{ textDecoration: "none", color: "inherit" }}>
          PenguWave 🐧
        </Link>
      </div>
      <div className="navbar-links">
        <Link
          to="/events"
          className={location.pathname.startsWith("/events") ? "active" : ""}
        >
          Events
        </Link>
        {/* Only admins manage users — hide the link for everyone else. */}
        {isAdmin && (
          <Link to="/users" className={location.pathname === "/users" ? "active" : ""}>
            Users
          </Link>
        )}
        {isAuthenticated ? (
          <>
            <span style={{ color: "#666", fontSize: 14 }}>{user?.email}</span>
            <button onClick={handleLogout} className="navbar-login-btn">
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="navbar-login-btn">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
