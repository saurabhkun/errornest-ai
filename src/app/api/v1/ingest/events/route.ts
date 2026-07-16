/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { hashApiKey } from "@/lib/utils/keys";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { enqueueEventProcessing } from "@/lib/queue/client";

// Timing safe comparison helper
function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf-8");
  const bBuf = Buffer.from(b, "utf-8");
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

// Map level string to EventLevel enum
const EventLevelSchema = z
  .enum(["FATAL", "ERROR", "WARNING", "INFO", "fatal", "error", "warning", "info"])
  .transform((val) => {
    const upper = val.toUpperCase();
    if (upper === "FATAL") return "FATAL";
    if (upper === "WARNING") return "WARNING";
    if (upper === "INFO") return "INFO";
    return "ERROR"; // Fallback to ERROR
  });

const ingestPayloadSchema = z.object({
  message: z.string().min(1, "Message is required"),
  errorType: z.string().min(1, "ErrorType is required"),
  level: EventLevelSchema.default("ERROR"),
  environment: z.string().min(1).default("production"),
  stackTrace: z.string().optional(),
  release: z.string().optional(),
  tags: z.record(z.string(), z.any()).optional().default({}),
  user: z
    .object({
      id: z.string().or(z.number()).transform(String).optional(),
      email: z.string().optional(),
      username: z.string().optional(),
    })
    .catchall(z.any())
    .optional(),
  clientSentAt: z.string().datetime({ precision: 3 }).or(z.string()).optional(),
  transaction: z.string().optional(),
  sourceContext: z.any().optional(),
});

// Simple parser for stack trace frames
function parseStackTraceFrames(stack?: string): Array<Record<string, any>> {
  if (!stack) return [];
  const frames: Array<Record<string, any>> = [];
  const lines = stack.split("\n");
  for (const line of lines) {
    const match =
      line.match(/^\s*at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/) ||
      line.match(/^\s*at\s+(.+?):(\d+):(\d+)/);
    if (match) {
      if (match.length === 5) {
        frames.push({
          method: match[1],
          file: match[2],
          line: parseInt(match[3], 10),
          column: parseInt(match[4], 10),
        });
      } else {
        frames.push({
          file: match[1],
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
        });
      }
    }
  }
  return frames;
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers({
    "X-Request-Id": requestId,
  });

  try {
    // 1. Authenticate API Key
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Missing or invalid authorization header",
            requestId,
          },
        },
        { status: 401, headers: responseHeaders }
      );
    }

    const rawKey = authHeader.substring(7).trim();
    if (!rawKey) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "API key is empty", requestId } },
        { status: 401, headers: responseHeaders }
      );
    }

    const hashedKey = hashApiKey(rawKey);

    // Timing-safe search/match flow
    const apiKeyRecord = await db.apiKey.findUnique({
      where: { keyHash: hashedKey },
      include: { project: true },
    });

    if (!apiKeyRecord || apiKeyRecord.revokedAt || !safeCompare(apiKeyRecord.keyHash, hashedKey)) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid or revoked API key", requestId } },
        { status: 401, headers: responseHeaders }
      );
    }

    const project = apiKeyRecord.project;
    if (project.deletedAt || project.status === "ARCHIVED") {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Cannot ingest events into a deleted or archived project",
            requestId,
          },
        },
        { status: 403, headers: responseHeaders }
      );
    }

    // 2. Enforce Ingestion Payload Size Limits
    const maxBytes = process.env.INGESTION_MAX_BYTES
      ? parseInt(process.env.INGESTION_MAX_BYTES, 10)
      : 200 * 1024; // default 200KB

    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxBytes) {
      return NextResponse.json(
        {
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: `Payload exceeds maximum limit of ${maxBytes} bytes`,
            requestId,
          },
        },
        { status: 413, headers: responseHeaders }
      );
    }

    const bodyText = await request.text();
    if (Buffer.byteLength(bodyText, "utf-8") > maxBytes) {
      return NextResponse.json(
        {
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: `Payload exceeds maximum limit of ${maxBytes} bytes`,
            requestId,
          },
        },
        { status: 413, headers: responseHeaders }
      );
    }

    // 3. Project Rate Limiting
    const rateLimit = 150; // allow 150 events per minute
    const { limited, retryAfter } = await checkRateLimit(hashedKey, rateLimit, 60000);
    if (limited) {
      const ratelimitHeaders = new Headers(responseHeaders);
      ratelimitHeaders.set("Retry-After", String(retryAfter));
      return NextResponse.json(
        {
          error: {
            code: "TOO_MANY_REQUESTS",
            message: "Rate limit exceeded. Please try again later.",
            requestId,
          },
        },
        { status: 429, headers: ratelimitHeaders }
      );
    }

    // Parse JSON
    let body: any;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Malformed JSON body", requestId } },
        { status: 400, headers: responseHeaders }
      );
    }

    // 4. Validate Payload with Zod
    const validationResult = ingestPayloadSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Payload validation failed",
            fieldErrors: validationResult.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 400, headers: responseHeaders }
      );
    }

    const payload = validationResult.data;

    // 5. Idempotency Check
    const idempotencyKey = request.headers.get("idempotency-key");
    if (idempotencyKey) {
      const existingEvent = await db.event.findUnique({
        where: {
          projectId_idempotencyKey: {
            projectId: project.id,
            idempotencyKey,
          },
        },
      });

      if (existingEvent) {
        return NextResponse.json(
          {
            data: {
              eventId: existingEvent.id,
              status: "accepted",
            },
          },
          { status: 202, headers: responseHeaders }
        );
      }
    }

    // 6. Find or Create Environment
    const envName = payload.environment.toLowerCase();
    let env = await db.environment.findUnique({
      where: {
        projectId_name: {
          projectId: project.id,
          name: envName,
        },
      },
    });

    if (!env) {
      env = await db.environment.create({
        data: {
          projectId: project.id,
          name: envName,
        },
      });
    }

    // 7. Find or Create Release (if release version provided)
    let releaseId: string | null = null;
    if (payload.release) {
      let rel = await db.release.findUnique({
        where: {
          projectId_version: {
            projectId: project.id,
            version: payload.release,
          },
        },
      });

      if (!rel) {
        rel = await db.release.create({
          data: {
            projectId: project.id,
            version: payload.release,
          },
        });
      }
      releaseId = rel.id;
    }

    // Truncate fields if they exceed local limits to avoid database crashes
    let stackTrace = payload.stackTrace;
    let payloadTruncated = false;
    if (stackTrace && stackTrace.length > 50000) {
      stackTrace = stackTrace.substring(0, 50000) + "\n... [Truncated]";
      payloadTruncated = true;
    }

    const normalizedFrames = parseStackTraceFrames(stackTrace);

    // Save Raw Event to Database
    const event = await db.event.create({
      data: {
        projectId: project.id,
        environmentId: env.id,
        releaseId,
        idempotencyKey,
        message: payload.message,
        errorType: payload.errorType,
        level: payload.level,
        rawStackTrace: stackTrace,
        normalizedFrames: normalizedFrames as any,
        userExternalId: payload.user?.id || null,
        userContext: (payload.user || null) as any,
        tags: (payload.tags || null) as any,
        rawPayload: (body || null) as any,
        payloadTruncated,
        clientSentAt: payload.clientSentAt ? new Date(payload.clientSentAt) : null,
      },
    });

    // Enqueue asynchronously to avoid blocking the client response
    await enqueueEventProcessing(event.id);

    return NextResponse.json(
      {
        data: {
          eventId: event.id,
          status: "accepted",
        },
      },
      { status: 202, headers: responseHeaders }
    );
  } catch (error) {
    console.error("Ingestion server error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message, requestId } },
      { status: 500, headers: responseHeaders }
    );
  }
}
