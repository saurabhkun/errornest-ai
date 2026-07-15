import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

const ROLE_HIERARCHY: Record<string, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

const updateRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const { orgId, userId } = await params;
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

    const targetMembership = await db.membership.findFirst({
      where: { organizationId: orgId, userId, status: "ACTIVE" },
      include: { user: { select: { displayName: true, email: true } } },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Member not found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    const body = await request.json();
    const result = updateRoleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid role",
            fieldErrors: result.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 400, headers: responseHeaders }
      );
    }

    const { role: newRole } = result.data;
    const callerRole = callerMembership.role;
    const targetCurrentRole = targetMembership.role;

    // ADMINs cannot promote to OWNER
    if (callerRole === "ADMIN" && newRole === "OWNER") {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Admins cannot promote members to Owner",
            requestId,
          },
        },
        { status: 403, headers: responseHeaders }
      );
    }

    // ADMINs cannot demote owners
    if (callerRole === "ADMIN" && targetCurrentRole === "OWNER") {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Admins cannot change the role of the Owner",
            requestId,
          },
        },
        { status: 403, headers: responseHeaders }
      );
    }

    // Cannot escalate beyond caller's own role
    if (ROLE_HIERARCHY[newRole] > ROLE_HIERARCHY[callerRole]) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Cannot assign a role higher than your own",
            requestId,
          },
        },
        { status: 403, headers: responseHeaders }
      );
    }

    // Cannot change your own role
    if (userId === user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You cannot change your own role", requestId } },
        { status: 403, headers: responseHeaders }
      );
    }

    const updated = await db.membership.update({
      where: { id: targetMembership.id },
      data: { role: newRole },
    });

    await createAuditLog({
      organizationId: orgId,
      actorUserId: user.id,
      actorName: user.displayName,
      actorEmail: user.email,
      actionType: "TEAM_ROLE_CHANGED",
      targetType: "Membership",
      targetId: targetMembership.id,
      beforeState: { userId, role: targetCurrentRole },
      afterState: { userId, role: newRole },
    });

    return NextResponse.json({ data: updated }, { headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message, requestId } },
      { status: 500, headers: responseHeaders }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const { orgId, userId } = await params;
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

    const targetMembership = await db.membership.findFirst({
      where: { organizationId: orgId, userId, status: "ACTIVE" },
      include: { user: { select: { displayName: true, email: true } } },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Member not found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    // Cannot remove yourself
    if (userId === user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You cannot remove yourself", requestId } },
        { status: 403, headers: responseHeaders }
      );
    }

    // ADMINs cannot remove OWNERs
    if (callerMembership.role === "ADMIN" && targetMembership.role === "OWNER") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admins cannot remove the Owner", requestId } },
        { status: 403, headers: responseHeaders }
      );
    }

    // Protect last OWNER
    if (targetMembership.role === "OWNER") {
      const ownerCount = await db.membership.count({
        where: { organizationId: orgId, role: "OWNER", status: "ACTIVE" },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Cannot remove the last Owner of the organization",
              requestId,
            },
          },
          { status: 403, headers: responseHeaders }
        );
      }
    }

    await db.membership.update({
      where: { id: targetMembership.id },
      data: { status: "REMOVED" },
    });

    await createAuditLog({
      organizationId: orgId,
      actorUserId: user.id,
      actorName: user.displayName,
      actorEmail: user.email,
      actionType: "TEAM_MEMBER_REMOVED",
      targetType: "Membership",
      targetId: targetMembership.id,
      beforeState: {
        userId,
        role: targetMembership.role,
        email: targetMembership.user.email,
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
