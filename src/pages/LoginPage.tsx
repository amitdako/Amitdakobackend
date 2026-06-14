import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (e.g. restored from the refresh cookie) → skip login.
  if (!loading && isAuthenticated) {
    return <Navigate to="/events" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/events", { replace: true });
    } catch (err) {
      // Keep the form open and show the (generic) server message on failure.
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 420 }}>
      <h1>Sign In</h1>
      <p style={{ color: "#666", marginBottom: 20, fontSize: 14 }}>
        Enter your credentials to access PenguWave
      </p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="username"
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        {error && (
          <p role="alert" style={{ color: "#c00", marginBottom: 12, fontSize: 14 }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          className="btn-primary"
          style={{ width: "100%" }}
          disabled={submitting}
        >
          {submitting ? "Signing In…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
