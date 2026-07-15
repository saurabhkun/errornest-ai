import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/utils/audit";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; inviteId: string }> }
) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const { orgId, inviteId } = await params;
    const user = await getSessionUser();

    // Caller must be OWNER or ADMIN
    const callerMembership = await db.membership.findFirst({
      where: {
        organizationId: orgId,
        userId: user.id,
        status: "ACTIVE",
        role: { in: ["OWNER", "ADMIN"] },
      },
    });

    if (!callerMembership) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Forbidden", requestId } },
        { status: 403, headers: responseHeaders }
      );
    }

    const invite = await db.invite.findFirst({
      where: { id: inviteId, organizationId: orgId },
    });

    if (!invite) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Invite not found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    if (invite.revokedAt) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Invite is already revoked", requestId } },
        { status: 409, headers: responseHeaders }
      );
    }

    await db.invite.update({
      where: { id: inviteId },
      data: { revokedAt: new Date() },
    });

    await createAuditLog({
      organizationId: orgId,
      actorUserId: user.id,
      actorName: user.displayName,
      actorEmail: user.email,
      actionType: "TEAM_INVITE_REVOKED",
      targetType: "Invite",
      targetId: inviteId,
      beforeState: { email: invite.email, role: invite.role },
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
