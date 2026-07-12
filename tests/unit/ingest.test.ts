/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database client before importing POST handler
vi.mock("@/lib/db/client", () => {
  const mockDb = {
    apiKey: {
      findUnique: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    environment: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    release: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
  return { db: mockDb };
});

import { db } from "@/lib/db/client";
import { POST } from "@/app/api/v1/ingest/events/route";
import { NextRequest } from "next/server";
import { hashApiKey } from "@/lib/utils/keys";
import { resetRateLimits } from "@/lib/utils/rate-limit";

describe("Event Ingestion API Route Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
  });

  it("should fail authentication on missing authorization header", async () => {
    const req = new NextRequest("http://localhost/api/v1/ingest/events", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.message).toContain("Missing or invalid authorization header");
  });

  it("should fail authentication on invalid bearer token", async () => {
    const req = new NextRequest("http://localhost/api/v1/ingest/events", {
      method: "POST",
      headers: {
        Authorization: "Bearer en_live_badkey123456789",
      },
      body: JSON.stringify({}),
    });

    vi.mocked(db.apiKey.findUnique).mockResolvedValueOnce(null);

    const res = await POST(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.message).toContain("Invalid or revoked API key");
  });

  it("should fail validation on malformed payload", async () => {
    const rawKey = "en_live_testkey123456789";
    const hashed = hashApiKey(rawKey);

    const req = new NextRequest("http://localhost/api/v1/ingest/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rawKey}`,
      },
      body: JSON.stringify({
        level: "error",
      }),
    });

    vi.mocked(db.apiKey.findUnique).mockResolvedValueOnce({
      id: "key-1",
      keyHash: hashed,
      revokedAt: null,
      project: {
        id: "proj-1",
        deletedAt: null,
        status: "ACTIVE",
      },
    } as any);

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.fieldErrors.message).toBeDefined();
    expect(body.error.fieldErrors.errorType).toBeDefined();
  });

  it("should reject payloads exceeding size limit", async () => {
    const rawKey = "en_live_testkey123456789";
    const hashed = hashApiKey(rawKey);
    process.env.INGESTION_MAX_BYTES = "10";

    const req = new NextRequest("http://localhost/api/v1/ingest/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rawKey}`,
      },
      body: JSON.stringify({
        message: "This payload is definitely longer than ten bytes",
        errorType: "SizeLimitTest",
      }),
    });

    vi.mocked(db.apiKey.findUnique).mockResolvedValueOnce({
      id: "key-1",
      keyHash: hashed,
      revokedAt: null,
      project: {
        id: "proj-1",
        deletedAt: null,
        status: "ACTIVE",
      },
    } as any);

    const res = await POST(req);
    expect(res.status).toBe(413);

    const body = await res.json();
    expect(body.error.code).toBe("PAYLOAD_TOO_LARGE");

    delete process.env.INGESTION_MAX_BYTES;
  });

  it("should successfully ingest valid error payloads and return 202", async () => {
    const rawKey = "en_live_testkey123456789";
    const hashed = hashApiKey(rawKey);

    const payload = {
      message: "Database connection timeout",
      errorType: "TimeoutError",
      level: "error",
      environment: "production",
      release: "1.0.0",
      tags: { server: "node-1", db: "postgres" },
      user: { id: "user_42" },
      stackTrace: "Error: Database connection timeout\n    at query (db.js:15:3)",
    };

    const req = new NextRequest("http://localhost/api/v1/ingest/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rawKey}`,
      },
      body: JSON.stringify(payload),
    });

    vi.mocked(db.apiKey.findUnique).mockResolvedValueOnce({
      id: "key-1",
      keyHash: hashed,
      revokedAt: null,
      project: {
        id: "proj-1",
        deletedAt: null,
        status: "ACTIVE",
      },
    } as any);

    vi.mocked(db.environment.findUnique).mockResolvedValueOnce({
      id: "env-1",
      name: "production",
    } as any);
    vi.mocked(db.release.findUnique).mockResolvedValueOnce({
      id: "rel-1",
      version: "1.0.0",
    } as any);
    vi.mocked(db.event.create).mockResolvedValueOnce({ id: "evt-12345" } as any);

    const res = await POST(req);
    expect(res.status).toBe(202);

    const body = await res.json();
    expect(body.data.status).toBe("accepted");
    expect(body.data.eventId).toBe("evt-12345");

    expect(db.event.create).toHaveBeenCalledTimes(1);
    const createCallArgs = vi.mocked(db.event.create).mock.calls[0][0].data;
    expect(createCallArgs.message).toBe(payload.message);
    expect(createCallArgs.errorType).toBe(payload.errorType);
    expect(createCallArgs.level).toBe("ERROR");
    expect(createCallArgs.environmentId).toBe("env-1");
    expect(createCallArgs.releaseId).toBe("rel-1");
  });

  it("should support idempotency keys and return duplicate event ID", async () => {
    const rawKey = "en_live_testkey123456789";
    const hashed = hashApiKey(rawKey);
    const idempotencyKey = "idemp-test-key-123";

    const payload = {
      message: "Unique constraint error",
      errorType: "PrismaClientKnownRequestError",
      environment: "staging",
    };

    const req = new NextRequest("http://localhost/api/v1/ingest/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rawKey}`,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    vi.mocked(db.apiKey.findUnique).mockResolvedValueOnce({
      id: "key-1",
      keyHash: hashed,
      revokedAt: null,
      project: {
        id: "proj-1",
        deletedAt: null,
        status: "ACTIVE",
      },
    } as any);

    vi.mocked(db.event.findUnique).mockResolvedValueOnce({
      id: "existing-evt-99",
      projectId: "proj-1",
      idempotencyKey,
    } as any);

    const res = await POST(req);
    expect(res.status).toBe(202);

    const body = await res.json();
    expect(body.data.eventId).toBe("existing-evt-99");
    expect(body.data.status).toBe("accepted");

    expect(db.event.create).not.toHaveBeenCalled();
  });
});
