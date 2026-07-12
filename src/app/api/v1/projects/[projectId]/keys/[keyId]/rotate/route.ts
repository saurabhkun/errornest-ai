import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { generateApiKey } from "@/lib/utils/keys";
import { createAuditLog } from "@/lib/utils/audit";

export async function POST(
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

    const oldKey = await db.apiKey.findFirst({
      where: { id: keyId, projectId, revokedAt: null },
    });

    if (!oldKey) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Active API key not found" } },
        { status: 404 }
      );
    }

    const { rawKey, keyPrefix, keySuffix, keyHash } = generateApiKey();

    const result = await db.$transaction(async (tx) => {
      // 1. Revoke old key
      const revoked = await tx.apiKey.update({
        where: { id: keyId },
        data: { revokedAt: new Date() },
      });

      // 2. Create new key
      const created = await tx.apiKey.create({
        data: {
          projectId,
          name: oldKey.name,
          keyPrefix,
          keySuffix,
          keyHash,
          createdByUserId: user.id,
        },
      });

      return { revoked, created };
    });

    await createAuditLog({
      organizationId: project.organizationId,
      actorUserId: user.id,
      actorName: user.displayName,
      actorEmail: user.email,
      actionType: "API_KEY_ROTATE",
      targetType: "ApiKey",
      targetId: result.created.id,
      beforeState: { id: oldKey.id, name: oldKey.name, revokedAt: oldKey.revokedAt },
      afterState: {
        id: result.created.id,
        name: result.created.name,
        keyPrefix: result.created.keyPrefix,
        keySuffix: result.created.keySuffix,
      },
    });

    return NextResponse.json({
      data: {
        id: result.created.id,
        name: result.created.name,
        rawKey,
        keyPrefix: result.created.keyPrefix,
        keySuffix: result.created.keySuffix,
        createdAt: result.created.createdAt,
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
