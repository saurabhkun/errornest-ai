import { db } from "@/lib/db/client";
import { AlertRule, EventLevel, Prisma } from "@prisma/client";

const LEVEL_ORDER: EventLevel[] = ["INFO", "WARNING", "ERROR", "FATAL"];

export function getLevelsMeetingMinimum(minLevel: EventLevel): EventLevel[] {
  const idx = LEVEL_ORDER.indexOf(minLevel);
  if (idx === -1) return [minLevel];
  return LEVEL_ORDER.slice(idx);
}

export class SpikeDetector {
  /**
   * Evaluates if a SPIKE alert rule's threshold has been met within its time window.
   */
  static async detectSpike(
    rule: AlertRule,
    issueId: string | null
  ): Promise<{ triggered: boolean; eventCount: number; windowStart: Date }> {
    const windowSeconds = rule.thresholdWindowSeconds ?? 300;
    const thresholdCount = rule.thresholdCount ?? 100;
    const windowStart = new Date(Date.now() - windowSeconds * 1000);

    const whereClause: Prisma.EventWhereInput = {
      projectId: rule.projectId,
      createdAt: { gte: windowStart },
    };

    if (issueId) {
      whereClause.issueId = issueId;
    }

    if (rule.environmentId) {
      whereClause.environmentId = rule.environmentId;
    }

    if (rule.minimumLevel) {
      const levels = getLevelsMeetingMinimum(rule.minimumLevel);
      whereClause.level = { in: levels };
    }

    const eventCount = await db.event.count({
      where: whereClause,
    });

    return {
      triggered: eventCount >= thresholdCount,
      eventCount,
      windowStart,
    };
  }
}
