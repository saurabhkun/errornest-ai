import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { z } from "zod";

const getEventsSchema = z.object({
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().min(1).max(100).default(25),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const { issueId } = await params;
    const user = await getSessionUser();

    // Fetch the issue
    const issue = await db.issue.findFirst({
      where: { id: issueId, deletedAt: null },
      include: {
        project: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!issue) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Issue not found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    // Verify user membership in project's organization
    const membership = await db.membership.findFirst({
      where: {
        organizationId: issue.project.organizationId,
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

    const { searchParams } = new URL(request.url);
    const queryObj = {
      cursor: searchParams.get("cursor") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
    };

    const parsed = getEventsSchema.safeParse(queryObj);
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

    const { cursor, pageSize } = parsed.data;
    const limit = pageSize + 1;

    const events = await db.event.findMany({
      where: { issueId },
      orderBy: [{ serverReceivedAt: "desc" }, { id: "desc" }],
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      include: {
        environment: {
          select: {
            id: true,
            name: true,
          },
        },
        release: {
          select: {
            id: true,
            version: true,
          },
        },
      },
    });

    const hasMore = events.length > pageSize;
    const data = hasMore ? events.slice(0, pageSize) : events;
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
