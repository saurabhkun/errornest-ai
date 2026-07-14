import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { z } from "zod";
import { AlertType, EventLevel } from "@prisma/client";
import { createAuditLog } from "@/lib/utils/audit";

const alertRuleSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    type: z.nativeEnum(AlertType),
    environmentId: z.string().uuid().nullable().optional(),
    minimumLevel: z.nativeEnum(EventLevel).nullable().optional(),
    thresholdCount: z.number().int().min(1).nullable().optional(),
    thresholdWindowSeconds: z.number().int().min(10).nullable().optional(),
    cooldownSeconds: z.number().int().min(0).default(300),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.type === "SPIKE") {
        return (
          data.thresholdCount !== undefined &&
          data.thresholdCount !== null &&
          data.thresholdWindowSeconds !== undefined &&
          data.thresholdWindowSeconds !== null
        );
      }
      return true;
    },
    {
      message: "Threshold count and window are required for SPIKE alert rules",
      path: ["thresholdCount"],
    }
  );

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

    // Verify membership (any active member can read)
    const membership = await db.membership.findFirst({
      where: { organizationId: project.organizationId, userId: user.id, status: "ACTIVE" },
    });

    if (!membership) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Forbidden" } },
        { status: 403 }
      );
    }

    const rules = await db.alertRule.findMany({
      where: { projectId },
      include: {
        environment: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: rules });
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

    // Verify write permissions (OWNER, ADMIN, MEMBER)
    const membership = await db.membership.findFirst({
      where: {
        organizationId: project.organizationId,
        userId: user.id,
        status: "ACTIVE",
        role: { in: ["OWNER", "ADMIN", "MEMBER"] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Forbidden" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = alertRuleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid alert rule configuration",
            fieldErrors: result.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const newRule = await db.alertRule.create({
      data: {
        projectId,
        name: result.data.name,
        type: result.data.type,
        environmentId: result.data.environmentId || null,
        minimumLevel: result.data.minimumLevel || null,
        thresholdCount: result.data.thresholdCount || null,
        thresholdWindowSeconds: result.data.thresholdWindowSeconds || null,
        cooldownSeconds: result.data.cooldownSeconds,
        isActive: result.data.isActive,
        createdByUserId: user.id,
      },
      include: {
        environment: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      organizationId: project.organizationId,
      actorUserId: user.id,
      actorName: user.displayName,
      actorEmail: user.email,
      actionType: "ALERT_RULE_CREATE",
      targetType: "AlertRule",
      targetId: newRule.id,
      afterState: newRule as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ data: newRule }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}
