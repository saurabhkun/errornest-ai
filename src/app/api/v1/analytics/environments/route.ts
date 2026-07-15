import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { z } from "zod";

const environmentsQuerySchema = z.object({
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

    const parsed = environmentsQuerySchema.safeParse(queryObj);
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

    // Fetch events in period to build breakdowns
    const events = await db.event.findMany({
      where: {
        projectId,
        environmentId: environmentId || undefined,
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      select: {
        environment: { select: { name: true } },
        tags: true,
        userExternalId: true,
        userContext: true,
      },
    });

    interface EventTags {
      browser?: string;
      os?: string;
      device?: string;
    }

    interface UserContext {
      email?: string;
    }

    const envMap: Record<string, number> = {};
    const browserMap: Record<string, number> = {};
    const osMap: Record<string, number> = {};
    const deviceMap: Record<string, number> = {};
    const userMap: Record<string, { id: string; email?: string; count: number }> = {};

    for (const ev of events) {
      // 1. Environment
      const envName = ev.environment?.name || "unknown";
      envMap[envName] = (envMap[envName] || 0) + 1;

      // 2. Tags (browser, os, device)
      const tags = (ev.tags || {}) as EventTags;
      const browser = tags.browser || "Unknown Browser";
      browserMap[browser] = (browserMap[browser] || 0) + 1;

      const os = tags.os || "Unknown OS";
      osMap[os] = (osMap[os] || 0) + 1;

      const device =
        tags.device ||
        (os.toLowerCase().includes("win") ||
        os.toLowerCase().includes("mac") ||
        os.toLowerCase().includes("linux")
          ? "Desktop"
          : os.toLowerCase().includes("ios") || os.toLowerCase().includes("android")
            ? "Mobile"
            : "Unknown Device");
      deviceMap[device] = (deviceMap[device] || 0) + 1;

      // 3. User Impact
      if (ev.userExternalId) {
        const uCtx = (ev.userContext || {}) as UserContext;
        const uEmail = uCtx.email || undefined;
        if (!userMap[ev.userExternalId]) {
          userMap[ev.userExternalId] = {
            id: ev.userExternalId,
            email: uEmail,
            count: 0,
          };
        }
        userMap[ev.userExternalId].count += 1;
      }
    }

    // Helper to format and sort maps into lists
    const mapToList = (map: Record<string, number>) =>
      Object.entries(map)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    return NextResponse.json(
      {
        data: {
          environments: mapToList(envMap),
          browsers: mapToList(browserMap),
          operatingSystems: mapToList(osMap),
          devices: mapToList(deviceMap),
          users: Object.values(userMap).sort((a, b) => b.count - a.count),
        },
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
