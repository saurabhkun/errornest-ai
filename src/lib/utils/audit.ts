import { db } from "@/lib/db/client";
import { Prisma } from "@prisma/client";

interface CreateAuditLogOptions {
  organizationId: string;
  actorUserId: string | null;
  actorName: string;
  actorEmail: string;
  actionType: string;
  targetType: string;
  targetId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  ipAddress?: string | null;
  requestId?: string | null;
}

export async function createAuditLog(options: CreateAuditLogOptions) {
  return await db.auditLog.create({
    data: {
      organizationId: options.organizationId,
      actorUserId: options.actorUserId,
      actorNameSnapshot: options.actorName,
      actorEmailSnapshot: options.actorEmail,
      actionType: options.actionType,
      targetType: options.targetType,
      targetId: options.targetId,
      beforeState: options.beforeState
        ? (JSON.parse(JSON.stringify(options.beforeState)) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      afterState: options.afterState
        ? (JSON.parse(JSON.stringify(options.afterState)) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      ipAddress: options.ipAddress || null,
      requestId: options.requestId || null,
    },
  });
}
