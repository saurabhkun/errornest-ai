import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { z } from "zod";
import { redactSensitiveData, truncateIfNeeded } from "@/lib/services/ai/redact";
import { buildInputFingerprint } from "@/lib/services/ai/fingerprint";
import { callGemini } from "@/lib/services/ai/gemini";

const HOURLY_RATE_LIMIT = 10;

const querySchema = z.object({
  force: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

async function checkRateLimit(userId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const count = await db.aiResult.count({
    where: {
      requestedByUserId: userId,
      createdAt: { gte: oneHourAgo },
    },
  });
  return count < HOURLY_RATE_LIMIT;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const { issueId } = await params;
    const user = await getSessionUser();

    // Fetch issue with latest event for stack trace context
    const issue = await db.issue.findFirst({
      where: { id: issueId, deletedAt: null },
      include: {
        project: { select: { organizationId: true } },
        events: {
          orderBy: { serverReceivedAt: "desc" },
          take: 1,
          select: { rawStackTrace: true, message: true },
        },
      },
    });

    if (!issue) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Issue not found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    // Authorization: Member or higher
    const membership = await db.membership.findFirst({
      where: {
        organizationId: issue.project.organizationId,
        userId: user.id,
        status: "ACTIVE",
        role: { in: ["OWNER", "ADMIN", "MEMBER"] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied", requestId } },
        { status: 403, headers: responseHeaders }
      );
    }

    const queryResult = querySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams)
    );
    const force = queryResult.success ? queryResult.data.force : false;

    // Build raw context
    const rawStackTrace = issue.events[0]?.rawStackTrace ?? "";
    const rawMessage = issue.events[0]?.message ?? issue.normalizedMessage;

    // Redact PII before sending to provider
    const redactedTrace = redactSensitiveData(rawStackTrace);
    const redactedMessage = redactSensitiveData(rawMessage);

    // Truncate stack trace if needed
    const { text: truncatedTrace, truncated } = truncateIfNeeded(redactedTrace.text, 8_000);

    // Build fingerprint for cache
    const fingerprint = buildInputFingerprint({
      issueId,
      type: "EXPLANATION",
      errorType: issue.errorType,
      normalizedMessage: issue.normalizedMessage,
      stackTrace: truncatedTrace,
    });

    // Check cache (skip on force=true)
    if (!force) {
      const cached = await db.aiResult.findFirst({
        where: { issueId, type: "EXPLANATION", inputFingerprint: fingerprint },
        orderBy: { createdAt: "desc" },
      });
      if (cached) {
        return NextResponse.json(
          {
            data: {
              id: cached.id,
              content: cached.content,
              model: cached.model,
              cached: true,
              truncated,
              type: "EXPLANATION",
            },
          },
          { headers: responseHeaders }
        );
      }
    }

    // Rate limit check (only for new generations)
    const withinLimit = await checkRateLimit(user.id);
    if (!withinLimit) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `AI generation limit reached (${HOURLY_RATE_LIMIT}/hour). Try again later.`,
            requestId,
          },
        },
        { status: 429, headers: { ...Object.fromEntries(responseHeaders), "Retry-After": "3600" } }
      );
    }

    // Call AI provider
    const aiResponse = await callGemini({
      type: "EXPLANATION",
      errorType: issue.errorType,
      message: redactedMessage.text,
      stackTrace: truncatedTrace,
      truncated,
    });

    if (!aiResponse.ok) {
      const statusCode = aiResponse.error.code === "RATE_LIMITED" ? 429 : 502;
      return NextResponse.json(
        { error: { code: aiResponse.error.code, message: aiResponse.error.message, requestId } },
        { status: statusCode, headers: responseHeaders }
      );
    }

    // Persist result
    const saved = await db.aiResult.upsert({
      where: {
        issueId_type_inputFingerprint: {
          issueId,
          type: "EXPLANATION",
          inputFingerprint: fingerprint,
        },
      },
      update: {
        content: aiResponse.data.content,
        model: aiResponse.data.model,
        requestedByUserId: user.id,
      },
      create: {
        issueId,
        type: "EXPLANATION",
        inputFingerprint: fingerprint,
        model: aiResponse.data.model,
        content: aiResponse.data.content,
        requestedByUserId: user.id,
      },
    });

    return NextResponse.json(
      {
        data: {
          id: saved.id,
          content: saved.content,
          model: saved.model,
          cached: false,
          truncated,
          type: "EXPLANATION",
        },
      },
      { status: 200, headers: responseHeaders }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message, requestId } },
      { status: 500, headers: responseHeaders }
    );
  }
}
