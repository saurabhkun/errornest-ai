import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  platform: z.string().min(1).max(50).optional(),
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

    return NextResponse.json({ data: project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    // Verify membership role
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
        { error: { code: "FORBIDDEN", message: "Forbidden" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = updateProjectSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid parameters",
            fieldErrors: result.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const beforeState = { ...project };

    const updateData: { name?: string; slug?: string; platform?: string } = {};
    if (result.data.name) {
      updateData.name = result.data.name;
      updateData.slug = result.data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }
    if (result.data.platform) {
      updateData.platform = result.data.platform;
    }

    const updatedProject = await db.project.update({
      where: { id: projectId },
      data: updateData,
    });

    await createAuditLog({
      organizationId: project.organizationId,
      actorUserId: user.id,
      actorName: user.displayName,
      actorEmail: user.email,
      actionType: "PROJECT_UPDATE",
      targetType: "Project",
      targetId: projectId,
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: updatedProject as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ data: updatedProject });
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

    // Verify membership role
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
        { error: { code: "FORBIDDEN", message: "Forbidden" } },
        { status: 403 }
      );
    }

    const beforeState = { ...project };

    const deletedProject = await db.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      organizationId: project.organizationId,
      actorUserId: user.id,
      actorName: user.displayName,
      actorEmail: user.email,
      actionType: "PROJECT_DELETE",
      targetType: "Project",
      targetId: projectId,
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: deletedProject as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ data: deletedProject });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}
