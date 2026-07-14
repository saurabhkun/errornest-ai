import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const { sessionId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized", requestId } },
        { status: 401, headers: responseHeaders }
      );
    }

    const session = await db.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== user.id) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Session not found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    // Revoke session
    await db.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
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
