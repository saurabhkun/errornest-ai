import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";
import { IssueStatus } from "@prisma/client";

const statusSchema = z.object({
  status: z.nativeEnum(IssueStatus),
});

const validTransitions: Record<IssueStatus, IssueStatus[]> = {
  UNRESOLVED: ["RESOLVED", "IGNORED"],
  RESOLVED: ["REOPENED"],
  REOPENED: ["RESOLVED", "IGNORED"],
  IGNORED: ["UNRESOLVED"],
};

export async function PATCH(
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

    // Verify user membership in project's organization and check RBAC (Triage permission)
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
        { error: { code: "FORBIDDEN", message: "Viewers cannot triage issues", requestId } },
        { status: 403, headers: responseHeaders }
      );
    }

    // Parse status from body
    const body = await request.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid status parameter",
            fieldErrors: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 400, headers: responseHeaders }
      );
    }

    const newStatus = parsed.data.status;
    const currentStatus = issue.status;

    // Check transition validity
    if (currentStatus !== newStatus) {
      const allowed = validTransitions[currentStatus] || [];
      if (!allowed.includes(newStatus)) {
        return NextResponse.json(
          {
            error: {
              code: "BAD_REQUEST",
              message: `Invalid status transition from ${currentStatus} to ${newStatus}`,
              requestId,
            },
          },
          { status: 400, headers: responseHeaders }
        );
      }
    }

    const beforeState = {
      status: currentStatus,
      resolvedAt: issue.resolvedAt,
      resolvedByUserId: issue.resolvedByUserId,
    };

    // Update issue data
    const updateData: {
      status: IssueStatus;
      resolvedAt: Date | null;
      resolvedByUserId: string | null;
    } = {
      status: newStatus,
      resolvedAt: issue.resolvedAt,
      resolvedByUserId: issue.resolvedByUserId,
    };

    if (newStatus === "RESOLVED") {
      updateData.resolvedAt = new Date();
      updateData.resolvedByUserId = user.id;
    } else if ((currentStatus as string) === "RESOLVED") {
      updateData.resolvedAt = null;
      updateData.resolvedByUserId = null;
    }

    const updatedIssue = await db.issue.update({
      where: { id: issueId },
      data: updateData,
    });

    const afterState = {
      status: updatedIssue.status,
      resolvedAt: updatedIssue.resolvedAt,
      resolvedByUserId: updatedIssue.resolvedByUserId,
    };

    // Create activity timeline entry
    await db.issueActivity.create({
      data: {
        issueId,
        actorUserId: user.id,
        type: newStatus,
        metadata: {
          previousStatus: currentStatus,
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
      actionType: `ISSUE_STATUS_${newStatus}`,
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
