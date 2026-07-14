import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { z } from "zod";

const updateProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(100),
});

export async function GET() {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized", requestId } },
        { status: 401, headers: responseHeaders }
      );
    }

    const fullUser = await db.user.findFirst({
      where: { id: user.id, deletedAt: null },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!fullUser) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    return NextResponse.json({ data: fullUser }, { headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message, requestId } },
      { status: 500, headers: responseHeaders }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized", requestId } },
        { status: 401, headers: responseHeaders }
      );
    }

    const body = await request.json();
    const result = updateProfileSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid display name",
            fieldErrors: result.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 400, headers: responseHeaders }
      );
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { displayName: result.data.displayName },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: updatedUser }, { headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message, requestId } },
      { status: 500, headers: responseHeaders }
    );
  }
}
