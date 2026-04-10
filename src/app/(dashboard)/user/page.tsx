"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

type Role = "admin" | "manager" | "staff";

interface Me {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role | null;
}

interface TeamMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role | null;
  createdAt: string | null;
}

export default function UserPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [addUserForm, setAddUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "staff" as Role,
  });
  const [addingUser, setAddingUser] = useState(false);

  const isAdmin = me?.role === "admin";

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/users/me");
      if (meRes.ok) {
        const meData: Me = await meRes.json();
        setMe(meData);
        setFirstName(meData.firstName ?? "");
        setLastName(meData.lastName ?? "");
      }

      const teamRes = await fetch("/api/users");
      if (teamRes.ok) {
        setTeam(await teamRes.json());
      } else if (teamRes.status !== 403) {
        toast.error("Failed to load team members");
      }
    } catch {
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to update profile");
        return;
      }
      toast.success("Profile updated");
      await fetchAll();
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to change password");
        return;
      }
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAddUser = async () => {
    setAddingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addUserForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to invite user");
        return;
      }
      toast.success("Team member added");
      setShowAddUser(false);
      setAddUserForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "staff",
      });
      await fetchAll();
    } finally {
      setAddingUser(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: Role) => {
    const res = await fetch(`/api/users/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to update role");
      return;
    }
    toast.success("Role updated");
    await fetchAll();
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm("Remove this team member? This cannot be undone.")) return;
    const res = await fetch(`/api/users/${memberId}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to remove team member");
      return;
    }
    toast.success("Team member removed");
    await fetchAll();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage team members and permissions</p>
        </div>
        {isAdmin && (
          <Button variant="primary" type="button" onClick={() => setShowAddUser(true)}>
            <Plus size={20} className="mr-2" />
            Add User
          </Button>
        )}
      </div>

      <Card className="mb-8">
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-gray-600">Loading...</p>
          ) : team.length === 0 ? (
            <p className="text-gray-600">No team members found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-600">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Role</th>
                    {isAdmin && <th className="py-2 pr-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {team.map((member) => {
                    const isSelf = member.id === me?.id;
                    return (
                      <tr key={member.id} className="border-b border-gray-100">
                        <td className="py-3 pr-4">
                          {[member.firstName, member.lastName].filter(Boolean).join(" ") ||
                            "—"}
                          {isSelf && (
                            <span className="ml-2 text-xs text-gray-500">(you)</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-gray-700">{member.email}</td>
                        <td className="py-3 pr-4">
                          {isAdmin ? (
                            <Select
                              value={member.role ?? "staff"}
                              onChange={(e) =>
                                handleRoleChange(member.id, e.target.value as Role)
                              }
                              options={[
                                { value: "staff", label: "Staff" },
                                { value: "manager", label: "Manager" },
                                { value: "admin", label: "Admin" },
                              ]}
                            />
                          ) : (
                            <span className="capitalize">{member.role ?? "staff"}</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="py-3 pr-4 text-right">
                            {!isSelf && (
                              <Button
                                variant="outline"
                                type="button"
                                onClick={() => handleRemove(member.id)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Your Profile</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <Input label="Email" type="email" value={me?.email ?? ""} disabled />
        </CardBody>
        <CardFooter>
          <Button
            variant="primary"
            type="button"
            onClick={handleSaveProfile}
            disabled={savingProfile}
          >
            {savingProfile ? "Saving..." : "Save changes"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </CardBody>
        <CardFooter>
          <Button
            variant="primary"
            type="button"
            onClick={handleChangePassword}
            disabled={savingPassword}
          >
            {savingPassword ? "Saving..." : "Change password"}
          </Button>
        </CardFooter>
      </Card>

      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Add Team Member</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <Input
                label="First Name"
                placeholder="John"
                value={addUserForm.firstName}
                onChange={(e) =>
                  setAddUserForm({ ...addUserForm, firstName: e.target.value })
                }
              />
              <Input
                label="Last Name"
                placeholder="Doe"
                value={addUserForm.lastName}
                onChange={(e) =>
                  setAddUserForm({ ...addUserForm, lastName: e.target.value })
                }
              />
              <Input
                label="Email"
                type="email"
                placeholder="john@example.com"
                value={addUserForm.email}
                onChange={(e) =>
                  setAddUserForm({ ...addUserForm, email: e.target.value })
                }
              />
              <Input
                label="Temporary Password"
                type="password"
                placeholder="Min 8 characters"
                value={addUserForm.password}
                onChange={(e) =>
                  setAddUserForm({ ...addUserForm, password: e.target.value })
                }
              />
              <Select
                label="Role"
                value={addUserForm.role}
                onChange={(e) =>
                  setAddUserForm({
                    ...addUserForm,
                    role: e.target.value as Role,
                  })
                }
                options={[
                  { value: "staff", label: "Staff" },
                  { value: "manager", label: "Manager" },
                  { value: "admin", label: "Admin" },
                ]}
              />
            </CardBody>
            <CardFooter className="space-x-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowAddUser(false)}
                disabled={addingUser}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={handleAddUser}
                disabled={addingUser}
              >
                {addingUser ? "Adding..." : "Add User"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
