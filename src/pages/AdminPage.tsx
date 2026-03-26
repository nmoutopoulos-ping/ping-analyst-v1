import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabaseRestoreSession } from "../lib/supabase";

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type User = {
  id: string;
  email: string;
  name: string;
  api_key: string;
  role: string;
  created_at: string;
  auth_id: string | null;
  last_sign_in: string | null;
  email_confirmed: boolean;
};

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `PING-${seg()}-${seg()}`;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // New user form
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newApiKey, setNewApiKey] = useState(generateApiKey());
  const [newRole, setNewRole] = useState("user");
  const [creating, setCreating] = useState(false);

  // Password reset
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  async function getHeaders(): Promise<Record<string, string>> {
    const token = localStorage.getItem("sb_access_token");
    return {
      Authorization: `Bearer ${token}`,
      apikey: SB_KEY,
      "Content-Type": "application/json",
    };
  }

  async function checkAdmin() {
    const valid = await supabaseRestoreSession();
    if (!valid) {
      navigate("/login");
      return false;
    }
    const role = localStorage.getItem("sb_access_token");
    // Decode JWT to check role
    if (role) {
      try {
        const payload = JSON.parse(atob(role.split(".")[1]));
        if (payload.user_metadata?.role !== "admin") {
          setError("Admin access required");
          return false;
        }
      } catch {
        navigate("/login");
        return false;
      }
    }
    return true;
  }

  async function fetchUsers() {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${SB_URL}/functions/v1/admin-users`, { headers });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch users");
      }
      const data = await res.json();
      setUsers(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkAdmin().then((ok) => {
      if (ok) fetchUsers();
    });
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      const headers = await getHeaders();
      const res = await fetch(`${SB_URL}/functions/v1/admin-users`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          name: newName,
          api_key: newApiKey,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      setSuccess(`User ${newEmail} created successfully`);
      setShowForm(false);
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewApiKey(generateApiKey());
      setNewRole("user");
      await fetchUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  async function handleResetPassword(userId: string) {
    if (!resetPassword) return;
    setError("");
    setSuccess("");
    try {
      const headers = await getHeaders();
      const res = await fetch(`${SB_URL}/functions/v1/admin-users?id=${userId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      setSuccess("Password updated");
      setResetUserId(null);
      setResetPassword("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to reset password");
    }
  }

  async function handleToggleRole(user: User) {
    setError("");
    setSuccess("");
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      const headers = await getHeaders();
      const res = await fetch(`${SB_URL}/functions/v1/admin-users?id=${user.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      setSuccess(`${user.name} is now ${newRole}`);
      await fetchUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update role");
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Delete ${user.name} (${user.email})? This cannot be undone.`)) return;
    setError("");
    try {
      const headers = await getHeaders();
      const res = await fetch(`${SB_URL}/functions/v1/admin-users?id=${user.id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Failed to delete user");
      setSuccess(`${user.name} deleted`);
      await fetchUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete user");
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          {showForm ? "Cancel" : "+ New User"}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Create User Form */}
      {showForm && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Create New User</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Minimum 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setNewApiKey(generateApiKey())}
                  className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm hover:bg-gray-200"
                >
                  Generate
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading users...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  API Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Sign In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                    {user.api_key}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_sign_in
                      ? new Date(user.last_sign_in).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {resetUserId === user.id ? (
                      <span className="inline-flex items-center gap-2">
                        <input
                          type="text"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          placeholder="New password"
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-32"
                        />
                        <button
                          onClick={() => handleResetPassword(user.id)}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setResetUserId(null);
                            setResetPassword("");
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => setResetUserId(user.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => handleToggleRole(user)}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          {user.role === "admin" ? "Demote" : "Promote"}
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-8 text-gray-500">No users found</div>
          )}
        </div>
      )}
    </div>
  );
}
