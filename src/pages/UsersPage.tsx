import { useState } from "react";
import { User } from "../types";
import { useAuth } from "../auth/AuthContext";

export default function UsersPage() {
  const { isAdmin } = useAuth();

  // Client-side access control: only admins may view/manage users. This is a
  // UX guard only — the backend must still enforce the admin role on every
  // /api/users request (the browser is never a trust boundary).
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
  // Mock users no longer carry plaintext passwords. Real credentials live only
  // on the backend, hashed, and are never sent to or displayed by the client.
  const [users, setUsers] = useState<User[]>([
    { id: "1", email: "admin@penguwave.io", role: "admin", status: "active" },
    { id: "2", email: "analyst@penguwave.io", role: "analyst", status: "active" },
    { id: "3", email: "viewer@penguwave.io", role: "viewer", status: "disabled" },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("analyst");

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;

    // The password is collected to send to the backend on user creation, but
    // it is never stored in client state or rendered in the UI.
    const newUser: User = {
      id: String(Date.now()),
      email: newEmail,
      role: newRole,
      status: "active",
    };

    setUsers([...users, newUser]);
    setNewEmail("");
    setNewPassword("");
    setNewRole("analyst");
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setUsers(users.filter((u) => u.id !== id));
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
                placeholder="password"
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
            <button type="submit" className="btn-primary">
              Create User
            </button>
          </form>
        </div>
      )}

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
    </div>
  );
}
