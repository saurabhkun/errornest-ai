import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";
import { IssueStatus, Prisma } from "@prisma/client";

const bulkPatchSchema = z.object({
  issueIds: z.array(z.string().uuid()).min(1),
  status: z.nativeEnum(IssueStatus).optional(),
  assigneeUserId: z.string().uuid().nullable().optional(),
});

const bulkDeleteSchema = z.object({
  issueIds: z.array(z.string().uuid()).min(1),
});

export async function PATCH(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const user = await getSessionUser();
    const bodyJson = await request.json();

    const parsed = bulkPatchSchema.safeParse(bodyJson);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid body parameters",
            fieldErrors: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 400, headers: responseHeaders }
      );
    }

    const { issueIds, status, assigneeUserId } = parsed.data;

    // Fetch issues to verify their existence and get organizationIds
    const issues = await db.issue.findMany({
      where: { id: { in: issueIds }, deletedAt: null },
      include: {
        project: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (issues.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No matching active issues found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    // Get unique organization IDs
    const orgIds = Array.from(new Set(issues.map((i) => i.project.organizationId)));

    // Verify user membership in each organization with sufficient permissions (non-viewer)
    for (const orgId of orgIds) {
      const membership = await db.membership.findFirst({
        where: {
          organizationId: orgId,
          userId: user.id,
          status: "ACTIVE",
        },
      });

      if (!membership) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Access denied to one or more organizations",
              requestId,
            },
          },
          { status: 403, headers: responseHeaders }
        );
      }

      if (membership.role === "VIEWER") {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Viewers cannot perform bulk triage actions",
              requestId,
            },
          },
          { status: 403, headers: responseHeaders }
        );
      }
    }

    // Construct update payload
    const updateData: Prisma.IssueUpdateInput = {};
    if (status !== undefined) {
      updateData.status = status;
      if (status === "RESOLVED") {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = { connect: { id: user.id } };
      } else {
        updateData.resolvedAt = null;
        updateData.resolvedBy = { disconnect: true };
      }
    }
    if (assigneeUserId !== undefined) {
      if (assigneeUserId === null) {
        updateData.assignee = { disconnect: true };
      } else {
        updateData.assignee = { connect: { id: assigneeUserId } };
      }
    }

    // Update issues in a transaction
    await db.$transaction(async (tx) => {
      // Perform updates
      await tx.issue.updateMany({
        where: { id: { in: issueIds }, deletedAt: null },
        data: {
          ...(status !== undefined
            ? {
                status,
                resolvedAt: status === "RESOLVED" ? new Date() : null,
                resolvedByUserId: status === "RESOLVED" ? user.id : null,
              }
            : {}),
          ...(assigneeUserId !== undefined
            ? {
                assigneeUserId,
              }
            : {}),
        },
      });

      // Create activity logs for each issue
      for (const issue of issues) {
        if (status !== undefined) {
          await tx.issueActivity.create({
            data: {
              issueId: issue.id,
              actorUserId: user.id,
              type: status,
              metadata: {
                previousStatus: issue.status,
                actorName: user.displayName,
                bulk: true,
              },
            },
          });
        }
        if (assigneeUserId !== undefined) {
          await tx.issueActivity.create({
            data: {
              issueId: issue.id,
              actorUserId: user.id,
              type: "ASSIGNED",
              metadata: {
                assigneeId: assigneeUserId,
                actorName: user.displayName,
                bulk: true,
              },
            },
          });
        }
      }
    });

    // Create Audit Logs
    for (const orgId of orgIds) {
      const orgIssues = issues.filter((i) => i.project.organizationId === orgId);
      await createAuditLog({
        organizationId: orgId,
        actorUserId: user.id,
        actorName: user.displayName,
        actorEmail: user.email,
        actionType: "BULK_ISSUE_UPDATE",
        targetType: "Project",
        targetId: orgIssues[0].projectId,
        beforeState: { count: orgIssues.length, issueIds: orgIssues.map((i) => i.id) },
        afterState: { status, assigneeUserId },
        requestId,
      });
    }

    return NextResponse.json(
      { data: { success: true, count: issues.length } },
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

export async function DELETE(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const user = await getSessionUser();
    const bodyJson = await request.json();

    const parsed = bulkDeleteSchema.safeParse(bodyJson);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid body parameters",
            fieldErrors: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 400, headers: responseHeaders }
      );
    }

    const { issueIds } = parsed.data;

    // Fetch issues to verify organization access
    const issues = await db.issue.findMany({
      where: { id: { in: issueIds }, deletedAt: null },
      include: {
        project: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (issues.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No active issues found to delete", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    const orgIds = Array.from(new Set(issues.map((i) => i.project.organizationId)));

    // Verify user membership (must not be VIEWER)
    for (const orgId of orgIds) {
      const membership = await db.membership.findFirst({
        where: {
          organizationId: orgId,
          userId: user.id,
          status: "ACTIVE",
        },
      });

      if (!membership) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Access denied to one or more organizations",
              requestId,
            },
          },
          { status: 403, headers: responseHeaders }
        );
      }

      if (membership.role === "VIEWER") {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Viewers cannot delete issues", requestId } },
          { status: 403, headers: responseHeaders }
        );
      }
    }

    // Perform soft deletion in transaction
    await db.$transaction(async (tx) => {
      await tx.issue.updateMany({
        where: { id: { in: issueIds } },
        data: {
          deletedAt: new Date(),
        },
      });

      for (const issue of issues) {
        await tx.issueActivity.create({
          data: {
            issueId: issue.id,
            actorUserId: user.id,
            type: "DELETED",
            metadata: {
              actorName: user.displayName,
            },
          },
        });
      }
    });

    // Create Audit Logs
    for (const orgId of orgIds) {
      const orgIssues = issues.filter((i) => i.project.organizationId === orgId);
      await createAuditLog({
        organizationId: orgId,
        actorUserId: user.id,
        actorName: user.displayName,
        actorEmail: user.email,
        actionType: "BULK_ISSUE_DELETE",
        targetType: "Project",
        targetId: orgIssues[0].projectId,
        beforeState: { count: orgIssues.length, issueIds: orgIssues.map((i) => i.id) },
        afterState: null,
        requestId,
      });
    }

    return NextResponse.json(
      { data: { success: true, count: issues.length } },
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
