import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditLog, Membership, Organization, User, Session } from "@prisma/client";

// Mock the database client
vi.mock("@/lib/db/client", () => {
  const mockDb = {
    auditLog: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    membership: {
      findFirst: vi.fn(),
    },
    organization: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };
  return { db: mockDb };
});

// Mock getSessionUser
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn().mockResolvedValue({
    id: "user-1",
    email: "test@example.com",
    displayName: "Test User",
  }),
}));

import { db } from "@/lib/db/client";
import { createAuditLog } from "@/lib/utils/audit";
import { GET as getAuditLogs } from "@/app/api/v1/organizations/[orgId]/audit-log/route";
import { PATCH as updateOrg, DELETE as deleteOrg } from "@/app/api/v1/organizations/[orgId]/route";
import { GET as getProfile, PATCH as updateProfile } from "@/app/api/v1/me/route";
import { GET as getSessions } from "@/app/api/v1/me/sessions/route";
import { DELETE as revokeSession } from "@/app/api/v1/me/sessions/[sessionId]/route";
import { NextRequest } from "next/server";

interface MockMembershipQuery {
  where?: {
    role?: string;
  };
}

describe("Audit Logs & Settings Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createAuditLog Utility", () => {
    it("should successfully save audit log to DB", async () => {
      vi.mocked(db.auditLog.create).mockResolvedValue({ id: "log-1" } as unknown as AuditLog);

      const result = await createAuditLog({
        organizationId: "org-1",
        actorUserId: "user-1",
        actorName: "Test User",
        actorEmail: "test@example.com",
        actionType: "PROJECT_CREATE",
        targetType: "Project",
        targetId: "proj-1",
        beforeState: null,
        afterState: { name: "New Project" },
      });

      expect(db.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: "org-1",
          actorUserId: "user-1",
          actorNameSnapshot: "Test User",
          actorEmailSnapshot: "test@example.com",
          actionType: "PROJECT_CREATE",
          targetType: "Project",
          targetId: "proj-1",
        }),
      });
      expect(result).toEqual({ id: "log-1" });
    });
  });

  describe("Audit Logs API Endpoint", () => {
    it("should fetch paginated audit logs for members", async () => {
      vi.mocked(db.membership.findFirst).mockResolvedValue({
        id: "mem-1",
      } as unknown as Membership);
      vi.mocked(db.auditLog.count).mockResolvedValue(1);
      vi.mocked(db.auditLog.findMany).mockResolvedValue([
        { id: "log-1", actionType: "PROJECT_CREATE" },
      ] as unknown as AuditLog[]);

      const req = new NextRequest(
        "http://localhost/api/v1/organizations/org-1/audit-log?page=1&pageSize=10"
      );
      const res = await getAuditLogs(req, { params: Promise.resolve({ orgId: "org-1" }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.meta.totalPages).toBe(1);
    });

    it("should block non-members from reading audit logs", async () => {
      vi.mocked(db.membership.findFirst).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/v1/organizations/org-1/audit-log");
      const res = await getAuditLogs(req, { params: Promise.resolve({ orgId: "org-1" }) });

      expect(res.status).toBe(403);
    });
  });

  describe("Organization Mutation Endpoints", () => {
    it("should allow owners/admins to update organization name", async () => {
      vi.mocked(db.membership.findFirst).mockResolvedValue({
        id: "mem-1",
        role: "ADMIN",
        organization: { id: "org-1", name: "Old Name", slug: "old-name" },
      } as unknown as Membership & { organization: Organization });
      vi.mocked(db.organization.update).mockResolvedValue({
        id: "org-1",
        name: "New Name",
        slug: "new-name",
      } as unknown as Organization);
      vi.mocked(db.auditLog.create).mockResolvedValue({} as unknown as AuditLog);

      const req = new NextRequest("http://localhost/api/v1/organizations/org-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "New Name" }),
      });

      const res = await updateOrg(req, { params: Promise.resolve({ orgId: "org-1" }) });
      expect(res.status).toBe(200);
      expect(db.organization.update).toHaveBeenCalled();
      expect(db.auditLog.create).toHaveBeenCalled();
    });

    it("should allow only OWNER to delete organization", async () => {
      vi.mocked(db.membership.findFirst).mockImplementation((async (query: unknown) => {
        const q = query as MockMembershipQuery;
        if (q.where?.role === "OWNER") {
          return { id: "mem-1", organization: { id: "org-1" } } as unknown as Membership;
        }
        return null;
      }) as unknown as never);
      vi.mocked(db.organization.update).mockResolvedValue({
        id: "org-1",
      } as unknown as Organization);

      const req = new NextRequest("http://localhost/api/v1/organizations/org-1", {
        method: "DELETE",
      });
      const res = await deleteOrg(req, { params: Promise.resolve({ orgId: "org-1" }) });

      expect(res.status).toBe(200);
      expect(db.organization.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe("User Profile & Sessions Endpoints", () => {
    it("should retrieve profile of session user", async () => {
      vi.mocked(db.user.findFirst).mockResolvedValue({
        id: "user-1",
        displayName: "Test User",
        email: "test@example.com",
      } as unknown as User);

      const res = await getProfile();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.displayName).toBe("Test User");
    });

    it("should allow session user to update display name", async () => {
      vi.mocked(db.user.update).mockResolvedValue({
        id: "user-1",
        displayName: "New Name",
      } as unknown as User);

      const req = new NextRequest("http://localhost/api/v1/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName: "New Name" }),
      });
      const res = await updateProfile(req);

      expect(res.status).toBe(200);
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { displayName: "New Name" },
        select: expect.any(Object),
      });
    });

    it("should retrieve active sessions", async () => {
      vi.mocked(db.session.findMany).mockResolvedValue([
        { id: "sess-1", ipAddress: "127.0.0.1" },
      ] as unknown as Session[]);

      const res = await getSessions();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
    });

    it("should revoke specified session", async () => {
      vi.mocked(db.session.findUnique).mockResolvedValue({
        id: "sess-1",
        userId: "user-1",
      } as unknown as Session);
      vi.mocked(db.session.update).mockResolvedValue({ id: "sess-1" } as unknown as Session);

      const req = new NextRequest("http://localhost/api/v1/me/sessions/sess-1", {
        method: "DELETE",
      });
      const res = await revokeSession(req, { params: Promise.resolve({ sessionId: "sess-1" }) });

      expect(res.status).toBe(200);
      expect(db.session.update).toHaveBeenCalledWith({
        where: { id: "sess-1" },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
