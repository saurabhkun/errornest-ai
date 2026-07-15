import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { z } from "zod";
import { AiFeedback } from "@prisma/client";

const feedbackSchema = z.object({
  feedback: z.nativeEnum(AiFeedback),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resultId: string }> }
) {
  const requestId = crypto.randomUUID();
  const responseHeaders = new Headers();
  responseHeaders.set("X-Request-Id", requestId);

  try {
    const { resultId } = await params;
    const user = await getSessionUser();

    const aiResult = await db.aiResult.findUnique({
      where: { id: resultId },
      include: {
        issue: {
          select: {
            project: { select: { organizationId: true } },
          },
        },
      },
    });

    if (!aiResult) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "AI result not found", requestId } },
        { status: 404, headers: responseHeaders }
      );
    }

    // Verify user is a member of the organization that owns this issue
    const membership = await db.membership.findFirst({
      where: {
        organizationId: aiResult.issue.project.organizationId,
        userId: user.id,
        status: "ACTIVE",
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Access denied", requestId } },
        { status: 403, headers: responseHeaders }
      );
    }

    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "feedback must be HELPFUL or NOT_HELPFUL",
            fieldErrors: parsed.error.flatten().fieldErrors,
            requestId,
          },
        },
        { status: 400, headers: responseHeaders }
      );
    }

    // Idempotent update — any member can record feedback
    const updated = await db.aiResult.update({
      where: { id: resultId },
      data: { feedback: parsed.data.feedback },
      select: { id: true, feedback: true },
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
