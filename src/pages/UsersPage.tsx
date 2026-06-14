import { useEffect, useState } from "react";
import { User } from "../types";
import { useAuth } from "../auth/AuthContext";
import { getUsers, createUser, deleteUser } from "../api";

export default function UsersPage() {
  const { isAdmin } = useAuth();

  // Client-side guard only — the backend independently enforces the admin role
  // on every /api/users request (the browser is never a trust boundary).
  if (!isAdmin) {
    return (
      <div className="page-container">
        <h1>Access Denied</h1>
        <p style={{ color: "#999" }}>
          You need administrator privileges to manage users.
        </p>
      </div>
    );
  }

  return <UserManagement />;
}

function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("analyst");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = () => {
    setLoading(true);
    getUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(loadUsers, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;
    setFormError("");
    setSubmitting(true);
    try {
      const created = await createUser({
        email: newEmail,
        password: newPassword,
        role: newRole,
      });
      setUsers((prev) => [...prev, created]);
      setNewEmail("");
      setNewPassword("");
      setNewRole("analyst");
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistically remove, restore on failure.
    const previous = users;
    setUsers((prev) => prev.filter((u) => u.id !== id));
    try {
      await deleteUser(id);
    } catch (err) {
      setUsers(previous);
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1>User Management</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add User"}
        </button>
      </div>

      {showForm && (
        <div style={{ border: "1px solid #ddd", padding: 16, marginBottom: 20, background: "#fafafa" }}>
          <h3 style={{ marginBottom: 12 }}>New User</h3>
          <form onSubmit={handleAddUser}>
            <div style={{ marginBottom: 8 }}>
              <label>Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@penguwave.io"
                required
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="password (min 8 chars)"
                required
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Role</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="admin">Admin</option>
                <option value="analyst">Analyst</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            {formError && (
              <p role="alert" style={{ color: "#c00", marginBottom: 12, fontSize: 14 }}>
                {formError}
              </p>
            )}
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Creating…" : "Create User"}
            </button>
          </form>
        </div>
      )}

      {loading && <p style={{ color: "#999" }}>Loading users…</p>}
      {error && (
        <p role="alert" style={{ color: "#c00" }}>
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <span style={{ color: user.status === "active" ? "green" : "#999" }}>
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(user.id);
                      }}
                      style={{ color: "red" }}
                    >
                      Delete
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && <p style={{ color: "#999" }}>No users.</p>}
        </>
      )}
    </div>
  );
}
