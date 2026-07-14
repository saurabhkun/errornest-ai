import { db } from "@/lib/db/client";

export class RollupManager {
  /**
   * Records an event in the hourly rollup table.
   */
  static async recordEvent(
    eventId: string,
    result: { isNewIssue: boolean; isRegression: boolean }
  ): Promise<void> {
    const event = await db.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return;
    }

    const { projectId, environmentId, releaseId, userExternalId, createdAt } = event;

    // Round createdAt to the start of the hour
    const bucketStart = new Date(createdAt);
    bucketStart.setUTCMinutes(0, 0, 0);
    bucketStart.setUTCMilliseconds(0);

    // Check if we have seen this userExternalId in this hour for this project, environment, and release
    let isNewUserInHour = false;
    if (userExternalId) {
      const gte = new Date(bucketStart);
      const lt = new Date(bucketStart.getTime() + 60 * 60 * 1000);
      const existingUserEvent = await db.event.findFirst({
        where: {
          projectId,
          environmentId,
          releaseId,
          userExternalId,
          createdAt: { gte, lt },
          id: { not: eventId },
        },
        select: { id: true },
      });
      if (!existingUserEvent) {
        isNewUserInHour = true;
      }
    }

    // Try finding first to handle null-containing unique constraint
    const existing = await db.analyticsHourly.findFirst({
      where: {
        projectId,
        environmentId,
        releaseId,
        bucketStart,
      },
    });

    if (existing) {
      await db.analyticsHourly.update({
        where: { id: existing.id },
        data: {
          eventCount: { increment: 1 },
          newIssueCount: result.isNewIssue ? { increment: 1 } : undefined,
          reopenedIssueCount: result.isRegression ? { increment: 1 } : undefined,
          affectedUserCount: isNewUserInHour ? { increment: 1 } : undefined,
        },
      });
    } else {
      try {
        await db.analyticsHourly.create({
          data: {
            projectId,
            environmentId,
            releaseId,
            bucketStart,
            eventCount: 1,
            newIssueCount: result.isNewIssue ? 1 : 0,
            reopenedIssueCount: result.isRegression ? 1 : 0,
            affectedUserCount: isNewUserInHour ? 1 : 0,
          },
        });
      } catch (err) {
        // If conflict occurs because of concurrent insertions, fetch again and update
        const retryExisting = await db.analyticsHourly.findFirst({
          where: {
            projectId,
            environmentId,
            releaseId,
            bucketStart,
          },
        });
        if (retryExisting) {
          await db.analyticsHourly.update({
            where: { id: retryExisting.id },
            data: {
              eventCount: { increment: 1 },
              newIssueCount: result.isNewIssue ? { increment: 1 } : undefined,
              reopenedIssueCount: result.isRegression ? { increment: 1 } : undefined,
              affectedUserCount: isNewUserInHour ? { increment: 1 } : undefined,
            },
          });
        } else {
          throw err;
        }
      }
    }
  }
}
