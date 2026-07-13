import { db } from "@/lib/db/client";
import { CooldownManager } from "./CooldownManager";
import { SpikeDetector, getLevelsMeetingMinimum } from "./SpikeDetector";
import { NotificationDispatcher } from "./NotificationDispatcher";

export class RuleEvaluator {
  /**
   * Main entry point to evaluate all active rules for a project after an event is grouped.
   */
  static async evaluate(
    eventId: string,
    context: { isNewIssue: boolean; isRegression: boolean }
  ): Promise<void> {
    try {
      // 1. Fetch the event details
      const event = await db.event.findUnique({
        where: { id: eventId },
        include: { project: true },
      });

      if (!event) {
        console.error(`RuleEvaluator: Event ${eventId} not found`);
        return;
      }

      if (!event.issueId) {
        console.warn(`RuleEvaluator: Event ${eventId} is not grouped into an issue yet`);
        return;
      }

      // Fetch the environment name
      const environment = await db.environment.findUnique({
        where: { id: event.environmentId },
      });
      const envName = environment?.name || "production";

      // 2. Fetch all active rules for the project
      const rules = await db.alertRule.findMany({
        where: {
          projectId: event.projectId,
          isActive: true,
        },
      });

      for (const rule of rules) {
        // A. Check environment scope
        if (rule.environmentId && rule.environmentId !== event.environmentId) {
          continue;
        }

        // B. Check severity level
        if (rule.minimumLevel) {
          const allowedLevels = getLevelsMeetingMinimum(rule.minimumLevel);
          if (!allowedLevels.includes(event.level)) {
            continue;
          }
        }

        // C. Check cooldown
        if (CooldownManager.isOnCooldown(rule)) {
          console.log(`Rule ${rule.id} (${rule.name}) is on cooldown. Skipping.`);
          continue;
        }

        // D. Evaluate based on type
        if (rule.type === "NEW_ISSUE" && context.isNewIssue) {
          const deduplicationKey = `new_issue:${event.issueId}`;
          const occurrence = await CooldownManager.triggerRule(
            rule,
            event.issueId,
            event.createdAt,
            deduplicationKey
          );

          if (occurrence) {
            await NotificationDispatcher.dispatch(rule, {
              issueId: event.issueId,
              issueTitle: event.message,
              level: event.level,
              message: event.message,
              environmentName: envName,
            });
          }
        } else if (rule.type === "REGRESSION" && context.isRegression) {
          const deduplicationKey = `regression:${event.issueId}:${event.id}`;
          const occurrence = await CooldownManager.triggerRule(
            rule,
            event.issueId,
            event.createdAt,
            deduplicationKey
          );

          if (occurrence) {
            await NotificationDispatcher.dispatch(rule, {
              issueId: event.issueId,
              issueTitle: event.message,
              level: event.level,
              message: event.message,
              environmentName: envName,
            });
          }
        } else if (rule.type === "SPIKE") {
          const { triggered, eventCount, windowStart } = await SpikeDetector.detectSpike(
            rule,
            event.issueId
          );

          if (triggered) {
            // Deduplicate spike occurrences per window start rounded to seconds
            const timeBucket = Math.floor(windowStart.getTime() / 1000);
            const deduplicationKey = `spike:${event.issueId}:${timeBucket}`;

            const occurrence = await CooldownManager.triggerRule(
              rule,
              event.issueId,
              windowStart,
              deduplicationKey
            );

            if (occurrence) {
              await NotificationDispatcher.dispatch(rule, {
                issueId: event.issueId,
                issueTitle: event.message,
                level: event.level,
                message: event.message,
                environmentName: envName,
                eventCount,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(`RuleEvaluator error for event ${eventId}:`, error);
    }
  }
}
