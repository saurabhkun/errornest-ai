import { db } from "@/lib/db/client";
import { AlertRule, AlertOccurrence } from "@prisma/client";

export class CooldownManager {
  /**
   * Checks if an alert rule is currently on cooldown.
   */
  static isOnCooldown(rule: AlertRule): boolean {
    if (!rule.lastTriggeredAt) {
      return false;
    }
    const elapsedMs = Date.now() - rule.lastTriggeredAt.getTime();
    return elapsedMs < rule.cooldownSeconds * 1000;
  }

  /**
   * Triggers an alert rule, updating its cooldown timestamp and creating an AlertOccurrence.
   * Returns the AlertOccurrence if successfully created, or null if duplicate prevention triggered.
   */
  static async triggerRule(
    rule: AlertRule,
    issueId: string | null,
    windowStartedAt: Date,
    deduplicationKey: string
  ): Promise<AlertOccurrence | null> {
    try {
      const occurrence = await db.$transaction(async (tx) => {
        // Update the lastTriggeredAt on the AlertRule to start the cooldown
        await tx.alertRule.update({
          where: { id: rule.id },
          data: { lastTriggeredAt: new Date() },
        });

        // Create the AlertOccurrence record
        return await tx.alertOccurrence.create({
          data: {
            alertRuleId: rule.id,
            issueId,
            windowStartedAt,
            deduplicationKey,
          },
        });
      });

      return occurrence;
    } catch (error: unknown) {
      // Prisma code for unique constraint violation (P2002)
      const err = error as { code?: string; message?: string };
      if (err && (err.code === "P2002" || err.message?.includes("Unique constraint"))) {
        console.log(
          `Deduplication triggered: Rule ${rule.id} already fired for key ${deduplicationKey}`
        );
        return null;
      }
      throw error;
    }
  }
}
