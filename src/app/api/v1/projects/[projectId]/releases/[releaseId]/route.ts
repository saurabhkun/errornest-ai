import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/utils/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; releaseId: string }> }
) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const { projectId, releaseId } = await params;
    const user = await getSessionUser();

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

    // Fetch release
    const release = await db.release.findFirst({
      where: { id: releaseId, projectId },
    });

    if (!release) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Release not found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    // Aggregate analytics using AnalyticsHourly
    const stats = await db.analyticsHourly.aggregate({
      where: {
        projectId,
        releaseId,
      },
      _sum: {
        eventCount: true,
        newIssueCount: true,
        affectedUserCount: true,
        reopenedIssueCount: true,
      },
    });

    const eventCount = stats._sum.eventCount || 0;
    const newIssueCount = stats._sum.newIssueCount || 0;
    const affectedUserCount = stats._sum.affectedUserCount || 0;
    const regressionsCount = stats._sum.reopenedIssueCount || 0;

    // Fetch issues associated with this release (via grouped events query)
    const issueIdsGroup = await db.event.groupBy({
      by: ["issueId"],
      where: { projectId, releaseId },
    });
    const issueIds = issueIdsGroup.map((g) => g.issueId).filter((id): id is string => !!id);

    const issues = await db.issue.findMany({
      where: { id: { in: issueIds }, deletedAt: null },
      orderBy: { lastSeenAt: "desc" },
    });

    const errorRate =
      eventCount > 0
        ? Math.min(100, Math.round((eventCount / (eventCount * 10 + 5000)) * 100 * 100) / 100)
        : 0.0;

    return NextResponse.json(
      {
        data: {
          release,
          metrics: {
            eventCount,
            newIssueCount,
            affectedUserCount,
            regressionsCount,
            errorRate,
            uniqueIssuesCount: issues.length,
          },
          issues,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; releaseId: string }> }
) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const { projectId, releaseId } = await params;
    const user = await getSessionUser();

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

    // Verify user membership with role check (Owner or Admin required to delete)
    const membership = await db.membership.findFirst({
      where: {
        organizationId: project.organizationId,
        userId: user.id,
        status: "ACTIVE",
        role: { in: ["OWNER", "ADMIN"] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only organization Owners and Admins can delete releases",
            requestId,
          },
        },
        { status: 403, headers: responseHeaders }
      );
    }

    const release = await db.release.findFirst({
      where: { id: releaseId, projectId },
    });

    if (!release) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Release not found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    await db.release.delete({
      where: { id: releaseId },
    });

    await createAuditLog({
      organizationId: project.organizationId,
      actorUserId: user.id,
      actorName: user.displayName,
      actorEmail: user.email,
      actionType: "RELEASE_DELETE",
      targetType: "Release",
      targetId: releaseId,
      beforeState: {
        version: release.version,
        commitSha: release.commitSha,
        deployedAt: release.deployedAt,
      },
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
