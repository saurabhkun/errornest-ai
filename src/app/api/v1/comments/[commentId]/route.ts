import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

const updateCommentSchema = z.object({
  body: z.string().min(1),
  mentionedUserIds: z.array(z.string().uuid()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const { commentId } = await params;
    const user = await getSessionUser();

    // Fetch the comment, along with issue and project details
    const comment = await db.issueComment.findFirst({
      where: { id: commentId, deletedAt: null },
      include: {
        issue: {
          include: {
            project: {
              select: {
                organizationId: true,
              },
            },
          },
        },
      },
    });

    if (!comment) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Comment not found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    const orgId = comment.issue.project.organizationId;

    // Verify user membership in project's organization and check RBAC (Comment permission)
    const membership = await db.membership.findFirst({
      where: {
        organizationId: orgId,
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
        { error: { code: "FORBIDDEN", message: "Viewers cannot edit comments", requestId } },
        { status: 403, headers: responseHeaders }
      );
    }

    // Only the author can edit their comment
    if (comment.authorUserId !== user.id) {
      return NextResponse.json(
        {
          error: { code: "FORBIDDEN", message: "Only the author can edit this comment", requestId },
        },
        { status: 403, headers: responseHeaders }
      );
    }

    // Parse body
    const bodyJson = await request.json();
    const parsed = updateCommentSchema.safeParse(bodyJson);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid comment parameters",
            fieldErrors: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 400, headers: responseHeaders }
      );
    }

    const { body, mentionedUserIds } = parsed.data;

    // Validate that mentioned users belong to organization
    if (mentionedUserIds && mentionedUserIds.length > 0) {
      const activeMembers = await db.membership.findMany({
        where: {
          organizationId: orgId,
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

    // Update comment
    const updatedComment = await db.issueComment.update({
      where: { id: commentId },
      data: {
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

    // Update mentions
    await db.commentMention.deleteMany({
      where: { commentId },
    });

    if (mentionedUserIds && mentionedUserIds.length > 0) {
      await db.commentMention.createMany({
        data: mentionedUserIds.map((uid) => ({
          commentId,
          mentionedUserId: uid,
        })),
        skipDuplicates: true,
      });
    }

    // Log action to issue activity
    await db.issueActivity.create({
      data: {
        issueId: comment.issueId,
        actorUserId: user.id,
        type: "COMMENT_EDITED",
        metadata: {
          commentId,
          bodySnippet: body.length > 60 ? body.substring(0, 57) + "..." : body,
          actorName: user.displayName,
        },
      },
    });

    return NextResponse.json({ data: updatedComment }, { headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message, requestId } },
      { status: 500, headers: responseHeaders }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const { commentId } = await params;
    const user = await getSessionUser();

    // Fetch the comment, along with issue and project details
    const comment = await db.issueComment.findFirst({
      where: { id: commentId, deletedAt: null },
      include: {
        issue: {
          include: {
            project: {
              select: {
                organizationId: true,
              },
            },
          },
        },
      },
    });

    if (!comment) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Comment not found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    const orgId = comment.issue.project.organizationId;

    // Verify user membership in project's organization
    const membership = await db.membership.findFirst({
      where: {
        organizationId: orgId,
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
        { error: { code: "FORBIDDEN", message: "Viewers cannot delete comments", requestId } },
        { status: 403, headers: responseHeaders }
      );
    }

    // Comment author or Admin/Owner can delete
    const isAuthor = comment.authorUserId === user.id;
    const isAdminOrOwner = membership.role === "ADMIN" || membership.role === "OWNER";

    if (!isAuthor && !isAdminOrOwner) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to delete this comment",
            requestId,
          },
        },
        { status: 403, headers: responseHeaders }
      );
    }

    // Soft delete the comment
    await db.issueComment.update({
      where: { id: commentId },
      data: {
        deletedAt: new Date(),
      },
    });

    // Log action to issue activity
    await db.issueActivity.create({
      data: {
        issueId: comment.issueId,
        actorUserId: user.id,
        type: "COMMENT_DELETED",
        metadata: {
          commentId,
          actorName: user.displayName,
        },
      },
    });

    // Create Audit Log
    await createAuditLog({
      organizationId: orgId,
      actorUserId: user.id,
      actorName: user.displayName,
      actorEmail: user.email,
      actionType: "COMMENT_DELETE",
      targetType: "IssueComment",
      targetId: commentId,
      beforeState: { body: comment.body } as Record<string, unknown>,
      afterState: null,
      requestId,
    });

    return NextResponse.json({ data: { success: true } }, { headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message, requestId } },
      { status: 500, headers: responseHeaders }
    );
  }
}
