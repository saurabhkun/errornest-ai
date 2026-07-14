import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

const updateOrgSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100),
});

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

    // Verify membership
    const membership = await db.membership.findFirst({
      where: {
        organizationId: orgId,
        userId: user.id,
        status: "ACTIVE",
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Forbidden", requestId } },
        { status: 403, headers: responseHeaders }
      );
    }

    if (membership.organization.deletedAt) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Organization not found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    return NextResponse.json({ data: membership.organization }, { headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message, requestId } },
      { status: 500, headers: responseHeaders }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const { orgId } = await params;
    const user = await getSessionUser();

    // Verify write permissions (OWNER or ADMIN)
    const membership = await db.membership.findFirst({
      where: {
        organizationId: orgId,
        userId: user.id,
        status: "ACTIVE",
        role: { in: ["OWNER", "ADMIN"] },
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Forbidden", requestId } },
        { status: 403, headers: responseHeaders }
      );
    }

    const { organization } = membership;

    if (organization.deletedAt) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Organization not found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    const body = await request.json();
    const result = updateOrgSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid organization name",
            fieldErrors: result.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 400, headers: responseHeaders }
      );
    }

    const beforeState = { ...organization };

    const newSlug = result.data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check slug collision
    if (newSlug !== organization.slug) {
      const existing = await db.organization.findFirst({
        where: { slug: newSlug, deletedAt: null },
      });
      if (existing) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "An organization with this name already exists",
              requestId,
            },
          },
          { status: 400, headers: responseHeaders }
        );
      }
    }

    const updatedOrg = await db.organization.update({
      where: { id: orgId },
      data: {
        name: result.data.name,
        slug: newSlug,
      },
    });

    await createAuditLog({
      organizationId: orgId,
      actorUserId: user.id,
      actorName: user.displayName,
      actorEmail: user.email,
      actionType: "ORGANIZATION_UPDATE",
      targetType: "Organization",
      targetId: orgId,
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: updatedOrg as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ data: updatedOrg }, { headers: responseHeaders });
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
  { params }: { params: Promise<{ orgId: string }> }
) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const { orgId } = await params;
    const user = await getSessionUser();

    // Verify OWNER permissions (Only OWNER can delete organization)
    const membership = await db.membership.findFirst({
      where: {
        organizationId: orgId,
        userId: user.id,
        status: "ACTIVE",
        role: "OWNER",
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Forbidden", requestId } },
        { status: 403, headers: responseHeaders }
      );
    }

    const { organization } = membership;

    if (organization.deletedAt) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Organization not found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    const beforeState = { ...organization };

    const deletedOrg = await db.organization.update({
      where: { id: orgId },
      data: {
        deletedAt: new Date(),
      },
    });

    await createAuditLog({
      organizationId: orgId,
      actorUserId: user.id,
      actorName: user.displayName,
      actorEmail: user.email,
      actionType: "ORGANIZATION_DELETE",
      targetType: "Organization",
      targetId: orgId,
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: deletedOrg as unknown as Record<string, unknown>,
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
