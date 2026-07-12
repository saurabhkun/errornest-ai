/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/client", () => {
  const mockDb = {
    issueComment: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    membership: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    commentMention: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    issueActivity: {
      create: vi.fn(),
    },
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
import { PATCH, DELETE } from "@/app/api/v1/comments/[commentId]/route";
import { NextRequest } from "next/server";

describe("Comments Update & Delete API Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH /api/v1/comments/[commentId]", () => {
    it("should fail if the comment does not exist", async () => {
      vi.mocked(db.issueComment.findFirst).mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost/api/v1/comments/c-1", {
        method: "PATCH",
        body: JSON.stringify({ body: "Updated comment text" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ commentId: "c-1" }) });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error.code).toBe("NOT_FOUND");
    });

    it("should fail if user is not in project's organization", async () => {
      vi.mocked(db.issueComment.findFirst).mockResolvedValueOnce({
        id: "c-1",
        authorUserId: "user-1",
        issueId: "i-1",
        body: "original body",
        issue: {
          project: {
            organizationId: "org-1",
          },
        },
      } as any);

      vi.mocked(db.membership.findFirst).mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost/api/v1/comments/c-1", {
        method: "PATCH",
        body: JSON.stringify({ body: "Updated comment text" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ commentId: "c-1" }) });
      expect(res.status).toBe(403);
    });

    it("should fail if user is a VIEWER", async () => {
      vi.mocked(db.issueComment.findFirst).mockResolvedValueOnce({
        id: "c-1",
        authorUserId: "user-1",
        issueId: "i-1",
        body: "original body",
        issue: {
          project: {
            organizationId: "org-1",
          },
        },
      } as any);

      vi.mocked(db.membership.findFirst).mockResolvedValueOnce({
        role: "VIEWER",
        status: "ACTIVE",
      } as any);

      const req = new NextRequest("http://localhost/api/v1/comments/c-1", {
        method: "PATCH",
        body: JSON.stringify({ body: "Updated comment text" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ commentId: "c-1" }) });
      expect(res.status).toBe(403);
    });

    it("should fail if user is not the comment author", async () => {
      vi.mocked(db.issueComment.findFirst).mockResolvedValueOnce({
        id: "c-1",
        authorUserId: "user-2", // different author
        issueId: "i-1",
        body: "original body",
        issue: {
          project: {
            organizationId: "org-1",
          },
        },
      } as any);

      vi.mocked(db.membership.findFirst).mockResolvedValueOnce({
        role: "MEMBER",
        status: "ACTIVE",
      } as any);

      const req = new NextRequest("http://localhost/api/v1/comments/c-1", {
        method: "PATCH",
        body: JSON.stringify({ body: "Updated comment text" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ commentId: "c-1" }) });
      expect(res.status).toBe(403);
    });

    it("should update comment if user is author", async () => {
      vi.mocked(db.issueComment.findFirst).mockResolvedValueOnce({
        id: "c-1",
        authorUserId: "user-1", // same author
        issueId: "i-1",
        body: "original body",
        issue: {
          project: {
            organizationId: "org-1",
          },
        },
      } as any);

      vi.mocked(db.membership.findFirst).mockResolvedValueOnce({
        role: "MEMBER",
        status: "ACTIVE",
      } as any);

      vi.mocked(db.issueComment.update).mockResolvedValueOnce({
        id: "c-1",
        body: "Updated comment text",
        author: {
          id: "user-1",
          displayName: "Demo User",
        },
      } as any);

      const req = new NextRequest("http://localhost/api/v1/comments/c-1", {
        method: "PATCH",
        body: JSON.stringify({ body: "Updated comment text" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ commentId: "c-1" }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.body).toBe("Updated comment text");
    });
  });

  describe("DELETE /api/v1/comments/[commentId]", () => {
    it("should allow deletion if user is the comment author", async () => {
      vi.mocked(db.issueComment.findFirst).mockResolvedValueOnce({
        id: "c-1",
        authorUserId: "user-1",
        issueId: "i-1",
        body: "original body",
        issue: {
          project: {
            organizationId: "org-1",
          },
        },
      } as any);

      vi.mocked(db.membership.findFirst).mockResolvedValueOnce({
        role: "MEMBER",
        status: "ACTIVE",
      } as any);

      const req = new NextRequest("http://localhost/api/v1/comments/c-1", {
        method: "DELETE",
      });

      const res = await DELETE(req, { params: Promise.resolve({ commentId: "c-1" }) });
      expect(res.status).toBe(200);
      expect(db.issueComment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "c-1" },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });

    it("should allow deletion if user is ADMIN in organization even if not author", async () => {
      vi.mocked(db.issueComment.findFirst).mockResolvedValueOnce({
        id: "c-1",
        authorUserId: "user-2", // different author
        issueId: "i-1",
        body: "original body",
        issue: {
          project: {
            organizationId: "org-1",
          },
        },
      } as any);

      vi.mocked(db.membership.findFirst).mockResolvedValueOnce({
        role: "ADMIN",
        status: "ACTIVE",
      } as any);

      const req = new NextRequest("http://localhost/api/v1/comments/c-1", {
        method: "DELETE",
      });

      const res = await DELETE(req, { params: Promise.resolve({ commentId: "c-1" }) });
      expect(res.status).toBe(200);
    });
  });
});
