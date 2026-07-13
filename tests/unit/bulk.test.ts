/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/client", () => {
  const mockDb = {
    issue: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    membership: {
      findFirst: vi.fn(),
    },
    issueActivity: {
      create: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn(mockDb)),
  };
  return { db: mockDb };
});

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(() =>
    Promise.resolve({
      id: "user-1",
      displayName: "Demo User",
      email: "demo@errornest.com",
    })
  ),
}));

vi.mock("@/lib/utils/audit", () => ({
  createAuditLog: vi.fn(() => Promise.resolve({})),
}));

import { db } from "@/lib/db/client";
import { PATCH, DELETE } from "@/app/api/v1/issues/bulk/route";
import { NextRequest } from "next/server";

describe("Bulk Issue Operations API Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH /api/v1/issues/bulk", () => {
    it("should fail validation if issueIds is empty", async () => {
      const req = new NextRequest("http://localhost/api/v1/issues/bulk", {
        method: "PATCH",
        body: JSON.stringify({ issueIds: [], status: "RESOLVED" }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });

    it("should fail if no active issues match", async () => {
      vi.mocked(db.issue.findMany).mockResolvedValueOnce([]);

      const req = new NextRequest("http://localhost/api/v1/issues/bulk", {
        method: "PATCH",
        body: JSON.stringify({
          issueIds: ["f47ac10b-58cc-4372-a567-0e02b2c3d479"],
          status: "RESOLVED",
        }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(404);
    });

    it("should fail if user is a VIEWER", async () => {
      vi.mocked(db.issue.findMany).mockResolvedValueOnce([
        {
          id: "i-1",
          projectId: "p-1",
          status: "UNRESOLVED",
          project: { organizationId: "org-1" },
        },
      ] as any);

      vi.mocked(db.membership.findFirst).mockResolvedValueOnce({
        role: "VIEWER",
        status: "ACTIVE",
      } as any);

      const req = new NextRequest("http://localhost/api/v1/issues/bulk", {
        method: "PATCH",
        body: JSON.stringify({
          issueIds: ["f47ac10b-58cc-4372-a567-0e02b2c3d479"],
          status: "RESOLVED",
        }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(403);
    });

    it("should succeed and update status for valid request", async () => {
      const issueMock = {
        id: "i-1",
        projectId: "p-1",
        status: "UNRESOLVED",
        project: { organizationId: "org-1" },
      };

      vi.mocked(db.issue.findMany).mockResolvedValueOnce([issueMock] as any);

      vi.mocked(db.membership.findFirst).mockResolvedValueOnce({
        role: "MEMBER",
        status: "ACTIVE",
      } as any);

      const req = new NextRequest("http://localhost/api/v1/issues/bulk", {
        method: "PATCH",
        body: JSON.stringify({
          issueIds: ["f47ac10b-58cc-4372-a567-0e02b2c3d479"],
          status: "RESOLVED",
        }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.success).toBe(true);
      expect(db.$transaction).toHaveBeenCalled();
    });
  });

  describe("DELETE /api/v1/issues/bulk", () => {
    it("should succeed and soft delete issues", async () => {
      const issueMock = {
        id: "i-1",
        projectId: "p-1",
        status: "UNRESOLVED",
        project: { organizationId: "org-1" },
      };

      vi.mocked(db.issue.findMany).mockResolvedValueOnce([issueMock] as any);

      vi.mocked(db.membership.findFirst).mockResolvedValueOnce({
        role: "ADMIN",
        status: "ACTIVE",
      } as any);

      const req = new NextRequest("http://localhost/api/v1/issues/bulk", {
        method: "DELETE",
        body: JSON.stringify({ issueIds: ["f47ac10b-58cc-4372-a567-0e02b2c3d479"] }),
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.success).toBe(true);
      expect(db.$transaction).toHaveBeenCalled();
    });
  });
});
