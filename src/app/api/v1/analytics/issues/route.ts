import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { z } from "zod";

const issuesQuerySchema = z.object({
  projectId: z.string().uuid(),
  environmentId: z.string().uuid().optional(),
  period: z.enum(["24h", "7d", "30d"]).default("24h"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
});

function getDateRange(period: string, from?: string, to?: string) {
  const toDate = to ? new Date(to) : new Date();
  let fromDate: Date;

  if (from) {
    fromDate = new Date(from);
  } else {
    if (period === "24h") {
      fromDate = new Date(toDate.getTime() - 24 * 60 * 60 * 1000);
    } else if (period === "7d") {
      fromDate = new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
  return { fromDate, toDate };
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const user = await getSessionUser();
    const { searchParams } = new URL(request.url);

    const queryObj: Record<string, unknown> = {};
    searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });

    const parsed = issuesQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            fieldErrors: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 400, headers: responseHeaders }
      );
    }

    const { projectId, environmentId, period, from, to, limit } = parsed.data;

    // Verify project exists
    const project = await db.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Project not found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    // Verify user membership
    const membership = await db.membership.findFirst({
      where: {
        organizationId: project.organizationId,
        userId: user.id,
        status: "ACTIVE",
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied to project", requestId } },
        { status: 403, headers: responseHeaders }
      );
    }

    const { fromDate, toDate } = getDateRange(period, from, to);

    // Group events in period by issueId
    const topEvents = await db.event.groupBy({
      by: ["issueId"],
      where: {
        projectId,
        environmentId: environmentId || undefined,
        issueId: { not: null },
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: limit,
    });

    const issueIds = topEvents.map((t) => t.issueId as string);

    // Fetch matching issues
    const issues = await db.issue.findMany({
      where: {
        id: { in: issueIds },
      },
    });

    // Map back to preserve the top-count sorting order
    const data = topEvents
      .map((t) => {
        const issue = issues.find((i) => i.id === t.issueId);
        if (!issue) return null;
        return {
          ...issue,
          periodEventCount: t._count.id,
        };
      })
      .filter(Boolean);

    return NextResponse.json(
      {
        data,
      },
      { headers: responseHeaders }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message, requestId } },
      { status: 500, headers: responseHeaders }
    );
  }
}
