/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database client
vi.mock("@/lib/db/client", () => {
  const mockDb = {
    project: {
      findFirst: vi.fn(),
    },
    membership: {
      findFirst: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    issue: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    issueActivity: {
      count: vi.fn(),
    },
    analyticsHourly: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    release: {
      findMany: vi.fn(),
    },
  };
  return { db: mockDb };
});

// Mock getSessionUser
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn().mockResolvedValue({ id: "user-1", email: "owner@example.com" }),
}));

import { db } from "@/lib/db/client";
import { RollupManager } from "@/lib/services/analytics/RollupManager";
import { GET as getOverview } from "@/app/api/v1/analytics/overview/route";
import { GET as getTrends } from "@/app/api/v1/analytics/trends/route";
import { GET as getReleases } from "@/app/api/v1/analytics/releases/route";
import { GET as getIssues } from "@/app/api/v1/analytics/issues/route";
import { GET as getEnvironments } from "@/app/api/v1/analytics/environments/route";
import { NextRequest } from "next/server";

describe("Analytics Module Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("RollupManager", () => {
    it("should successfully record a new event with create when no bucket exists", async () => {
      const mockEvent = {
        id: "evt-1",
        projectId: "proj-1",
        environmentId: "env-1",
        releaseId: "rel-1",
        userExternalId: "user-123",
        createdAt: new Date("2026-07-15T12:34:56Z"),
      };

      vi.mocked(db.event.findUnique).mockResolvedValueOnce(mockEvent as any);
      vi.mocked(db.event.findFirst).mockResolvedValueOnce(null); // No previous user event in this hour
      vi.mocked(db.analyticsHourly.findFirst).mockResolvedValueOnce(null); // No existing bucket
      vi.mocked(db.analyticsHourly.create).mockResolvedValueOnce({ id: "bucket-1" } as any);

      await RollupManager.recordEvent("evt-1", { isNewIssue: true, isRegression: false });

      expect(db.analyticsHourly.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: "proj-1",
            environmentId: "env-1",
            releaseId: "rel-1",
            eventCount: 1,
            newIssueCount: 1,
            reopenedIssueCount: 0,
            affectedUserCount: 1,
          }),
        })
      );
    });

    it("should successfully update an existing bucket", async () => {
      const mockEvent = {
        id: "evt-2",
        projectId: "proj-1",
        environmentId: "env-1",
        releaseId: "rel-1",
        userExternalId: "user-123",
        createdAt: new Date("2026-07-15T12:34:56Z"),
      };

      vi.mocked(db.event.findUnique).mockResolvedValueOnce(mockEvent as any);
      vi.mocked(db.event.findFirst).mockResolvedValueOnce({ id: "some-other-evt" } as any); // User already seen this hour
      vi.mocked(db.analyticsHourly.findFirst).mockResolvedValueOnce({ id: "bucket-1" } as any);
      vi.mocked(db.analyticsHourly.update).mockResolvedValueOnce({ id: "bucket-1" } as any);

      await RollupManager.recordEvent("evt-2", { isNewIssue: false, isRegression: true });

      expect(db.analyticsHourly.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "bucket-1" },
          data: expect.objectContaining({
            eventCount: { increment: 1 },
            reopenedIssueCount: { increment: 1 },
          }),
        })
      );
    });
  });

  describe("API Endpoints", () => {
    const projId = "db0374e2-636c-4876-8051-12c8b74c4233";
    const requestUrl = `http://localhost/api/v1/analytics/overview?projectId=${projId}`;

    const setupAuthAndProjectMocks = () => {
      vi.mocked(db.project.findFirst).mockResolvedValueOnce({
        id: projId,
        organizationId: "org-1",
      } as any);
      vi.mocked(db.membership.findFirst).mockResolvedValueOnce({
        id: "membership-1",
        userId: "user-1",
        status: "ACTIVE",
      } as any);
    };

    it("GET /api/v1/analytics/overview should return aggregate counts", async () => {
      setupAuthAndProjectMocks();

      vi.mocked(db.analyticsHourly.aggregate).mockResolvedValueOnce({
        _sum: { eventCount: 150 },
      } as any);
      vi.mocked(db.event.groupBy).mockResolvedValueOnce([
        { issueId: "iss-1" },
        { issueId: "iss-2" },
      ] as any); // totalIssues
      vi.mocked(db.event.groupBy).mockResolvedValueOnce([{ userExternalId: "u-1" }] as any); // affectedUsers
      vi.mocked(db.issue.count).mockResolvedValueOnce(5); // newIssuesToday
      vi.mocked(db.issueActivity.count).mockResolvedValueOnce(2); // regressions

      const req = new NextRequest(requestUrl);
      const res = await getOverview(req);
      if (res.status !== 200) {
        console.log("Overview Error Response:", JSON.stringify(await res.json(), null, 2));
      }
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.totalEvents).toBe(150);
      expect(body.data.totalIssues).toBe(2);
      expect(body.data.affectedUsers).toBe(1);
      expect(body.data.newIssuesToday).toBe(5);
      expect(body.data.regressions).toBe(2);
      expect(body.data.errorRate).toBeDefined();
    });

    it("GET /api/v1/analytics/trends should return timeseries", async () => {
      setupAuthAndProjectMocks();

      vi.mocked(db.analyticsHourly.findMany).mockResolvedValueOnce([
        {
          bucketStart: new Date("2026-07-15T12:00:00Z"),
          eventCount: 15,
          newIssueCount: 2,
          affectedUserCount: 5,
        },
      ] as any);

      const req = new NextRequest(
        `http://localhost/api/v1/analytics/trends?projectId=${projId}&period=24h&from=2026-07-15T00:00:00Z&to=2026-07-15T23:59:59Z`
      );
      const res = await getTrends(req);
      if (res.status !== 200) {
        console.log("Trends Error Response:", JSON.stringify(await res.json(), null, 2));
      }
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toBeInstanceOf(Array);
      // Verify bucket filling logic works
      const targetBucket = body.data.find((t: any) => new Date(t.timestamp).getUTCHours() === 12);
      expect(targetBucket).toBeDefined();
      expect(targetBucket.eventCount).toBe(15);
    });

    it("GET /api/v1/analytics/releases should return release health stats", async () => {
      setupAuthAndProjectMocks();

      vi.mocked(db.release.findMany).mockResolvedValueOnce([
        {
          id: "rel-1",
          version: "v1.0.0",
          deployedAt: new Date(),
        },
      ] as any);

      vi.mocked(db.analyticsHourly.aggregate).mockResolvedValueOnce({
        _sum: {
          eventCount: 45,
          newIssueCount: 3,
          affectedUserCount: 12,
          reopenedIssueCount: 1,
        },
      } as any);

      const req = new NextRequest(`http://localhost/api/v1/analytics/releases?projectId=${projId}`);
      const res = await getReleases(req);
      if (res.status !== 200) {
        console.log("Releases Error Response:", JSON.stringify(await res.json(), null, 2));
      }
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data[0].version).toBe("v1.0.0");
      expect(body.data[0].eventCount).toBe(45);
      expect(body.data[0].newIssueCount).toBe(3);
    });

    it("GET /api/v1/analytics/issues should return top issues in period", async () => {
      setupAuthAndProjectMocks();

      vi.mocked(db.event.groupBy).mockResolvedValueOnce([
        {
          issueId: "iss-1",
          _count: { id: 85 },
        },
      ] as any);

      vi.mocked(db.issue.findMany).mockResolvedValueOnce([
        {
          id: "iss-1",
          title: "Error: Something exploded",
          errorType: "Error",
          status: "UNRESOLVED",
        },
      ] as any);

      const req = new NextRequest(`http://localhost/api/v1/analytics/issues?projectId=${projId}`);
      const res = await getIssues(req);
      if (res.status !== 200) {
        console.log("Issues Error Response:", JSON.stringify(await res.json(), null, 2));
      }
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data[0].id).toBe("iss-1");
      expect(body.data[0].periodEventCount).toBe(85);
    });

    it("GET /api/v1/analytics/environments should return multi-breakdowns", async () => {
      setupAuthAndProjectMocks();

      vi.mocked(db.event.findMany).mockResolvedValueOnce([
        {
          environment: { name: "production" },
          tags: { browser: "Chrome", os: "Windows" },
          userExternalId: "user-99",
          userContext: { email: "user99@gmail.com" },
        },
        {
          environment: { name: "production" },
          tags: { browser: "Firefox", os: "MacOS" },
          userExternalId: "user-99",
          userContext: { email: "user99@gmail.com" },
        },
      ] as any);

      const req = new NextRequest(
        `http://localhost/api/v1/analytics/environments?projectId=${projId}`
      );
      const res = await getEnvironments(req);
      if (res.status !== 200) {
        console.log("Environments Error Response:", JSON.stringify(await res.json(), null, 2));
      }
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.environments[0]).toEqual({ name: "production", count: 2 });
      expect(body.data.browsers).toContainEqual({ name: "Chrome", count: 1 });
      expect(body.data.browsers).toContainEqual({ name: "Firefox", count: 1 });
      expect(body.data.operatingSystems).toContainEqual({ name: "Windows", count: 1 });
      expect(body.data.operatingSystems).toContainEqual({ name: "MacOS", count: 1 });
      expect(body.data.users[0].id).toBe("user-99");
      expect(body.data.users[0].count).toBe(2);
    });
  });
});
