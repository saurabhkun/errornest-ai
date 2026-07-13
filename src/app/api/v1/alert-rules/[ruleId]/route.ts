import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { z } from "zod";
import { AlertType, EventLevel } from "@prisma/client";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  try {
    const { ruleId } = await params;
    const user = await getSessionUser();

    const existingRule = await db.alertRule.findUnique({
      where: { id: ruleId },
      include: { project: true },
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Alert rule not found" } },
        { status: 404 }
      );
    }

    // Verify write permissions
    const membership = await db.membership.findFirst({
      where: {
        organizationId: existingRule.project.organizationId,
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

    // Merge existing rule details with updates for full validation validation
    const merged = {
      name: body.name !== undefined ? body.name : existingRule.name,
      type: body.type !== undefined ? body.type : existingRule.type,
      environmentId:
        body.environmentId !== undefined ? body.environmentId : existingRule.environmentId,
      minimumLevel: body.minimumLevel !== undefined ? body.minimumLevel : existingRule.minimumLevel,
      thresholdCount:
        body.thresholdCount !== undefined ? body.thresholdCount : existingRule.thresholdCount,
      thresholdWindowSeconds:
        body.thresholdWindowSeconds !== undefined
          ? body.thresholdWindowSeconds
          : existingRule.thresholdWindowSeconds,
      cooldownSeconds:
        body.cooldownSeconds !== undefined ? body.cooldownSeconds : existingRule.cooldownSeconds,
      isActive: body.isActive !== undefined ? body.isActive : existingRule.isActive,
    };

    const result = alertRuleSchema.safeParse(merged);
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

    const updatedRule = await db.alertRule.update({
      where: { id: ruleId },
      data: {
        name: result.data.name,
        type: result.data.type,
        environmentId: result.data.environmentId || null,
        minimumLevel: result.data.minimumLevel || null,
        thresholdCount: result.data.thresholdCount || null,
        thresholdWindowSeconds: result.data.thresholdWindowSeconds || null,
        cooldownSeconds: result.data.cooldownSeconds,
        isActive: result.data.isActive,
      },
      include: {
        environment: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: updatedRule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  try {
    const { ruleId } = await params;
    const user = await getSessionUser();

    const rule = await db.alertRule.findUnique({
      where: { id: ruleId },
      include: { project: true },
    });

    if (!rule) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Alert rule not found" } },
        { status: 404 }
      );
    }

    // Verify write permissions
    const membership = await db.membership.findFirst({
      where: {
        organizationId: rule.project.organizationId,
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

    await db.alertRule.delete({
      where: { id: ruleId },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}
