"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  X,
  Mail,
  ShieldCheck,
  ChevronDown,
  Clock,
} from "lucide-react";

type Role = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

interface Org {
  id: string;
  name: string;
  slug: string;
}

interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
}

interface MemberUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface Member {
  id: string;
  userId: string;
  role: Role;
  status: string;
  joinedAt: string | null;
  createdAt: string;
  user: MemberUser;
}

interface Invite {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    id: string;
    displayName: string;
    email: string;
  };
}

interface TeamSettingsClientProps {
  org: Org;
  currentUser: CurrentUser;
  currentUserRole: Role;
}

const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

const ROLE_BADGE_CLASSES: Record<Role, string> = {
  OWNER: "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60",
  ADMIN: "bg-blue-950/60 text-blue-300 border border-blue-800/60",
  MEMBER: "bg-zinc-800/80 text-zinc-300 border border-zinc-700/60",
  VIEWER: "bg-zinc-900/60 text-zinc-500 border border-zinc-800/40",
};

export function TeamSettingsClient({ org, currentUser, currentUserRole }: TeamSettingsClientProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Role update state
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);

  // Remove member state
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  // Revoke invite state
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const fetchTeamData = useCallback(() => {
    setLoading(true);
    setError(null);

    Promise.resolve().then(async () => {
      try {
        const [membersRes, invitesRes] = await Promise.all([
          fetch(`/api/v1/organizations/${org.id}/memberships`),
          canManage ? fetch(`/api/v1/organizations/${org.id}/invites`) : Promise.resolve(null),
        ]);

        const membersBody = await membersRes.json();
        if (!membersRes.ok) throw new Error(membersBody.error?.message || "Failed to load team");
        setMembers(membersBody.data);

        if (invitesRes) {
          const invitesBody = await invitesRes.json();
          if (invitesRes.ok) setInvites(invitesBody.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load team data");
      } finally {
        setLoading(false);
      }
    });
  }, [org.id, canManage]);

  useEffect(() => {
    const run = () => Promise.resolve().then(() => fetchTeamData());
    run();
  }, [fetchTeamData]);


  const handleUpdateRole = async (userId: string, newRole: Role) => {
    setUpdatingRoleUserId(userId);
    try {
      const res = await fetch(`/api/v1/organizations/${org.id}/memberships/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to update role");
      setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role: newRole } : m)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setUpdatingRoleUserId(null);
    }
  };

  const handleRemoveMember = async (userId: string, displayName: string) => {
    if (!confirm(`Are you sure you want to remove ${displayName} from this organization?`)) return;
    setRemovingUserId(userId);
    try {
      const res = await fetch(`/api/v1/organizations/${org.id}/memberships/${userId}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to remove member");
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleRevokeInvite = async (inviteId: string, email: string) => {
    if (!confirm(`Revoke the pending invite for ${email}?`)) return;
    setRevokingInviteId(inviteId);
    try {
      const res = await fetch(`/api/v1/organizations/${org.id}/invites/${inviteId}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to revoke invite");
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke invite");
    } finally {
      setRevokingInviteId(null);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);

    try {
      const res = await fetch(`/api/v1/organizations/${org.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to send invite");
      setInviteSuccess(true);
      setInviteEmail("");
      // Add to invites list
      setInvites((prev) => [body.data, ...prev]);
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess(false);
      }, 1200);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const getAssignableRoles = (): ("ADMIN" | "MEMBER" | "VIEWER")[] => {
    if (currentUserRole === "OWNER") return ["ADMIN", "MEMBER", "VIEWER"];
    return ["MEMBER", "VIEWER"];
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Team Members</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Manage who has access to{" "}
            <span className="text-emerald-400 font-semibold">{org.name}</span>.
          </p>
        </div>
        {canManage && (
          <button
            id="invite-member-btn"
            onClick={() => {
              setInviteEmail("");
              setInviteRole("MEMBER");
              setInviteError(null);
              setInviteSuccess(false);
              setShowInviteModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-all shadow-md"
          >
            <UserPlus className="h-4 w-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* Members Table */}
      {loading ? (
        <div className="flex items-center gap-2.5 text-zinc-400 text-sm py-8">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-500" />
          Loading team members...
        </div>
      ) : error ? (
        <div className="flex items-start gap-2.5 p-4 bg-rose-950/30 border border-rose-900/50 rounded-xl text-rose-400 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-zinc-500">
          <Users className="h-10 w-10 text-zinc-700" />
          <span className="text-sm font-medium">No members found.</span>
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/30">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400 text-xs uppercase tracking-wider font-bold">
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Joined</th>
                {canManage && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {members.map((member) => {
                const isCurrentUser = member.userId === currentUser.id;
                const isOwner = member.role === "OWNER";
                const canChangeRole =
                  canManage && !isCurrentUser && !(currentUserRole === "ADMIN" && isOwner);
                const canRemove =
                  canManage && !isCurrentUser && !(currentUserRole === "ADMIN" && isOwner);

                return (
                  <tr key={member.id} className="hover:bg-zinc-900/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-xs font-bold text-zinc-300">
                          {member.user.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-200">
                            {member.user.displayName}
                            {isCurrentUser && (
                              <span className="ml-2 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500">{member.user.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {canChangeRole ? (
                        <div className="relative flex items-center gap-1.5">
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleUpdateRole(member.userId, e.target.value as Role)
                            }
                            disabled={updatingRoleUserId === member.userId}
                            className="appearance-none bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 pr-7 text-xs font-semibold text-zinc-200 hover:border-zinc-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
                          >
                            {(["OWNER", "ADMIN", "MEMBER", "VIEWER"] as Role[]).map((r) => {
                              const hierarchyOk = currentUserRole === "OWNER" || r !== "OWNER";
                              return (
                                <option key={r} value={r} disabled={!hierarchyOk}>
                                  {ROLE_LABELS[r]}
                                </option>
                              );
                            })}
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1.5 h-3 w-3 text-zinc-500 pointer-events-none" />
                          {updatingRoleUserId === member.userId && (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                          )}
                        </div>
                      ) : (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ROLE_BADGE_CLASSES[member.role]}`}
                        >
                          {ROLE_LABELS[member.role]}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-zinc-500 text-xs hidden sm:table-cell">
                      {member.joinedAt
                        ? new Date(member.joinedAt).toLocaleDateString()
                        : new Date(member.createdAt).toLocaleDateString()}
                    </td>

                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        {canRemove && (
                          <button
                            onClick={() =>
                              handleRemoveMember(member.userId, member.user.displayName)
                            }
                            disabled={removingUserId === member.userId}
                            className="p-1.5 rounded border border-transparent hover:border-rose-900/50 hover:bg-rose-950/30 text-zinc-600 hover:text-rose-400 transition-all cursor-pointer"
                            title="Remove member"
                          >
                            {removingUserId === member.userId ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
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

      {/* Pending Invites */}
      {canManage && invites.length > 0 && (
        <section className="space-y-4 border-t border-zinc-800/80 pt-8">
          <div>
            <h3 className="text-base font-bold text-white">Pending Invitations</h3>
            <p className="text-zinc-400 text-xs mt-1">
              These people have been invited but have not yet accepted.
            </p>
          </div>

          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/20">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400 text-xs uppercase tracking-wider font-bold">
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">Expires</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {invites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-zinc-900/15 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 shrink-0">
                          <Mail className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-zinc-300 font-medium text-xs">{invite.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ROLE_BADGE_CLASSES[invite.role]}`}
                      >
                        {ROLE_LABELS[invite.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Clock className="h-3 w-3" />
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRevokeInvite(invite.id, invite.email)}
                        disabled={revokingInviteId === invite.id}
                        className="p-1.5 rounded border border-transparent hover:border-rose-900/50 hover:bg-rose-950/30 text-zinc-600 hover:text-rose-400 transition-all cursor-pointer"
                        title="Revoke invite"
                      >
                        {revokingInviteId === invite.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Empty invites state for managers with no pending invites */}
      {canManage && invites.length === 0 && !loading && (
        <section className="border-t border-zinc-800/80 pt-8 space-y-3">
          <h3 className="text-base font-bold text-white">Pending Invitations</h3>
          <div className="flex flex-col items-center gap-2.5 py-8 text-zinc-600">
            <ShieldCheck className="h-8 w-8 text-zinc-700" />
            <span className="text-xs font-medium">No pending invitations.</span>
          </div>
        </section>
      )}

      {/* INVITE MODAL */}
      {showInviteModal && (
        <>
          <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/30">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-emerald-500" />
                  Invite a Team Member
                </h2>
                <button
                  onClick={() => setShowInviteModal(false)}
                  disabled={inviting}
                  className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSendInvite} className="p-6 space-y-4">
                {inviteError && (
                  <div className="flex items-start gap-2.5 p-3 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-200 text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                    {inviteError}
                  </div>
                )}

                {inviteSuccess && (
                  <div className="flex items-start gap-2.5 p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-xl text-emerald-200 text-xs">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                    Invitation sent successfully!
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    required
                    placeholder="colleague@yourcompany.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={inviting}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                    Role
                  </label>
                  <div className="relative">
                    <select
                      id="invite-role"
                      value={inviteRole}
                      onChange={(e) =>
                        setInviteRole(e.target.value as "ADMIN" | "MEMBER" | "VIEWER")
                      }
                      disabled={inviting}
                      className="w-full appearance-none bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 pr-10 text-sm text-zinc-200 hover:border-zinc-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {getAssignableRoles().map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-zinc-400 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {inviteRole === "ADMIN"
                      ? "Admins can manage projects, members, and alerts."
                      : inviteRole === "MEMBER"
                        ? "Members can view and triage issues."
                        : "Viewers have read-only access to the organization."}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    disabled={inviting}
                    className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 text-sm font-semibold text-zinc-400 hover:text-white rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="send-invite-btn"
                    disabled={inviting || !inviteEmail.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-semibold text-white rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-md"
                  >
                    {inviting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Send Invite
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
