import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { z } from "zod";

const createCommentSchema = z.object({
  body: z.string().min(1),
  mentionedUserIds: z.array(z.string().uuid()).optional(),
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

    const comments = await db.issueComment.findMany({
      where: { issueId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ data: comments }, { headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message, requestId } },
      { status: 500, headers: responseHeaders }
    );
  }
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

    // Verify user membership in project's organization and check RBAC (Comment permission)
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

    if (membership.role === "VIEWER") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Viewers cannot comment on issues", requestId } },
        { status: 403, headers: responseHeaders }
      );
    }

    // Parse body
    const bodyJson = await request.json();
    const parsed = createCommentSchema.safeParse(bodyJson);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid comment body",
            fieldErrors: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 400, headers: responseHeaders }
      );
    }

    const { body, mentionedUserIds } = parsed.data;

    // Validate mentioned users belong to organization
    if (mentionedUserIds && mentionedUserIds.length > 0) {
      const activeMembers = await db.membership.findMany({
        where: {
          organizationId: issue.project.organizationId,
          userId: { in: mentionedUserIds },
          status: "ACTIVE",
        },
      });

      if (activeMembers.length !== mentionedUserIds.length) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "One or more mentioned users are not active members of this organization",
              requestId,
            },
          },
          { status: 400, headers: responseHeaders }
        );
      }
    }

    // Create comment
    const comment = await db.issueComment.create({
      data: {
        issueId,
        authorUserId: user.id,
        body,
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Create mentions if any
    if (mentionedUserIds && mentionedUserIds.length > 0) {
      await db.commentMention.createMany({
        data: mentionedUserIds.map((uid) => ({
          commentId: comment.id,
          mentionedUserId: uid,
        })),
        skipDuplicates: true,
      });
    }

    // Create activity timeline entry
    await db.issueActivity.create({
      data: {
        issueId,
        actorUserId: user.id,
        type: "COMMENTED",
        metadata: {
          commentId: comment.id,
          bodySnippet: body.length > 60 ? body.substring(0, 57) + "..." : body,
          actorName: user.displayName,
        },
      },
    });

    return NextResponse.json({ data: comment }, { headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message, requestId } },
      { status: 500, headers: responseHeaders }
    );
  }
}
