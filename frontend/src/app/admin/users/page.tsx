"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  MoreVertical,
  Shield,
  ShieldCheck,
  Eye,
  Ban,
  CheckCircle,
  AlertCircle,
  Crown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  isActive: boolean;
  isSuspended: boolean;
  suspendedReason?: string;
  createdAt: string;
  lastLoginAt?: string;
  currentSubscription?: {
    planType: string;
    status: string;
  };
  lastPayment?: {
    amount: number;
    status: string;
    createdAt: string;
  };
  _count: {
    apiKeys: number;
    supportTickets: number;
    payments: number;
  };
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function AdminUsersPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<
    UsersResponse["pagination"] | null
  >(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (search) params.append("search", search);
      if (roleFilter) params.append("role", roleFilter);

      const data: UsersResponse = await api.get(`/admin/users?${params}`);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    if (!isLoading && (!user || user.role === "USER")) {
      router.push("/dashboard");
      return;
    }

    if (user) {
      fetchUsers();
    }
  }, [user, isLoading, router, page, search, roleFilter, fetchUsers]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page on search
  };

  const handleRoleFilterChange = (role: string) => {
    setRoleFilter(role);
    setPage(1); // Reset to first page on filter change
  };

  const handleSuspendUser = async (userId: string, reason: string) => {
    setActionLoading(true);
    try {
      await api.post(`/admin/users/${userId}/suspend`, { reason });
      toast.success("User suspended successfully");
      fetchUsers();
      setShowUserModal(false);
    } catch (error) {
      console.error("Failed to suspend user:", error);
      toast.error("Failed to suspend user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspendUser = async (userId: string) => {
    setActionLoading(true);
    try {
      await api.post(`/admin/users/${userId}/unsuspend`);
      toast.success("User unsuspended successfully");
      fetchUsers();
      setShowUserModal(false);
    } catch (error) {
      console.error("Failed to unsuspend user:", error);
      toast.error("Failed to unsuspend user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setActionLoading(true);
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      toast.success("User role updated successfully");
      fetchUsers();
      setShowUserModal(false);
    } catch (error) {
      console.error("Failed to update user role:", error);
      toast.error("Failed to update user role");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case "ADMIN":
        return <ShieldCheck className="w-4 h-4 text-blue-500" />;
      default:
        return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (role) {
      case "SUPER_ADMIN":
        return `${baseClasses} bg-yellow-500/20 text-yellow-300`;
      case "ADMIN":
        return `${baseClasses} bg-blue-500/20 text-blue-300`;
      default:
        return `${baseClasses} bg-gray-500/20 text-gray-300`;
    }
  };

  const getStatusIcon = (user: User) => {
    if (user.isSuspended) {
      return <Ban className="w-4 h-4 text-red-500" />;
    } else if (user.isActive) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-n0de-green mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main">
      {/* Header */}
      <div className="bg-bg-elevated border-b border-border">
        <div className="container-width">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/admin")}
                className="flex items-center space-x-2 text-text-secondary hover:text-text-primary"
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </button>
              <span className="text-text-muted">/</span>
              <h1 className="text-xl font-bold">Users</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-width py-8">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search users by email, username, or name..."
              className="w-full pl-10 pr-4 py-2 bg-bg-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-n0de-green"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
            <select
              className="pl-10 pr-8 py-2 bg-bg-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-n0de-green"
              value={roleFilter}
              onChange={(e) => handleRoleFilterChange(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="USER">Users</option>
              <option value="ADMIN">Admins</option>
              <option value="SUPER_ADMIN">Super Admins</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-main border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    User
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    Subscription
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    Last Login
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border hover:bg-bg-elevated/50"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.username || "N/A"}
                        </div>
                        <div className="text-sm text-text-secondary">
                          {user.email}
                        </div>
                        <div className="text-xs text-text-muted">
                          ID: {user.id.slice(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(user.role)}
                        <span className={getRoleBadge(user.role)}>
                          {user.role.replace("_", " ")}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(user)}
                        <span
                          className={
                            user.isSuspended ? "text-red-400" : "text-green-400"
                          }
                        >
                          {user.isSuspended
                            ? "Suspended"
                            : user.isActive
                              ? "Active"
                              : "Inactive"}
                        </span>
                      </div>
                      {user.isSuspended && user.suspendedReason && (
                        <div className="text-xs text-text-muted mt-1">
                          {user.suspendedReason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {user.currentSubscription ? (
                        <div>
                          <div className="font-medium">
                            {user.currentSubscription.planType}
                          </div>
                          <div className="text-sm text-text-secondary">
                            {user.currentSubscription.status}
                          </div>
                        </div>
                      ) : (
                        <span className="text-text-muted">No subscription</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {user.lastLoginAt ? (
                        <div>
                          <div className="text-sm">
                            {formatDate(user.lastLoginAt)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-text-muted">Never</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserModal(true);
                        }}
                        className="p-2 hover:bg-bg-elevated rounded-lg"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="border-t border-border px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-text-secondary">
                Showing {(page - 1) * pagination.limit + 1} to{" "}
                {Math.min(page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} users
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 border border-border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm">
                  {page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.pages}
                  className="px-3 py-1 border border-border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Modal */}
        {showUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-bg-elevated rounded-lg p-6 w-full max-w-lg mx-4">
              <h3 className="text-lg font-semibold mb-4">
                User Actions:{" "}
                {selectedUser.firstName && selectedUser.lastName
                  ? `${selectedUser.firstName} ${selectedUser.lastName}`
                  : selectedUser.username || "Unknown User"}
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-bg-main rounded">
                  <span>Email:</span>
                  <span className="font-medium">{selectedUser.email}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-bg-main rounded">
                  <span>Role:</span>
                  <span className="font-medium">
                    {selectedUser.role.replace("_", " ")}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-bg-main rounded">
                  <span>Status:</span>
                  <span
                    className={`font-medium ${selectedUser.isSuspended ? "text-red-400" : "text-green-400"}`}
                  >
                    {selectedUser.isSuspended ? "Suspended" : "Active"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-bg-main rounded">
                  <span>API Keys:</span>
                  <span className="font-medium">
                    {selectedUser._count.apiKeys}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-bg-main rounded">
                  <span>Support Tickets:</span>
                  <span className="font-medium">
                    {selectedUser._count.supportTickets}
                  </span>
                </div>

                {/* Actions */}
                <div className="border-t border-border pt-4 space-y-3">
                  <button
                    onClick={() =>
                      router.push(`/admin/users/${selectedUser.id}`)
                    }
                    className="w-full btn-secondary flex items-center justify-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>

                  {user?.role === "ADMIN" && selectedUser.role !== "ADMIN" && (
                    <select
                      onChange={(e) =>
                        handleUpdateRole(selectedUser.id, e.target.value)
                      }
                      className="w-full p-2 bg-bg-main border border-border rounded"
                      defaultValue={selectedUser.role}
                      disabled={actionLoading}
                    >
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                  )}

                  {selectedUser.isSuspended ? (
                    <button
                      onClick={() => handleUnsuspendUser(selectedUser.id)}
                      disabled={actionLoading}
                      className="w-full btn-primary flex items-center justify-center space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Unsuspend User</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const reason = prompt("Suspension reason:");
                        if (reason) {
                          handleSuspendUser(selectedUser.id, reason);
                        }
                      }}
                      disabled={actionLoading}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg flex items-center justify-center space-x-2"
                    >
                      <Ban className="w-4 h-4" />
                      <span>Suspend User</span>
                    </button>
                  )}
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="flex-1 btn-secondary"
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
