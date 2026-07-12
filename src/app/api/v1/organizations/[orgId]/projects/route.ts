import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  platform: z.string().min(1).max(50),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const user = await getSessionUser();

    // Check organization membership
    const membership = await db.membership.findFirst({
      where: { organizationId: orgId, userId: user.id, status: "ACTIVE" },
    });

    if (!membership) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Forbidden" } },
        { status: 403 }
      );
    }

    const projects = await db.project.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: projects });
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
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const user = await getSessionUser();

    // Verify membership role (Owner or Admin required)
    const membership = await db.membership.findFirst({
      where: {
        organizationId: orgId,
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
            message: "Only organization Owners and Admins can manage projects.",
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = createProjectSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid project parameters",
            fieldErrors: result.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { name, platform } = result.data;

    // Auto-generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check for duplicate name/slug
    const existing = await db.project.findFirst({
      where: {
        organizationId: orgId,
        OR: [{ name }, { slug }],
        deletedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "A project with this name or slug already exists.",
          },
        },
        { status: 409 }
      );
    }

    // Transaction to create project + default environments
    const project = await db.$transaction(async (tx) => {
      const proj = await tx.project.create({
        data: {
          organizationId: orgId,
          name,
          slug,
          platform,
          status: "ACTIVE",
        },
      });

      // Default environments
      await tx.environment.createMany({
        data: [
          { projectId: proj.id, name: "production" },
          { projectId: proj.id, name: "staging" },
          { projectId: proj.id, name: "development" },
        ],
      });

      return proj;
    });

    // Audit Log
    await createAuditLog({
      organizationId: orgId,
      actorUserId: user.id,
      actorName: user.displayName,
      actorEmail: user.email,
      actionType: "PROJECT_CREATE",
      targetType: "Project",
      targetId: project.id,
      afterState: project as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}
