import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const { orgId } = await params;
    const user = await getSessionUser();

    // Verify membership (any active member can read audit logs)
    const membership = await db.membership.findFirst({
      where: {
        organizationId: orgId,
        userId: user.id,
        status: "ACTIVE",
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Forbidden", requestId } },
        { status: 403, headers: responseHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25", 10)));
    const actionType = searchParams.get("actionType") || undefined;
    const targetType = searchParams.get("targetType") || undefined;

    const whereClause = {
      organizationId: orgId,
      actionType: actionType || undefined,
      targetType: targetType || undefined,
    };

    const [totalCount, auditLogs] = await Promise.all([
      db.auditLog.count({ where: whereClause }),
      db.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json(
      {
        data: auditLogs,
        meta: {
          totalCount,
          page,
          pageSize,
          totalPages,
          hasMore: page < totalPages,
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
