import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { z } from "zod";
import { createAuditLog } from "@/lib/utils/audit";

const patchEnvironmentSchema = z.object({
  isHidden: z.boolean().optional(),
  name: z.string().min(1).max(50).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ environmentId: string }> }
) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const { environmentId } = await params;
    const user = await getSessionUser();

    // Verify environment exists
    const environment = await db.environment.findFirst({
      where: { id: environmentId },
      include: { project: true },
    });

    if (!environment || environment.project.deletedAt) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Environment not found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    // Verify user membership with role check (Owner, Admin, or Member required)
    const membership = await db.membership.findFirst({
      where: {
        organizationId: environment.project.organizationId,
        userId: user.id,
        status: "ACTIVE",
        role: { in: ["OWNER", "ADMIN", "MEMBER"] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only organization Owners, Admins, and Members can modify environments", requestId } },
        { status: 403, headers: responseHeaders }
      );
    }

    const body = await request.json();
    const result = patchEnvironmentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid parameters",
            fieldErrors: result.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 400, headers: responseHeaders }
      );
    }

    const beforeState = {
      name: environment.name,
      isHidden: environment.isHidden,
    };

    const updated = await db.environment.update({
      where: { id: environmentId },
      data: result.data,
    });

    await createAuditLog({
      organizationId: environment.project.organizationId,
      actorUserId: user.id,
      actorName: user.displayName,
      actorEmail: user.email,
      actionType: "ENVIRONMENT_UPDATE",
      targetType: "Environment",
      targetId: updated.id,
      beforeState,
      afterState: {
        name: updated.name,
        isHidden: updated.isHidden,
      },
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
  request: NextRequest,
  { params }: { params: Promise<{ environmentId: string }> }
) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const { environmentId } = await params;
    const user = await getSessionUser();

    // Verify environment exists
    const environment = await db.environment.findFirst({
      where: { id: environmentId },
      include: { project: true },
    });

    if (!environment || environment.project.deletedAt) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Environment not found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    // Verify user membership with role check (Owner or Admin required to delete)
    const membership = await db.membership.findFirst({
      where: {
        organizationId: environment.project.organizationId,
        userId: user.id,
        status: "ACTIVE",
        role: { in: ["OWNER", "ADMIN"] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only organization Owners and Admins can delete environments", requestId } },
        { status: 403, headers: responseHeaders }
      );
    }

    // Delete environment and cascade events / rollups (or prisma onDelete cascade takes care of this)
    await db.environment.delete({
      where: { id: environmentId },
    });

    await createAuditLog({
      organizationId: environment.project.organizationId,
      actorUserId: user.id,
      actorName: user.displayName,
      actorEmail: user.email,
      actionType: "ENVIRONMENT_DELETE",
      targetType: "Environment",
      targetId: environmentId,
      beforeState: {
        name: environment.name,
        isHidden: environment.isHidden,
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
