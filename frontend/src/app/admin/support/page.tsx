"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Filter, MessageSquare, Shield, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  category:
    | "TECHNICAL"
    | "BILLING"
    | "GENERAL"
    | "FEATURE_REQUEST"
    | "BUG_REPORT";
  assignedToEmail?: string;
  assignedToName?: string;
  tags: string[];
  satisfaction?: number;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
  lastMessage?: {
    id: string;
    content: string;
    senderType: "USER" | "AGENT" | "SYSTEM";
    createdAt: string;
  };
  _count: {
    messages: number;
  };
}

interface TicketsResponse {
  tickets: SupportTicket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function AdminSupportPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<
    TicketsResponse["pagination"] | null
  >(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null,
  );
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (statusFilter) params.append("status", statusFilter);

      const data: TicketsResponse = await api.get(
        `/admin/support/tickets?${params}`,
      );
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
      toast.error("Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (!isLoading && (!user || user.role === "USER")) {
      router.push("/dashboard");
      return;
    }

    if (user) {
      fetchTickets();
    }
  }, [user, isLoading, router, page, statusFilter, fetchTickets]);

  const handleUpdateTicketStatus = async (
    ticketId: string,
    status: string,
    assignedToEmail?: string,
  ) => {
    setActionLoading(true);
    try {
      await api.put(`/admin/support/tickets/${ticketId}`, {
        status,
        assignedToEmail: assignedToEmail || user?.email,
      });
      toast.success("Ticket status updated successfully");
      fetchTickets();
      setShowTicketModal(false);
    } catch (error) {
      console.error("Failed to update ticket status:", error);
      toast.error("Failed to update ticket status");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;

    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths}mo ago`;
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "OPEN":
        return `${baseClasses} bg-red-500/20 text-red-300`;
      case "IN_PROGRESS":
        return `${baseClasses} bg-blue-500/20 text-blue-300`;
      case "WAITING":
        return `${baseClasses} bg-yellow-500/20 text-yellow-300`;
      case "RESOLVED":
        return `${baseClasses} bg-green-500/20 text-green-300`;
      case "CLOSED":
        return `${baseClasses} bg-gray-500/20 text-gray-300`;
      default:
        return `${baseClasses} bg-gray-500/20 text-gray-300`;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (priority) {
      case "URGENT":
        return `${baseClasses} bg-red-600/20 text-red-400`;
      case "HIGH":
        return `${baseClasses} bg-orange-500/20 text-orange-300`;
      case "MEDIUM":
        return `${baseClasses} bg-yellow-500/20 text-yellow-300`;
      case "LOW":
        return `${baseClasses} bg-green-500/20 text-green-300`;
      default:
        return `${baseClasses} bg-gray-500/20 text-gray-300`;
    }
  };

  const getCategoryBadge = (_category: string) => {
    const baseClasses =
      "px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300";
    return baseClasses;
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-n0de-green mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading support tickets...</p>
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
              <h1 className="text-xl font-bold">Support Tickets</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-width py-8">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
            <select
              className="pl-10 pr-8 py-2 bg-bg-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-n0de-green"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING">Waiting</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div className="flex-1"></div>

          {/* Stats */}
          <div className="flex items-center space-x-4 text-sm text-text-secondary">
            <span>Total: {pagination?.total || 0}</span>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-main border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    Ticket
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    User
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    Priority
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    Category
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    Last Activity
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="border-b border-border hover:bg-bg-elevated/50"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-sm">
                          {ticket.title}
                        </div>
                        <div className="text-xs text-text-secondary line-clamp-2">
                          {ticket.description}
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                          <div className="flex items-center space-x-1 text-xs text-text-muted">
                            <MessageSquare className="w-3 h-3" />
                            <span>{ticket._count.messages}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-text-muted">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(ticket.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-sm">
                          {ticket.user.firstName && ticket.user.lastName
                            ? `${ticket.user.firstName} ${ticket.user.lastName}`
                            : ticket.user.username || "N/A"}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {ticket.user.email}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={getStatusBadge(ticket.status)}>
                        {ticket.status.replace("_", " ")}
                      </span>
                      {ticket.assignedToEmail && (
                        <div className="text-xs text-text-muted mt-1">
                          Assigned to:{" "}
                          {ticket.assignedToName || ticket.assignedToEmail}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={getPriorityBadge(ticket.priority)}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={getCategoryBadge(ticket.category)}>
                        {ticket.category.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        {ticket.lastMessage
                          ? formatTimeAgo(ticket.lastMessage.createdAt)
                          : formatTimeAgo(ticket.createdAt)}
                      </div>
                      {ticket.lastMessage && (
                        <div className="text-xs text-text-muted line-clamp-1 mt-1">
                          {ticket.lastMessage.content}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setShowTicketModal(true);
                        }}
                        className="p-2 hover:bg-bg-elevated rounded-lg"
                      >
                        <Eye className="w-4 h-4" />
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
                {pagination.total} tickets
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

        {/* Ticket Modal */}
        {showTicketModal && selectedTicket && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-bg-elevated rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    {selectedTicket.title}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className={getStatusBadge(selectedTicket.status)}>
                      {selectedTicket.status.replace("_", " ")}
                    </span>
                    <span className={getPriorityBadge(selectedTicket.priority)}>
                      {selectedTicket.priority}
                    </span>
                    <span className={getCategoryBadge(selectedTicket.category)}>
                      {selectedTicket.category.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-3 bg-bg-main rounded">
                  <strong>Description:</strong>
                  <p className="mt-2 text-text-secondary">
                    {selectedTicket.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-bg-main rounded">
                    <strong>User:</strong>
                    <p className="text-text-secondary">
                      {selectedTicket.user.firstName &&
                      selectedTicket.user.lastName
                        ? `${selectedTicket.user.firstName} ${selectedTicket.user.lastName}`
                        : selectedTicket.user.username || "N/A"}
                    </p>
                    <p className="text-sm text-text-muted">
                      {selectedTicket.user.email}
                    </p>
                  </div>

                  <div className="p-3 bg-bg-main rounded">
                    <strong>Created:</strong>
                    <p className="text-text-secondary">
                      {formatDate(selectedTicket.createdAt)}
                    </p>
                    <p className="text-sm text-text-muted">
                      {formatTimeAgo(selectedTicket.createdAt)}
                    </p>
                  </div>

                  {selectedTicket.assignedToEmail && (
                    <div className="p-3 bg-bg-main rounded">
                      <strong>Assigned to:</strong>
                      <p className="text-text-secondary">
                        {selectedTicket.assignedToName ||
                          selectedTicket.assignedToEmail}
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-bg-main rounded">
                    <strong>Messages:</strong>
                    <p className="text-text-secondary">
                      {selectedTicket._count.messages}
                    </p>
                  </div>
                </div>

                {selectedTicket.tags.length > 0 && (
                  <div className="p-3 bg-bg-main rounded">
                    <strong>Tags:</strong>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedTicket.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-bg-elevated rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTicket.lastMessage && (
                  <div className="p-3 bg-bg-main rounded">
                    <strong>Last Message:</strong>
                    <p className="text-text-secondary mt-2">
                      {selectedTicket.lastMessage.content}
                    </p>
                    <p className="text-xs text-text-muted mt-2">
                      By {selectedTicket.lastMessage.senderType.toLowerCase()} •{" "}
                      {formatTimeAgo(selectedTicket.lastMessage.createdAt)}
                    </p>
                  </div>
                )}
              </div>

              {/* Status Update Actions */}
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {["IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"].map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() =>
                          handleUpdateTicketStatus(selectedTicket.id, status)
                        }
                        disabled={
                          actionLoading || selectedTicket.status === status
                        }
                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                          selectedTicket.status === status
                            ? "bg-gray-500 text-gray-300 cursor-not-allowed"
                            : "bg-n0de-green hover:bg-n0de-green-dark text-black font-medium"
                        }`}
                      >
                        Mark as {status.replace("_", " ").toLowerCase()}
                      </button>
                    ),
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowTicketModal(false)}
                    className="flex-1 btn-secondary"
                    disabled={actionLoading}
                  >
                    Close
                  </button>
                  <button
                    onClick={() =>
                      router.push(`/admin/support/${selectedTicket.id}`)
                    }
                    className="flex-1 btn-primary"
                  >
                    View Full Conversation
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
