import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized", requestId } },
        { status: 401, headers: responseHeaders }
      );
    }

    const sessions = await db.session.findMany({
      where: {
        userId: user.id,
        revokedAt: null,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({ data: sessions }, { headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message, requestId } },
      { status: 500, headers: responseHeaders }
    );
  }
}
