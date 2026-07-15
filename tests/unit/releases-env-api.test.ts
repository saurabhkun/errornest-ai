/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the database client
vi.mock("@/lib/db/client", () => {
  const mockDb = {
    project: {
      findFirst: vi.fn(),
    },
    membership: {
      findFirst: vi.fn(),
    },
    environment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    release: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    analyticsHourly: {
      aggregate: vi.fn(),
      findFirst: vi.fn(),
    },
    event: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    issue: {
      findMany: vi.fn(),
    },
  };
  return { db: mockDb };
});

// Mock getSessionUser
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn().mockResolvedValue({ id: "user-1", displayName: "Test User", email: "test@example.com" }),
}));

// Mock createAuditLog
vi.mock("@/lib/utils/audit", () => ({
  createAuditLog: vi.fn().mockResolvedValue({ id: "log-1" }),
}));

import { db } from "@/lib/db/client";
import { createAuditLog } from "@/lib/utils/audit";
import { GET as getEnvironments } from "@/app/api/v1/projects/[projectId]/environments/route";
import { PATCH as updateEnvironment, DELETE as deleteEnvironment } from "@/app/api/v1/environments/[environmentId]/route";
import { GET as getReleases, POST as createRelease } from "@/app/api/v1/projects/[projectId]/releases/route";
import { GET as getReleaseDetail, DELETE as deleteRelease } from "@/app/api/v1/projects/[projectId]/releases/[releaseId]/route";
import { GET as compareReleases } from "@/app/api/v1/projects/[projectId]/releases/[releaseId]/compare/route";

describe("Releases & Environments API Endpoints Unit Tests", () => {
  const projectId = "proj-123";
  const environmentId = "env-456";
  const releaseId = "rel-789";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupAuthAndProjectMocks = () => {
    vi.mocked(db.project.findFirst).mockResolvedValue({
      id: projectId,
      organizationId: "org-1",
    } as any);
    vi.mocked(db.membership.findFirst).mockResolvedValue({
      id: "membership-1",
      userId: "user-1",
      status: "ACTIVE",
      role: "ADMIN",
    } as any);
  };

  describe("Environments endpoints", () => {
    it("GET should list environments", async () => {
      setupAuthAndProjectMocks();
      vi.mocked(db.environment.findMany).mockResolvedValue([
        { id: "env-1", name: "production", isHidden: false },
      ] as any);

      const req = new NextRequest(`http://localhost/api/v1/projects/${projectId}/environments`);
      const res = await getEnvironments(req, { params: Promise.resolve({ projectId }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe("production");
    });

    it("PATCH should toggle isHidden and log audit event", async () => {
      vi.mocked(db.environment.findFirst).mockResolvedValue({
        id: environmentId,
        projectId,
        name: "staging",
        isHidden: false,
        project: { organizationId: "org-1" },
      } as any);

      vi.mocked(db.membership.findFirst).mockResolvedValue({
        id: "membership-1",
        userId: "user-1",
        status: "ACTIVE",
        role: "ADMIN",
      } as any);

      vi.mocked(db.environment.update).mockResolvedValue({
        id: environmentId,
        name: "staging",
        isHidden: true,
      } as any);

      const req = new NextRequest(`http://localhost/api/v1/environments/${environmentId}`, {
        method: "PATCH",
        body: JSON.stringify({ isHidden: true }),
      });
      const res = await updateEnvironment(req, { params: Promise.resolve({ environmentId }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.isHidden).toBe(true);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: "ENVIRONMENT_UPDATE",
          targetId: environmentId,
        })
      );
    });

    it("DELETE should delete environment and log audit event", async () => {
      vi.mocked(db.environment.findFirst).mockResolvedValue({
        id: environmentId,
        projectId,
        name: "staging",
        isHidden: false,
        project: { organizationId: "org-1" },
      } as any);

      vi.mocked(db.membership.findFirst).mockResolvedValue({
        id: "membership-1",
        userId: "user-1",
        status: "ACTIVE",
        role: "ADMIN",
      } as any);

      const req = new NextRequest(`http://localhost/api/v1/environments/${environmentId}`, {
        method: "DELETE",
      });
      const res = await deleteEnvironment(req, { params: Promise.resolve({ environmentId }) });

      expect(res.status).toBe(200);
      expect(db.environment.delete).toHaveBeenCalledWith({
        where: { id: environmentId },
      });
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: "ENVIRONMENT_DELETE",
          targetId: environmentId,
        })
      );
    });
  });

  describe("Releases endpoints", () => {
    it("GET should list releases", async () => {
      setupAuthAndProjectMocks();
      vi.mocked(db.release.findMany).mockResolvedValue([
        { id: "rel-1", version: "v1.0.0", commitSha: "abcdef" },
      ] as any);

      const req = new NextRequest(`http://localhost/api/v1/projects/${projectId}/releases`);
      const res = await getReleases(req, { params: Promise.resolve({ projectId }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].version).toBe("v1.0.0");
    });

    it("POST should create release and log audit event", async () => {
      setupAuthAndProjectMocks();
      vi.mocked(db.release.findFirst).mockResolvedValue(null); // release doesn't exist
      vi.mocked(db.release.create).mockResolvedValue({
        id: "rel-new",
        version: "v1.1.0",
        commitSha: "sha123",
      } as any);

      const req = new NextRequest(`http://localhost/api/v1/projects/${projectId}/releases`, {
        method: "POST",
        body: JSON.stringify({ version: "v1.1.0", commitSha: "sha123" }),
      });
      const res = await createRelease(req, { params: Promise.resolve({ projectId }) });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.version).toBe("v1.1.0");
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: "RELEASE_CREATE",
          targetId: "rel-new",
        })
      );
    });

    it("GET detail should aggregate metrics and retrieve issues", async () => {
      setupAuthAndProjectMocks();
      vi.mocked(db.release.findFirst).mockResolvedValue({
        id: releaseId,
        projectId,
        version: "v1.0.0",
      } as any);

      vi.mocked(db.analyticsHourly.aggregate).mockResolvedValue({
        _sum: { eventCount: 10, newIssueCount: 2, affectedUserCount: 4, reopenedIssueCount: 0 },
      } as any);

      vi.mocked(db.event.groupBy).mockResolvedValue([
        { issueId: "iss-1" },
      ] as any);

      vi.mocked(db.issue.findMany).mockResolvedValue([
        { id: "iss-1", title: "Test Issue", errorType: "Error", status: "UNRESOLVED", level: "error" },
      ] as any);

      const req = new NextRequest(`http://localhost/api/v1/projects/${projectId}/releases/${releaseId}`);
      const res = await getReleaseDetail(req, { params: Promise.resolve({ projectId, releaseId }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.release.version).toBe("v1.0.0");
      expect(body.data.metrics.eventCount).toBe(10);
      expect(body.data.issues).toHaveLength(1);
    });

    it("DELETE should remove release and log audit event", async () => {
      setupAuthAndProjectMocks();
      vi.mocked(db.release.findFirst).mockResolvedValue({
        id: releaseId,
        projectId,
        version: "v1.0.0",
      } as any);

      const req = new NextRequest(`http://localhost/api/v1/projects/${projectId}/releases/${releaseId}`, {
        method: "DELETE",
      });
      const res = await deleteRelease(req, { params: Promise.resolve({ projectId, releaseId }) });

      expect(res.status).toBe(200);
      expect(db.release.delete).toHaveBeenCalledWith({
        where: { id: releaseId },
      });
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: "RELEASE_DELETE",
          targetId: releaseId,
        })
      );
    });

    it("GET compare should retrieve metrics delta and new issues", async () => {
      setupAuthAndProjectMocks();
      vi.mocked(db.release.findFirst).mockImplementation(async (args: any) => {
        if (args.where.id === releaseId) {
          return { id: releaseId, projectId, version: "v1.1.0", createdAt: new Date() } as any;
        }
        return { id: "rel-prev", projectId, version: "v1.0.0", createdAt: new Date(Date.now() - 86400000) } as any;
      });

      vi.mocked(db.analyticsHourly.aggregate).mockImplementation(async (args: any) => {
        if (args.where.releaseId === releaseId) {
          return { _sum: { eventCount: 100, newIssueCount: 5, affectedUserCount: 20, reopenedIssueCount: 2 } } as any;
        }
        return { _sum: { eventCount: 50, newIssueCount: 2, affectedUserCount: 10, reopenedIssueCount: 0 } } as any;
      });

      // Mock new issues list
      vi.mocked(db.event.groupBy).mockResolvedValue([
        { issueId: "iss-new" },
      ] as any);

      vi.mocked(db.event.findMany).mockResolvedValue([] as any); // no occurrences of these issues in baseline

      vi.mocked(db.issue.findMany).mockResolvedValue([
        { id: "iss-new", title: "New Issue In Release", errorType: "TypeError", status: "UNRESOLVED", level: "error" },
      ] as any);

      const req = new NextRequest(`http://localhost/api/v1/projects/${projectId}/releases/${releaseId}/compare`);
      const res = await compareReleases(req, { params: Promise.resolve({ projectId, releaseId }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.currentRelease.version).toBe("v1.1.0");
      expect(body.data.metrics.deltas.eventCount).toBe(50); // 100 - 50
      expect(body.data.newIssues).toHaveLength(1);
    });
  });
});
