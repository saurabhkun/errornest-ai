/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database client
vi.mock("@/lib/db/client", () => {
  const mockDb = {
    $transaction: vi.fn(),
    event: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    environment: {
      findUnique: vi.fn(),
    },
    alertRule: {
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    alertOccurrence: {
      create: vi.fn(),
    },
    membership: {
      findMany: vi.fn(),
    },
    notificationPreference: {
      findUnique: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
  };
  return { db: mockDb };
});

import { db } from "@/lib/db/client";
import { CooldownManager } from "@/lib/services/alerts/CooldownManager";
import { SpikeDetector } from "@/lib/services/alerts/SpikeDetector";
import { RuleEvaluator } from "@/lib/services/alerts/RuleEvaluator";

describe("Alert Engine Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CooldownManager", () => {
    it("should say rule is not on cooldown if lastTriggeredAt is null", () => {
      const mockRule: any = {
        lastTriggeredAt: null,
        cooldownSeconds: 300,
      };
      expect(CooldownManager.isOnCooldown(mockRule)).toBe(false);
    });

    it("should say rule is on cooldown if elapsed time is less than cooldown", () => {
      const mockRule: any = {
        lastTriggeredAt: new Date(Date.now() - 100 * 1000), // 100 seconds ago
        cooldownSeconds: 300, // 300 seconds cooldown
      };
      expect(CooldownManager.isOnCooldown(mockRule)).toBe(true);
    });

    it("should say rule is not on cooldown if elapsed time exceeds cooldown", () => {
      const mockRule: any = {
        lastTriggeredAt: new Date(Date.now() - 400 * 1000), // 400 seconds ago
        cooldownSeconds: 300,
      };
      expect(CooldownManager.isOnCooldown(mockRule)).toBe(false);
    });

    it("should execute transaction to trigger rule and return occurrence", async () => {
      const mockRule: any = { id: "rule-1", cooldownSeconds: 300 };
      const mockOccurrence = { id: "occ-1", alertRuleId: "rule-1" };

      vi.mocked(db.$transaction).mockImplementationOnce(async (callback) => {
        const tx = {
          alertRule: { update: vi.fn() },
          alertOccurrence: { create: vi.fn().mockResolvedValueOnce(mockOccurrence) },
        };
        return await callback(tx as any);
      });

      const res = await CooldownManager.triggerRule(mockRule, "issue-1", new Date(), "key-1");
      expect(res).toEqual(mockOccurrence);
    });

    it("should handle unique constraint violation by returning null", async () => {
      const mockRule: any = { id: "rule-1", cooldownSeconds: 300 };

      vi.mocked(db.$transaction).mockImplementationOnce(async (callback) => {
        const tx = {
          alertRule: { update: vi.fn() },
          alertOccurrence: {
            create: vi.fn().mockRejectedValueOnce({
              code: "P2002",
              message: "Unique constraint failed",
            }),
          },
        };
        return await callback(tx as any);
      });

      const res = await CooldownManager.triggerRule(mockRule, "issue-1", new Date(), "key-1");
      expect(res).toBeNull();
    });
  });

  describe("SpikeDetector", () => {
    it("should return triggered true if count meets threshold", async () => {
      const mockRule: any = {
        projectId: "proj-1",
        thresholdCount: 5,
        thresholdWindowSeconds: 300,
        minimumLevel: null,
        environmentId: null,
      };

      vi.mocked(db.event.count).mockResolvedValueOnce(6);

      const res = await SpikeDetector.detectSpike(mockRule, "issue-1");
      expect(res.triggered).toBe(true);
      expect(res.eventCount).toBe(6);
    });

    it("should return triggered false if count is below threshold", async () => {
      const mockRule: any = {
        projectId: "proj-1",
        thresholdCount: 10,
        thresholdWindowSeconds: 300,
        minimumLevel: null,
        environmentId: null,
      };

      vi.mocked(db.event.count).mockResolvedValueOnce(3);

      const res = await SpikeDetector.detectSpike(mockRule, "issue-1");
      expect(res.triggered).toBe(false);
      expect(res.eventCount).toBe(3);
    });
  });

  describe("RuleEvaluator", () => {
    it("should skip evaluation if event has no issueId", async () => {
      const mockEvent = { id: "evt-1", projectId: "proj-1", issueId: null };
      vi.mocked(db.event.findUnique).mockResolvedValueOnce(mockEvent as any);

      await RuleEvaluator.evaluate("evt-1", { isNewIssue: true, isRegression: false });
      expect(db.alertRule.findMany).not.toHaveBeenCalled();
    });

    it("should query active alert rules and evaluate matching NEW_ISSUE rule", async () => {
      const mockEvent = {
        id: "evt-1",
        projectId: "proj-1",
        issueId: "issue-1",
        level: "ERROR",
        environmentId: "env-1",
        message: "something went wrong",
        createdAt: new Date(),
      };

      const mockRule = {
        id: "rule-1",
        projectId: "proj-1",
        name: "New Issue Rule",
        type: "NEW_ISSUE",
        isActive: true,
        environmentId: null,
        minimumLevel: null,
        cooldownSeconds: 300,
        lastTriggeredAt: null,
      };

      vi.mocked(db.event.findUnique).mockResolvedValueOnce(mockEvent as any);
      vi.mocked(db.environment.findUnique).mockResolvedValueOnce({
        id: "env-1",
        name: "production",
      } as any);
      vi.mocked(db.alertRule.findMany).mockResolvedValueOnce([mockRule] as any);

      // CooldownManager trigger mock
      vi.mocked(db.$transaction).mockImplementationOnce(async (callback) => {
        const tx = {
          alertRule: { update: vi.fn() },
          alertOccurrence: { create: vi.fn().mockResolvedValueOnce({ id: "occ-1" } as any) },
        };
        return await callback(tx as any);
      });

      // Mock member and preferences for dispatching
      vi.mocked(db.project.findUnique).mockResolvedValueOnce({
        id: "proj-1",
        name: "My Project",
        organization: { id: "org-1", slug: "my-org" },
      } as any);
      vi.mocked(db.membership.findMany).mockResolvedValueOnce([
        {
          userId: "usr-1",
          status: "ACTIVE",
          user: { id: "usr-1", displayName: "Saurabh", email: "saurabh@errornest.com" },
        },
      ] as any);
      vi.mocked(db.notificationPreference.findUnique).mockResolvedValueOnce({
        inAppEnabled: true,
        emailEnabled: false,
      } as any);

      await RuleEvaluator.evaluate("evt-1", { isNewIssue: true, isRegression: false });

      expect(db.notification.create).toHaveBeenCalledTimes(1);
      expect(db.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "usr-1",
            title: "New Issue in My Project",
          }),
        })
      );
    });
  });
});
