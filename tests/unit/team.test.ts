/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ──────────────────────────────────────────────────────────────────────────────
// Mocks
// ──────────────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db/client", () => {
  const mockDb = {
    membership: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    invite: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  };
  return { db: mockDb };
});

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi
    .fn()
    .mockResolvedValue({
      id: "user-caller",
      displayName: "Caller User",
      email: "caller@example.com",
    }),
}));

vi.mock("@/lib/utils/audit", () => ({
  createAuditLog: vi.fn().mockResolvedValue({ id: "audit-1" }),
}));

import { db } from "@/lib/db/client";
import { createAuditLog } from "@/lib/utils/audit";
import { GET as listMembers } from "@/app/api/v1/organizations/[orgId]/memberships/route";
import {
  PATCH as updateMemberRole,
  DELETE as removeMember,
} from "@/app/api/v1/organizations/[orgId]/memberships/[userId]/route";
import {
  GET as listInvites,
  POST as createInvite,
} from "@/app/api/v1/organizations/[orgId]/invites/route";
import { DELETE as revokeInvite } from "@/app/api/v1/organizations/[orgId]/invites/[inviteId]/route";

const ORG_ID = "org-abc";
const CALLER_ID = "user-caller";
const TARGET_USER_ID = "user-target";
const INVITE_ID = "invite-xyz";

// Helper to create a mock OWNER membership for the caller
const callerOwnerMembership = {
  id: "mem-caller",
  organizationId: ORG_ID,
  userId: CALLER_ID,
  role: "OWNER" as const,
  status: "ACTIVE" as const,
};

const callerAdminMembership = {
  ...callerOwnerMembership,
  role: "ADMIN" as const,
};

const targetMembership = {
  id: "mem-target",
  organizationId: ORG_ID,
  userId: TARGET_USER_ID,
  role: "MEMBER" as const,
  status: "ACTIVE" as const,
  user: { displayName: "Target User", email: "target@example.com" },
};

describe("Team Management API – Memberships", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── GET /memberships ──────────────────────────────────────────────────────

  it("GET /memberships returns 403 when caller is not a member", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValueOnce(null);

    const req = new NextRequest(`http://localhost/api/v1/organizations/${ORG_ID}/memberships`);
    const res = await listMembers(req, { params: Promise.resolve({ orgId: ORG_ID }) });

    expect(res.status).toBe(403);
  });

  it("GET /memberships returns 200 with member list", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValueOnce(callerOwnerMembership as any);
    vi.mocked(db.membership.findMany).mockResolvedValueOnce([
      {
        ...callerOwnerMembership,
        user: {
          id: CALLER_ID,
          email: "caller@example.com",
          displayName: "Caller User",
          avatarUrl: null,
          createdAt: new Date(),
        },
      },
    ] as any);

    const req = new NextRequest(`http://localhost/api/v1/organizations/${ORG_ID}/memberships`);
    const res = await listMembers(req, { params: Promise.resolve({ orgId: ORG_ID }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].userId).toBe(CALLER_ID);
  });

  // ── PATCH /memberships/[userId] ───────────────────────────────────────────

  it("PATCH role update returns 403 when caller is not OWNER/ADMIN", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValueOnce(null); // no admin membership

    const req = new NextRequest(
      `http://localhost/api/v1/organizations/${ORG_ID}/memberships/${TARGET_USER_ID}`,
      { method: "PATCH", body: JSON.stringify({ role: "ADMIN" }) }
    );
    const res = await updateMemberRole(req, {
      params: Promise.resolve({ orgId: ORG_ID, userId: TARGET_USER_ID }),
    });

    expect(res.status).toBe(403);
  });

  it("PATCH role update succeeds and writes audit log", async () => {
    vi.mocked(db.membership.findFirst)
      .mockResolvedValueOnce(callerOwnerMembership as any)
      .mockResolvedValueOnce(targetMembership as any);

    vi.mocked(db.membership.update).mockResolvedValueOnce({
      ...targetMembership,
      role: "ADMIN",
    } as any);

    const req = new NextRequest(
      `http://localhost/api/v1/organizations/${ORG_ID}/memberships/${TARGET_USER_ID}`,
      { method: "PATCH", body: JSON.stringify({ role: "ADMIN" }) }
    );
    const res = await updateMemberRole(req, {
      params: Promise.resolve({ orgId: ORG_ID, userId: TARGET_USER_ID }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.role).toBe("ADMIN");
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: "TEAM_ROLE_CHANGED", targetId: targetMembership.id })
    );
  });

  it("PATCH returns 403 when ADMIN tries to promote to OWNER", async () => {
    vi.mocked(db.membership.findFirst)
      .mockResolvedValueOnce(callerAdminMembership as any)
      .mockResolvedValueOnce(targetMembership as any);

    const req = new NextRequest(
      `http://localhost/api/v1/organizations/${ORG_ID}/memberships/${TARGET_USER_ID}`,
      { method: "PATCH", body: JSON.stringify({ role: "OWNER" }) }
    );
    const res = await updateMemberRole(req, {
      params: Promise.resolve({ orgId: ORG_ID, userId: TARGET_USER_ID }),
    });

    expect(res.status).toBe(403);
  });

  // ── DELETE /memberships/[userId] ──────────────────────────────────────────

  it("DELETE member returns 403 when caller is not OWNER/ADMIN", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValueOnce(null);

    const req = new NextRequest(
      `http://localhost/api/v1/organizations/${ORG_ID}/memberships/${TARGET_USER_ID}`,
      { method: "DELETE" }
    );
    const res = await removeMember(req, {
      params: Promise.resolve({ orgId: ORG_ID, userId: TARGET_USER_ID }),
    });

    expect(res.status).toBe(403);
  });

  it("DELETE member succeeds and writes audit log", async () => {
    vi.mocked(db.membership.findFirst)
      .mockResolvedValueOnce(callerOwnerMembership as any)
      .mockResolvedValueOnce(targetMembership as any);

    vi.mocked(db.membership.update).mockResolvedValueOnce({
      ...targetMembership,
      status: "REMOVED",
    } as any);

    const req = new NextRequest(
      `http://localhost/api/v1/organizations/${ORG_ID}/memberships/${TARGET_USER_ID}`,
      { method: "DELETE" }
    );
    const res = await removeMember(req, {
      params: Promise.resolve({ orgId: ORG_ID, userId: TARGET_USER_ID }),
    });

    expect(res.status).toBe(200);
    expect(db.membership.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "REMOVED" } })
    );
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: "TEAM_MEMBER_REMOVED" })
    );
  });

  it("DELETE member prevents removing last owner", async () => {
    const ownerTarget = { ...targetMembership, role: "OWNER" as const };
    vi.mocked(db.membership.findFirst)
      .mockResolvedValueOnce(callerOwnerMembership as any)
      .mockResolvedValueOnce(ownerTarget as any);
    vi.mocked(db.membership.count).mockResolvedValueOnce(1 as any); // only one owner

    const req = new NextRequest(
      `http://localhost/api/v1/organizations/${ORG_ID}/memberships/${TARGET_USER_ID}`,
      { method: "DELETE" }
    );
    const res = await removeMember(req, {
      params: Promise.resolve({ orgId: ORG_ID, userId: TARGET_USER_ID }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.message).toMatch(/last owner/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Invites
// ─────────────────────────────────────────────────────────────────────────────

describe("Team Management API – Invites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /invites returns 403 for non-admins", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValueOnce(null);

    const req = new NextRequest(`http://localhost/api/v1/organizations/${ORG_ID}/invites`);
    const res = await listInvites(req, { params: Promise.resolve({ orgId: ORG_ID }) });

    expect(res.status).toBe(403);
  });

  it("GET /invites returns pending invites for admin", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValueOnce(callerAdminMembership as any);
    vi.mocked(db.invite.findMany).mockResolvedValueOnce([
      {
        id: INVITE_ID,
        email: "new@example.com",
        role: "MEMBER",
        expiresAt: new Date(Date.now() + 86400000),
        invitedBy: { id: CALLER_ID, displayName: "Caller User", email: "caller@example.com" },
      },
    ] as any);

    const req = new NextRequest(`http://localhost/api/v1/organizations/${ORG_ID}/invites`);
    const res = await listInvites(req, { params: Promise.resolve({ orgId: ORG_ID }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].email).toBe("new@example.com");
  });

  it("POST /invites creates invite and writes audit log", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValueOnce(callerOwnerMembership as any);
    vi.mocked(db.user.findUnique).mockResolvedValueOnce(null); // invitee is new user
    vi.mocked(db.invite.updateMany).mockResolvedValueOnce({ count: 0 } as any);
    vi.mocked(db.invite.create).mockResolvedValueOnce({
      id: INVITE_ID,
      email: "newmember@example.com",
      role: "MEMBER",
      expiresAt: new Date(Date.now() + 7 * 86400000),
      invitedBy: { displayName: "Caller User", email: "caller@example.com" },
    } as any);

    const req = new NextRequest(`http://localhost/api/v1/organizations/${ORG_ID}/invites`, {
      method: "POST",
      body: JSON.stringify({ email: "newmember@example.com", role: "MEMBER" }),
    });
    const res = await createInvite(req, { params: Promise.resolve({ orgId: ORG_ID }) });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.email).toBe("newmember@example.com");
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: "TEAM_MEMBER_INVITED" })
    );
  });

  it("POST /invites returns 409 when email is already a member", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValueOnce(callerOwnerMembership as any);
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ id: TARGET_USER_ID } as any);
    vi.mocked(db.membership.findFirst).mockResolvedValueOnce(targetMembership as any); // already a member

    const req = new NextRequest(`http://localhost/api/v1/organizations/${ORG_ID}/invites`, {
      method: "POST",
      body: JSON.stringify({ email: "target@example.com", role: "MEMBER" }),
    });
    const res = await createInvite(req, { params: Promise.resolve({ orgId: ORG_ID }) });

    expect(res.status).toBe(409);
  });

  it("POST /invites returns 403 when ADMIN tries to invite with OWNER role", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValueOnce(callerAdminMembership as any);

    const req = new NextRequest(`http://localhost/api/v1/organizations/${ORG_ID}/invites`, {
      method: "POST",
      body: JSON.stringify({ email: "someone@example.com", role: "OWNER" }),
    });
    const res = await createInvite(req, { params: Promise.resolve({ orgId: ORG_ID }) });

    expect(res.status).toBe(403);
  });

  it("DELETE /invites/[inviteId] revokes invite and writes audit log", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValueOnce(callerOwnerMembership as any);
    vi.mocked(db.invite.findFirst).mockResolvedValueOnce({
      id: INVITE_ID,
      organizationId: ORG_ID,
      email: "pending@example.com",
      role: "MEMBER",
      revokedAt: null,
    } as any);
    vi.mocked(db.invite.update).mockResolvedValueOnce({
      id: INVITE_ID,
      revokedAt: new Date(),
    } as any);

    const req = new NextRequest(
      `http://localhost/api/v1/organizations/${ORG_ID}/invites/${INVITE_ID}`,
      { method: "DELETE" }
    );
    const res = await revokeInvite(req, {
      params: Promise.resolve({ orgId: ORG_ID, inviteId: INVITE_ID }),
    });

    expect(res.status).toBe(200);
    expect(db.invite.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: INVITE_ID } })
    );
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: "TEAM_INVITE_REVOKED" })
    );
  });

  it("DELETE /invites/[inviteId] returns 409 when invite is already revoked", async () => {
    vi.mocked(db.membership.findFirst).mockResolvedValueOnce(callerOwnerMembership as any);
    vi.mocked(db.invite.findFirst).mockResolvedValueOnce({
      id: INVITE_ID,
      organizationId: ORG_ID,
      email: "pending@example.com",
      role: "MEMBER",
      revokedAt: new Date(), // already revoked
    } as any);

    const req = new NextRequest(
      `http://localhost/api/v1/organizations/${ORG_ID}/invites/${INVITE_ID}`,
      { method: "DELETE" }
    );
    const res = await revokeInvite(req, {
      params: Promise.resolve({ orgId: ORG_ID, inviteId: INVITE_ID }),
    });

    expect(res.status).toBe(409);
  });
});
