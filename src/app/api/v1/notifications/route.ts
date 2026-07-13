import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const url = new URL(request.url);

    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));
    const status = url.searchParams.get("status") || "all"; // all, read, unread

    const whereClause: Prisma.NotificationWhereInput = {
      userId: user.id,
    };

    if (status === "unread") {
      whereClause.readAt = null;
    } else if (status === "read") {
      whereClause.readAt = { not: null };
    }

    const [notifications, totalCount] = await Promise.all([
      db.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.notification.count({ where: whereClause }),
    ]);

    const hasMore = offset + notifications.length < totalCount;

    return NextResponse.json({
      data: notifications,
      meta: {
        totalCount,
        hasMore,
        limit,
        offset,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}
