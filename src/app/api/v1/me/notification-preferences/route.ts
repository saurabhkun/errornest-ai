import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { z } from "zod";
import { NotificationType } from "@prisma/client";

const updatePreferenceSchema = z.object({
  type: z.nativeEnum(NotificationType),
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await getSessionUser();

    const existing = await db.notificationPreference.findMany({
      where: { userId: user.id },
    });

    const types = Object.values(NotificationType);
    const preferences = types.map((t) => {
      const found = existing.find((p) => p.type === t);
      return {
        type: t,
        inAppEnabled: found ? found.inAppEnabled : true,
        emailEnabled: found ? found.emailEnabled : true,
      };
    });

    return NextResponse.json({ data: preferences });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await request.json();

    const result = updatePreferenceSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid preference data",
            fieldErrors: result.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { type, inAppEnabled, emailEnabled } = result.data;

    // Fetch existing preference to keep fields unchanged if not provided in the patch request
    const existing = await db.notificationPreference.findUnique({
      where: {
        userId_type: {
          userId: user.id,
          type,
        },
      },
    });

    const finalInApp =
      inAppEnabled !== undefined ? inAppEnabled : existing ? existing.inAppEnabled : true;
    const finalEmail =
      emailEnabled !== undefined ? emailEnabled : existing ? existing.emailEnabled : true;

    const updated = await db.notificationPreference.upsert({
      where: {
        userId_type: {
          userId: user.id,
          type,
        },
      },
      update: {
        inAppEnabled: finalInApp,
        emailEnabled: finalEmail,
      },
      create: {
        userId: user.id,
        type,
        inAppEnabled: finalInApp,
        emailEnabled: finalEmail,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}
