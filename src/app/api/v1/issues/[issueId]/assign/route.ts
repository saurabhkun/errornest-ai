import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

const assignSchema = z.object({
  userId: z.string().uuid().nullable(),
});

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

    // Verify user membership in project's organization and check RBAC (Triage/assign permission)
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
        { error: { code: "FORBIDDEN", message: "Viewers cannot assign issues", requestId } },
        { status: 403, headers: responseHeaders }
      );
    }

    // Parse body
    const body = await request.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid assignee parameter",
            fieldErrors: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 400, headers: responseHeaders }
      );
    }

    const targetUserId = parsed.data.userId;

    if (targetUserId) {
      // Verify target user has membership in organization
      const targetMembership = await db.membership.findFirst({
        where: {
          organizationId: issue.project.organizationId,
          userId: targetUserId,
          status: "ACTIVE",
        },
      });

      if (!targetMembership) {
        return NextResponse.json(
          {
            error: {
              code: "BAD_REQUEST",
              message: "Target user is not an active member of this organization",
              requestId,
            },
          },
          { status: 400, headers: responseHeaders }
        );
      }
    }

    const beforeState = { assigneeUserId: issue.assigneeUserId };

    // Update issue assignee
    const updatedIssue = await db.issue.update({
      where: { id: issueId },
      data: {
        assigneeUserId: targetUserId,
      },
      include: {
        assignee: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    const afterState = { assigneeUserId: updatedIssue.assigneeUserId };

    // Create activity timeline entry
    await db.issueActivity.create({
      data: {
        issueId,
        actorUserId: user.id,
        type: "ASSIGNED",
        metadata: {
          assigneeId: targetUserId,
          assigneeName: updatedIssue.assignee?.displayName || null,
          actorName: user.displayName,
        },
      },
    });

    // Create Audit Log
    await createAuditLog({
      organizationId: issue.project.organizationId,
      actorUserId: user.id,
      actorName: user.displayName,
      actorEmail: user.email,
      actionType: "ISSUE_ASSIGN",
      targetType: "Issue",
      targetId: issueId,
      beforeState: beforeState as Record<string, unknown>,
      afterState: afterState as Record<string, unknown>,
      requestId,
    });

    return NextResponse.json({ data: updatedIssue }, { headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message, requestId } },
      { status: 500, headers: responseHeaders }
    );
  }
}
