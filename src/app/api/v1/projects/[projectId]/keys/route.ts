import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { generateApiKey } from "@/lib/utils/keys";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
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

    // Verify membership
    const membership = await db.membership.findFirst({
      where: { organizationId: project.organizationId, userId: user.id, status: "ACTIVE" },
    });

    if (!membership) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Forbidden" } },
        { status: 403 }
      );
    }

    const keys = await db.apiKey.findMany({
      where: { projectId, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });

    // Expose prefix, suffix, name, lastUsedAt, revokedAt, createdAt. Mask hash
    const formattedKeys = keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      keySuffix: k.keySuffix,
      lastUsedAt: k.lastUsedAt,
      revokedAt: k.revokedAt,
      createdAt: k.createdAt,
    }));

    return NextResponse.json({ data: formattedKeys });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
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

    const body = await request.json();
    const result = createKeySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid key name",
            fieldErrors: result.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { name } = result.data;
    const { rawKey, keyPrefix, keySuffix, keyHash } = generateApiKey();

    const apiKey = await db.apiKey.create({
      data: {
        projectId,
        name,
        keyPrefix,
        keySuffix,
        keyHash,
        createdByUserId: user.id,
      },
    });

    await createAuditLog({
      organizationId: project.organizationId,
      actorUserId: user.id,
      actorName: user.displayName,
      actorEmail: user.email,
      actionType: "API_KEY_CREATE",
      targetType: "ApiKey",
      targetId: apiKey.id,
      afterState: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        keySuffix: apiKey.keySuffix,
      },
    });

    // Return plain-text key exactly once
    return NextResponse.json(
      {
        data: {
          id: apiKey.id,
          name: apiKey.name,
          rawKey,
          keyPrefix: apiKey.keyPrefix,
          keySuffix: apiKey.keySuffix,
          createdAt: apiKey.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}
