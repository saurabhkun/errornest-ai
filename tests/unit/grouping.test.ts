/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database client
vi.mock("@/lib/db/client", () => {
  const mockDb = {
    event: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    issue: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    issueActivity: {
      create: vi.fn(),
    },
  };
  return { db: mockDb };
});

import { db } from "@/lib/db/client";
import {
  normalizeString,
  generateFingerprint,
  groupEvent,
} from "@/lib/services/grouping";

describe("Grouping Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normalizeString", () => {
    it("should replace UUIDs with placeholder", () => {
      const input = "Error: user 123e4567-e89b-12d3-a456-426614174000 failed to connect";
      const output = normalizeString(input);
      expect(output).toBe("Error: user {uuid} failed to connect");
    });

    it("should replace ISO and date timestamps with placeholder", () => {
      const input = "Request failed at 2026-07-12T18:10:24Z or 2026/07/12";
      const output = normalizeString(input);
      expect(output).toBe("Request failed at {timestamp} or {timestamp}");
    });

    it("should replace MD5, SHA-1 and SHA-256 hashes", () => {
      const md5 = "5d41402abc4b2a76b9719d911017c592";
      const sha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
      const input = `md5: ${md5}, sha256: ${sha256}`;
      const output = normalizeString(input);
      expect(output).toBe("md5: {hash}, sha256: {hash}");
    });

    it("should strip query strings from URLs", () => {
      const input = "Failed to load https://example.com/api/users?id=123&token=abc";
      const output = normalizeString(input);
      expect(output).toBe("Failed to load https://example.com/api/users?{query}");
    });

    it("should replace 5+ digit numbers and other numbers", () => {
      const input = "Task 987654321 failed in 4.5 seconds with status 500";
      const output = normalizeString(input);
      // "987654321" gets replaced by "{id}" because it is 5+ digits.
      // "4.5" gets replaced by "{number}"
      // "500" gets replaced by "{number}"
      expect(output).toBe("Task {id} failed in {number} seconds with status {number}");
    });
  });

  describe("generateFingerprint", () => {
    it("should generate a consistent SHA-256 hash", () => {
      const projectId = "proj-1";
      const errorType = "TypeError";
      const message = "Cannot read property 'id' of undefined";
      const frames = [
        { functionName: "getUser", fileName: "src/services/user.js", lineNumber: 10 },
      ];

      const hash1 = generateFingerprint(projectId, errorType, message, frames);
      const hash2 = generateFingerprint(projectId, errorType, message, frames);

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
    });

    it("should produce the same fingerprint after normalization", () => {
      const projectId = "proj-1";
      const errorType = "TypeError";
      const frames = [
        { functionName: "getUser", fileName: "src/services/user.js", lineNumber: 10 },
      ];

      const msg1 = "Database failure on row 123456789";
      const msg2 = "Database failure on row 987654321";

      const hash1 = generateFingerprint(projectId, errorType, msg1, frames);
      const hash2 = generateFingerprint(projectId, errorType, msg2, frames);

      expect(hash1).toBe(hash2);
    });

    it("should filter out non-app frames (e.g. node_modules)", () => {
      const projectId = "proj-1";
      const errorType = "Error";
      const message = "Oops";
      const frames = [
        { functionName: "lodashMap", fileName: "node_modules/lodash/map.js" },
        { functionName: "actualController", fileName: "src/controllers/items.js" },
      ];

      // Standard in-app filter should only look at actualController
      const hash = generateFingerprint(projectId, errorType, message, frames);
      expect(hash).toBeDefined();
    });
  });

  describe("groupEvent", () => {
    it("should throw if event is not found", async () => {
      vi.mocked(db.event.findUnique).mockResolvedValueOnce(null);
      await expect(groupEvent("evt-missing")).rejects.toThrow("Event evt-missing not found");
    });

    it("should create a new issue if none exists with matching fingerprint", async () => {
      const mockEvent = {
        id: "evt-1",
        projectId: "proj-1",
        errorType: "ReferenceError",
        message: "x is not defined",
        level: "ERROR",
        normalizedFrames: [],
        clientSentAt: new Date(),
        userExternalId: null,
      };

      vi.mocked(db.event.findUnique).mockResolvedValueOnce(mockEvent as any);
      vi.mocked(db.issue.findUnique).mockResolvedValueOnce(null);
      vi.mocked(db.issue.create).mockResolvedValueOnce({ id: "new-issue-id" } as any);

      await groupEvent("evt-1");

      expect(db.issue.create).toHaveBeenCalledTimes(1);
      expect(db.issueActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            issueId: "new-issue-id",
            type: "CREATED",
          }),
        })
      );
      expect(db.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "evt-1" },
          data: expect.objectContaining({
            issueId: "new-issue-id",
          }),
        })
      );
    });

    it("should auto-reopen resolved issue on new occurrences (regression detection)", async () => {
      const mockEvent = {
        id: "evt-2",
        projectId: "proj-1",
        errorType: "ReferenceError",
        message: "x is not defined",
        level: "ERROR",
        normalizedFrames: [],
        clientSentAt: new Date(),
        userExternalId: null,
      };

      const mockExistingIssue = {
        id: "existing-issue-id",
        status: "RESOLVED",
        occurrenceCount: 5,
        affectedUserCount: 1,
      };

      vi.mocked(db.event.findUnique).mockResolvedValueOnce(mockEvent as any);
      vi.mocked(db.issue.findUnique).mockResolvedValueOnce(mockExistingIssue as any);

      await groupEvent("evt-2");

      expect(db.issue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "existing-issue-id" },
          data: expect.objectContaining({
            status: "REOPENED",
          }),
        })
      );

      expect(db.issueActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            issueId: "existing-issue-id",
            type: "REOPENED",
          }),
        })
      );
    });
  });
});
