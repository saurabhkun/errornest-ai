import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";
import crypto from "crypto";
import { EmailDispatcher } from "@/lib/services/alerts/EmailDispatcher";

const createInviteSchema = z.object({
  email: z.string().email("Valid email is required"),
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const { orgId } = await params;
    const user = await getSessionUser();

    // Caller must be active member
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

    // Return pending invites (not accepted and not revoked and not expired)
    const invites = await db.invite.findMany({
      where: {
        organizationId: orgId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gte: new Date() },
      },
      include: {
        invitedBy: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: invites }, { headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message, requestId } },
      { status: 500, headers: responseHeaders }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const { orgId } = await params;
    const user = await getSessionUser();

    // Caller must be OWNER or ADMIN
    const callerMembership = await db.membership.findFirst({
      where: {
        organizationId: orgId,
        userId: user.id,
        status: "ACTIVE",
        role: { in: ["OWNER", "ADMIN"] },
      },
      include: { organization: true },
    });

    if (!callerMembership) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Forbidden", requestId } },
        { status: 403, headers: responseHeaders }
      );
    }

    const body = await request.json();
    const result = createInviteSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid invite data",
            fieldErrors: result.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 400, headers: responseHeaders }
      );
    }

    const { email, role } = result.data;

    // ADMINs cannot invite with role OWNER
    if (callerMembership.role === "ADMIN" && role === "OWNER") {
      return NextResponse.json(
        {
          error: { code: "FORBIDDEN", message: "Admins cannot invite with Owner role", requestId },
        },
        { status: 403, headers: responseHeaders }
      );
    }

    // Check if email is already an active member
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMembership = await db.membership.findFirst({
        where: { organizationId: orgId, userId: existingUser.id, status: "ACTIVE" },
      });
      if (existingMembership) {
        return NextResponse.json(
          {
            error: {
              code: "CONFLICT",
              message: "This user is already a member of the organization",
              requestId,
            },
          },
          { status: 409, headers: responseHeaders }
        );
      }
    }

    // Revoke any existing pending invites for this email (resend flow)
    await db.invite.updateMany({
      where: {
        organizationId: orgId,
        email,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    // Create new invite (7-day expiry)
    const tokenBuffer = crypto.randomBytes(32);
    const token = tokenBuffer.toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const invite = await db.invite.create({
      data: {
        organizationId: orgId,
        email,
        role,
        tokenHash,
        invitedByUserId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: {
        invitedBy: { select: { displayName: true, email: true } },
      },
    });

    await createAuditLog({
      organizationId: orgId,
      actorUserId: user.id,
      actorName: user.displayName,
      actorEmail: user.email,
      actionType: "TEAM_MEMBER_INVITED",
      targetType: "Invite",
      targetId: invite.id,
      afterState: { email, role },
    });

    // Send the invite email asynchronously
    const orgName = callerMembership?.organization?.name || "ErrorNest Workspace";
    const invitedBy = user.displayName || user.email;
    EmailDispatcher.sendInviteEmail({
      email,
      orgName,
      invitedBy,
      token,
    }).catch((err) => {
      console.error("Failed to send invite email asynchronously:", err);
    });

    return NextResponse.json({ data: invite }, { status: 201, headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message, requestId } },
      { status: 500, headers: responseHeaders }
    );
  }
}
