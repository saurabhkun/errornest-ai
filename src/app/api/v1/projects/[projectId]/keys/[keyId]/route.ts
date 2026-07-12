import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/utils/audit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; keyId: string }> }
) {
  try {
    const { projectId, keyId } = await params;
    const user = await getSessionUser();

    const project = await db.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Project not found" } },
        { status: 404 }
      );
    }

    // Verify membership role (Owner or Admin required)
    const membership = await db.membership.findFirst({
      where: {
        organizationId: project.organizationId,
        userId: user.id,
        status: "ACTIVE",
        role: { in: ["OWNER", "ADMIN"] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only organization Owners and Admins can manage API keys.",
          },
        },
        { status: 403 }
      );
    }

    const key = await db.apiKey.findFirst({
      where: { id: keyId, projectId, revokedAt: null },
    });

    if (!key) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Active API key not found" } },
        { status: 404 }
      );
    }

    const revokedKey = await db.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });

    await createAuditLog({
      organizationId: project.organizationId,
      actorUserId: user.id,
      actorName: user.displayName,
      actorEmail: user.email,
      actionType: "API_KEY_REVOKE",
      targetType: "ApiKey",
      targetId: keyId,
      beforeState: { id: key.id, name: key.name, revokedAt: key.revokedAt },
      afterState: { id: revokedKey.id, name: revokedKey.name, revokedAt: revokedKey.revokedAt },
    });

    return NextResponse.json({ data: revokedKey });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}
