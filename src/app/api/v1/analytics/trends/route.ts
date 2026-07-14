import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { z } from "zod";

const trendsQuerySchema = z.object({
  projectId: z.string().uuid(),
  environmentId: z.string().uuid().optional(),
  period: z.enum(["24h", "7d", "30d"]).default("24h"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
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

    const parsed = trendsQuerySchema.safeParse(queryObj);
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

    const { projectId, environmentId, period, from, to } = parsed.data;

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

    // Fetch aggregates
    const rollups = await db.analyticsHourly.findMany({
      where: {
        projectId,
        environmentId: environmentId || undefined,
        bucketStart: {
          gte: fromDate,
          lte: toDate,
        },
      },
      orderBy: {
        bucketStart: "asc",
      },
    });

    // Determine interval: hourly for 24h, daily for 7d/30d
    const interval = period === "24h" ? "hour" : "day";
    const trends: { timestamp: string; eventCount: number; newIssueCount: number; affectedUserCount: number }[] = [];

    // Initialize buckets
    const start = new Date(fromDate);
    if (interval === "hour") {
      start.setUTCMinutes(0, 0, 0);
      while (start <= toDate) {
        trends.push({
          timestamp: start.toISOString(),
          eventCount: 0,
          newIssueCount: 0,
          affectedUserCount: 0,
        });
        start.setUTCHours(start.getUTCHours() + 1);
      }
    } else {
      start.setUTCHours(0, 0, 0, 0);
      while (start <= toDate) {
        trends.push({
          timestamp: start.toISOString(),
          eventCount: 0,
          newIssueCount: 0,
          affectedUserCount: 0,
        });
        start.setUTCDate(start.getUTCDate() + 1);
      }
    }

    // Map DB values to initialized buckets
    for (const r of rollups) {
      const rTime = new Date(r.bucketStart);
      if (interval === "day") {
        rTime.setUTCHours(0, 0, 0, 0);
      } else {
        rTime.setUTCMinutes(0, 0, 0);
      }
      const rIso = rTime.toISOString();

      const bucket = trends.find((t) => t.timestamp === rIso);
      if (bucket) {
        bucket.eventCount += r.eventCount;
        bucket.newIssueCount += r.newIssueCount;
        bucket.affectedUserCount += r.affectedUserCount;
      }
    }

    return NextResponse.json(
      {
        data: trends,
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
