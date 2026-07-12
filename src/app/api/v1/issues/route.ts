import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { z } from "zod";
import { IssueStatus, EventLevel, Prisma } from "@prisma/client";

const getIssuesSchema = z.object({
  projectId: z.string().uuid(),
  q: z.string().optional(),
  status: z.nativeEnum(IssueStatus).optional(),
  level: z.nativeEnum(EventLevel).optional(),
  environment: z.string().optional(),
  release: z.string().optional(),
  assignee: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sort: z.enum(["lastSeenAt", "occurrenceCount", "firstSeenAt"]).default("lastSeenAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().min(1).max(100).default(25),
});

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const user = await getSessionUser();
    const { searchParams } = new URL(request.url);
    
    // Parse query params
    const queryObj: Record<string, unknown> = {};
    searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });

    const parsed = getIssuesSchema.safeParse(queryObj);
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

    const {
      projectId,
      q,
      status,
      level,
      environment,
      release,
      assignee,
      from,
      to,
      sort,
      direction,
      cursor,
      pageSize,
    } = parsed.data;

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

    // Verify user membership in project's organization
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

    // Build query conditions
    const where: Prisma.IssueWhereInput = {
      projectId,
      deletedAt: null,
    };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { errorType: { contains: q, mode: "insensitive" } },
        { normalizedMessage: { contains: q, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (level) {
      where.level = level;
    }

    if (environment) {
      where.events = {
        some: {
          OR: [
            { environmentId: environment },
            { environment: { name: environment } },
          ],
        },
      };
    }

    if (release) {
      where.events = {
        ...(where.events || {}),
        some: {
          ...(where.events?.some || {}),
          OR: [
            { releaseId: release },
            { release: { version: release } },
          ],
        },
      };
    }

    if (assignee) {
      if (assignee === "unassigned") {
        where.assigneeUserId = null;
      } else {
        where.assigneeUserId = assignee;
      }
    }

    if (from || to) {
      where.lastSeenAt = {};
      if (from) where.lastSeenAt.gte = new Date(from);
      if (to) where.lastSeenAt.lte = new Date(to);
    }

    // Fetch pageSize + 1 to check for next page
    const limit = pageSize + 1;

    const issues = await db.issue.findMany({
      where,
      orderBy: [
        { [sort]: direction },
        { id: direction },
      ],
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      include: {
        assignee: {
          select: {
            id: true,
            displayName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    const hasMore = issues.length > pageSize;
    const data = hasMore ? issues.slice(0, pageSize) : issues;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return NextResponse.json(
      {
        data,
        meta: {
          nextCursor,
          hasMore,
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
