import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";

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

    // Fetch current release
    const currentRelease = await db.release.findFirst({
      where: { id: releaseId, projectId },
    });

    if (!currentRelease) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Current release not found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    // Determine comparison release
    const { searchParams } = new URL(request.url);
    const withReleaseId = searchParams.get("withReleaseId");

    let comparisonRelease = null;
    if (withReleaseId) {
      comparisonRelease = await db.release.findFirst({
        where: { id: withReleaseId, projectId },
      });
    } else {
      // Default to previous release by deployedAt
      comparisonRelease = await db.release.findFirst({
        where: {
          projectId,
          deployedAt: {
            lt: currentRelease.deployedAt || currentRelease.createdAt,
          },
        },
        orderBy: {
          deployedAt: "desc",
        },
      });
    }

    // Get current release metrics
    const currentStats = await db.analyticsHourly.aggregate({
      where: { projectId, releaseId },
      _sum: {
        eventCount: true,
        newIssueCount: true,
        affectedUserCount: true,
        reopenedIssueCount: true,
      },
    });

    const currentEventCount = currentStats._sum.eventCount || 0;
    const currentNewIssueCount = currentStats._sum.newIssueCount || 0;
    const currentAffectedUserCount = currentStats._sum.affectedUserCount || 0;
    const currentRegressionsCount = currentStats._sum.reopenedIssueCount || 0;

    // Get comparison release metrics
    let compEventCount = 0;
    let compNewIssueCount = 0;
    let compAffectedUserCount = 0;
    let compRegressionsCount = 0;

    if (comparisonRelease) {
      const compStats = await db.analyticsHourly.aggregate({
        where: { projectId, releaseId: comparisonRelease.id },
        _sum: {
          eventCount: true,
          newIssueCount: true,
          affectedUserCount: true,
          reopenedIssueCount: true,
        },
      });
      compEventCount = compStats._sum.eventCount || 0;
      compNewIssueCount = compStats._sum.newIssueCount || 0;
      compAffectedUserCount = compStats._sum.affectedUserCount || 0;
      compRegressionsCount = compStats._sum.reopenedIssueCount || 0;
    }

    // Fetch current release issues
    const currentIssuesGroup = await db.event.groupBy({
      by: ["issueId"],
      where: { projectId, releaseId },
    });
    const currentIssueIds = currentIssuesGroup
      .map((g) => g.issueId)
      .filter((id): id is string => !!id);

    // Fetch comparison release issues
    let comparisonIssueIds: string[] = [];
    if (comparisonRelease) {
      const compIssuesGroup = await db.event.groupBy({
        by: ["issueId"],
        where: { projectId, releaseId: comparisonRelease.id },
      });
      comparisonIssueIds = compIssuesGroup
        .map((g) => g.issueId)
        .filter((id): id is string => !!id);
    }

    // New issues = present in current release but NOT in comparison release
    const compSet = new Set(comparisonIssueIds);
    const newIssueIds = currentIssueIds.filter((id) => !compSet.has(id));

    const newIssues = await db.issue.findMany({
      where: { id: { in: newIssueIds }, deletedAt: null },
      orderBy: { lastSeenAt: "desc" },
    });

    return NextResponse.json(
      {
        data: {
          currentRelease,
          comparisonRelease,
          metrics: {
            current: {
              eventCount: currentEventCount,
              newIssueCount: currentNewIssueCount,
              affectedUserCount: currentAffectedUserCount,
              regressionsCount: currentRegressionsCount,
            },
            comparison: comparisonRelease
              ? {
                  eventCount: compEventCount,
                  newIssueCount: compNewIssueCount,
                  affectedUserCount: compAffectedUserCount,
                  regressionsCount: compRegressionsCount,
                }
              : null,
            deltas: {
              eventCount: currentEventCount - compEventCount,
              newIssueCount: currentNewIssueCount - compNewIssueCount,
              affectedUserCount: currentAffectedUserCount - compAffectedUserCount,
              regressionsCount: currentRegressionsCount - compRegressionsCount,
            },
          },
          newIssues,
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
