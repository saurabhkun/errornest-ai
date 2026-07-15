import { describe, it, expect, vi, beforeEach } from "vitest";
import { redactSensitiveData, truncateIfNeeded } from "@/lib/services/ai/redact";
import { buildInputFingerprint } from "@/lib/services/ai/fingerprint";
import { AiResult, AiFeedback, Issue, Membership } from "@prisma/client";

// ---------------------------------------------------------------------------
// DB mock
// ---------------------------------------------------------------------------
vi.mock("@/lib/db/client", () => {
  const mockDb = {
    issue: { findFirst: vi.fn() },
    membership: { findFirst: vi.fn() },
    aiResult: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  };
  return { db: mockDb };
});

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn().mockResolvedValue({ id: "user-1", email: "dev@example.com", displayName: "Dev" }),
}));

// Mock Gemini provider
vi.mock("@/lib/services/ai/gemini", () => ({
  callGemini: vi.fn(),
}));

import { db } from "@/lib/db/client";
import { callGemini } from "@/lib/services/ai/gemini";
import { POST as postExplain } from "@/app/api/v1/issues/[issueId]/ai/explain/route";
import { POST as postFix } from "@/app/api/v1/issues/[issueId]/ai/suggest-fix/route";
import { POST as postFeedback } from "@/app/api/v1/ai-results/[resultId]/feedback/route";
import { NextRequest } from "next/server";

const MOCK_ISSUE = {
  id: "issue-1",
  errorType: "TypeError",
  normalizedMessage: "Cannot read properties of null",
  project: { organizationId: "org-1" },
  events: [
    {
      rawStackTrace: "TypeError: Cannot read properties of null\n  at foo (app.js:10:3)",
      message: "Cannot read properties of null",
    },
  ],
};

const MOCK_MEMBERSHIP = { id: "mem-1", role: "MEMBER" };

describe("AI Service Unit Tests", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── Redaction utility ───────────────────────────────────────────────────
  describe("redactSensitiveData", () => {
    it("redacts email addresses", () => {
      const { text, redacted } = redactSensitiveData("Error for user@example.com in production");
      expect(text).not.toContain("user@example.com");
      expect(text).toContain("[REDACTED_EMAIL]");
      expect(redacted).toBe(true);
    });

    it("redacts JWT tokens", () => {
      const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      const { text } = redactSensitiveData(`Authorization: ${jwt}`);
      expect(text).not.toContain(jwt);
      expect(text).toContain("[REDACTED_JWT]");
    });

    it("redacts password=value patterns", () => {
      const { text } = redactSensitiveData("password=super_secret_123");
      expect(text).not.toContain("super_secret_123");
    });

    it("leaves normal text untouched", () => {
      const { text, redacted } = redactSensitiveData("TypeError: null is not an object at line 42");
      expect(redacted).toBe(false);
      expect(text).toBe("TypeError: null is not an object at line 42");
    });
  });

  // ─── Truncation utility ──────────────────────────────────────────────────
  describe("truncateIfNeeded", () => {
    it("does not truncate short text", () => {
      const { text, truncated } = truncateIfNeeded("short", 100);
      expect(truncated).toBe(false);
      expect(text).toBe("short");
    });

    it("truncates long text at max chars", () => {
      const long = "x".repeat(8001);
      const { text, truncated } = truncateIfNeeded(long, 8000);
      expect(truncated).toBe(true);
      expect(text).toHaveLength(8000 + "\n... [TRUNCATED — payload exceeded context limit]".length);
    });
  });

  // ─── Fingerprint utility ─────────────────────────────────────────────────
  describe("buildInputFingerprint", () => {
    it("produces deterministic 64-char hex strings", () => {
      const fp = buildInputFingerprint({
        issueId: "issue-1",
        type: "EXPLANATION",
        errorType: "TypeError",
        normalizedMessage: "msg",
        stackTrace: "trace",
      });
      expect(fp).toHaveLength(64);
      // Same input → same fingerprint
      const fp2 = buildInputFingerprint({
        issueId: "issue-1",
        type: "EXPLANATION",
        errorType: "TypeError",
        normalizedMessage: "msg",
        stackTrace: "trace",
      });
      expect(fp).toBe(fp2);
    });

    it("produces different fingerprints for different types", () => {
      const base = { issueId: "i", errorType: "E", normalizedMessage: "m", stackTrace: "s" };
      const fp1 = buildInputFingerprint({ ...base, type: "EXPLANATION" });
      const fp2 = buildInputFingerprint({ ...base, type: "FIX_SUGGESTION" });
      expect(fp1).not.toBe(fp2);
    });
  });

  // ─── AI Explain API ──────────────────────────────────────────────────────
  describe("POST /issues/:issueId/ai/explain", () => {
    it("returns cached result when fingerprint matches", async () => {
      vi.mocked(db.issue.findFirst).mockResolvedValue(MOCK_ISSUE as unknown as Issue);
      vi.mocked(db.membership.findFirst).mockResolvedValue(MOCK_MEMBERSHIP as unknown as Membership);
      vi.mocked(db.aiResult.findFirst).mockResolvedValue({
        id: "result-1",
        content: "Cached explanation",
        model: "gemini-flash",
        type: "EXPLANATION",
      } as unknown as AiResult);

      const req = new NextRequest("http://localhost/api/v1/issues/issue-1/ai/explain", { method: "POST" });
      const res = await postExplain(req, { params: Promise.resolve({ issueId: "issue-1" }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.cached).toBe(true);
      expect(json.data.content).toBe("Cached explanation");
      expect(callGemini).not.toHaveBeenCalled();
    });

    it("calls Gemini when no cache exists", async () => {
      vi.mocked(db.issue.findFirst).mockResolvedValue(MOCK_ISSUE as unknown as Issue);
      vi.mocked(db.membership.findFirst).mockResolvedValue(MOCK_MEMBERSHIP as unknown as Membership);
      vi.mocked(db.aiResult.findFirst).mockResolvedValue(null);
      vi.mocked(db.aiResult.count).mockResolvedValue(0);
      vi.mocked(callGemini).mockResolvedValue({ ok: true, data: { content: "Fresh explanation", model: "gemini-flash" } });
      vi.mocked(db.aiResult.upsert).mockResolvedValue({ id: "r-1", content: "Fresh explanation", model: "gemini-flash" } as unknown as AiResult);

      const req = new NextRequest("http://localhost/api/v1/issues/issue-1/ai/explain", { method: "POST" });
      const res = await postExplain(req, { params: Promise.resolve({ issueId: "issue-1" }) });

      expect(res.status).toBe(200);
      expect(callGemini).toHaveBeenCalledOnce();
    });

    it("returns 429 when rate limit is exceeded", async () => {
      vi.mocked(db.issue.findFirst).mockResolvedValue(MOCK_ISSUE as unknown as Issue);
      vi.mocked(db.membership.findFirst).mockResolvedValue(MOCK_MEMBERSHIP as unknown as Membership);
      vi.mocked(db.aiResult.findFirst).mockResolvedValue(null);
      vi.mocked(db.aiResult.count).mockResolvedValue(10); // at limit

      const req = new NextRequest("http://localhost/api/v1/issues/issue-1/ai/explain", { method: "POST" });
      const res = await postExplain(req, { params: Promise.resolve({ issueId: "issue-1" }) });

      expect(res.status).toBe(429);
    });

    it("returns 502 when Gemini is unavailable", async () => {
      vi.mocked(db.issue.findFirst).mockResolvedValue(MOCK_ISSUE as unknown as Issue);
      vi.mocked(db.membership.findFirst).mockResolvedValue(MOCK_MEMBERSHIP as unknown as Membership);
      vi.mocked(db.aiResult.findFirst).mockResolvedValue(null);
      vi.mocked(db.aiResult.count).mockResolvedValue(0);
      vi.mocked(callGemini).mockResolvedValue({ ok: false, error: { code: "PROVIDER_UNAVAILABLE", message: "Service down" } });

      const req = new NextRequest("http://localhost/api/v1/issues/issue-1/ai/explain", { method: "POST" });
      const res = await postExplain(req, { params: Promise.resolve({ issueId: "issue-1" }) });

      expect(res.status).toBe(502);
    });

    it("returns 403 when user is a Viewer", async () => {
      vi.mocked(db.issue.findFirst).mockResolvedValue(MOCK_ISSUE as unknown as Issue);
      vi.mocked(db.membership.findFirst).mockResolvedValue(null); // no matching Member+ role

      const req = new NextRequest("http://localhost/api/v1/issues/issue-1/ai/explain", { method: "POST" });
      const res = await postExplain(req, { params: Promise.resolve({ issueId: "issue-1" }) });

      expect(res.status).toBe(403);
    });

    it("returns 404 for unknown issue", async () => {
      vi.mocked(db.issue.findFirst).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/v1/issues/bad-id/ai/explain", { method: "POST" });
      const res = await postExplain(req, { params: Promise.resolve({ issueId: "bad-id" }) });

      expect(res.status).toBe(404);
    });
  });

  // ─── AI Suggest-Fix API ──────────────────────────────────────────────────
  describe("POST /issues/:issueId/ai/suggest-fix", () => {
    it("returns 200 with fresh fix suggestion", async () => {
      vi.mocked(db.issue.findFirst).mockResolvedValue(MOCK_ISSUE as unknown as Issue);
      vi.mocked(db.membership.findFirst).mockResolvedValue(MOCK_MEMBERSHIP as unknown as Membership);
      vi.mocked(db.aiResult.findFirst).mockResolvedValue(null);
      vi.mocked(db.aiResult.count).mockResolvedValue(0);
      vi.mocked(callGemini).mockResolvedValue({ ok: true, data: { content: "## Fix\n```js\nfix()\n```", model: "gemini-flash" } });
      vi.mocked(db.aiResult.upsert).mockResolvedValue({ id: "r-2", content: "## Fix\n```js\nfix()\n```", model: "gemini-flash" } as unknown as AiResult);

      const req = new NextRequest("http://localhost/api/v1/issues/issue-1/ai/suggest-fix", { method: "POST" });
      const res = await postFix(req, { params: Promise.resolve({ issueId: "issue-1" }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.type).toBe("FIX_SUGGESTION");
    });
  });

  // ─── AI Feedback API ─────────────────────────────────────────────────────
  describe("POST /ai-results/:resultId/feedback", () => {
    it("records HELPFUL feedback", async () => {
      vi.mocked(db.aiResult.findUnique).mockResolvedValue({
        id: "r-1",
        issue: { project: { organizationId: "org-1" } },
      } as unknown as AiResult & { issue: { project: { organizationId: string } } });
      vi.mocked(db.membership.findFirst).mockResolvedValue(MOCK_MEMBERSHIP as unknown as Membership);
      vi.mocked(db.aiResult.update).mockResolvedValue({ id: "r-1", feedback: "HELPFUL" } as unknown as AiResult);

      const req = new NextRequest("http://localhost/api/v1/ai-results/r-1/feedback", {
        method: "POST",
        body: JSON.stringify({ feedback: "HELPFUL" }),
      });
      const res = await postFeedback(req, { params: Promise.resolve({ resultId: "r-1" }) });

      expect(res.status).toBe(200);
      expect(db.aiResult.update).toHaveBeenCalledWith({
        where: { id: "r-1" },
        data: { feedback: AiFeedback.HELPFUL },
        select: { id: true, feedback: true },
      });
    });

    it("returns 400 for invalid feedback value", async () => {
      vi.mocked(db.aiResult.findUnique).mockResolvedValue({
        id: "r-1",
        issue: { project: { organizationId: "org-1" } },
      } as unknown as AiResult & { issue: { project: { organizationId: string } } });
      vi.mocked(db.membership.findFirst).mockResolvedValue(MOCK_MEMBERSHIP as unknown as Membership);

      const req = new NextRequest("http://localhost/api/v1/ai-results/r-1/feedback", {
        method: "POST",
        body: JSON.stringify({ feedback: "MAYBE" }),
      });
      const res = await postFeedback(req, { params: Promise.resolve({ resultId: "r-1" }) });

      expect(res.status).toBe(400);
    });

    it("returns 404 for unknown AI result", async () => {
      vi.mocked(db.aiResult.findUnique).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/v1/ai-results/bad-id/feedback", {
        method: "POST",
        body: JSON.stringify({ feedback: "HELPFUL" }),
      });
      const res = await postFeedback(req, { params: Promise.resolve({ resultId: "bad-id" }) });

      expect(res.status).toBe(404);
    });
  });
});
