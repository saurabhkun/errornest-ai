import { db } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { Prisma } from "@prisma/client";

interface WriteAuditLogParams {
  organizationId: string;
  actionType: string;
  targetType: string;
  targetId: string;
  beforeState?: unknown;
  afterState?: unknown;
  request?: Request;
  actor?: {
    id: string;
    displayName: string;
    email: string;
  };
}

export async function writeAuditLog({
  organizationId,
  actionType,
  targetType,
  targetId,
  beforeState,
  afterState,
  request,
  actor,
}: WriteAuditLogParams) {
  let actorId: string | null = null;
  let actorName = "System";
  let actorEmail = "system@errornest.ai";

  if (actor) {
    actorId = actor.id;
    actorName = actor.displayName;
    actorEmail = actor.email;
  } else {
    try {
      const sessionUser = await getSessionUser();
      if (sessionUser) {
        actorId = sessionUser.id;
        actorName = sessionUser.displayName;
        actorEmail = sessionUser.email;
      }
    } catch {
      // Non-blocking if session retrieval fails (e.g., in async workers or testing)
    }
  }

  let ipAddress: string | null = null;
  let requestId: string | null = null;

  if (request) {
    const xForwardedFor = request.headers.get("x-forwarded-for");
    if (xForwardedFor) {
      ipAddress = xForwardedFor.split(",")[0].trim();
    } else {
      ipAddress = request.headers.get("x-real-ip") || null;
    }
    requestId = request.headers.get("x-request-id") || null;
  }

  return await db.auditLog.create({
    data: {
      organizationId,
      actorUserId: actorId,
      actorNameSnapshot: actorName,
      actorEmailSnapshot: actorEmail,
      actionType,
      targetType,
      targetId,
      beforeState: beforeState ? (beforeState as Prisma.InputJsonValue) : Prisma.DbNull,
      afterState: afterState ? (afterState as Prisma.InputJsonValue) : Prisma.DbNull,
      ipAddress,
      requestId,
    },
  });
}
