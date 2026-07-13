import { db } from "@/lib/db/client";
import { AlertRule, NotificationType, Prisma } from "@prisma/client";
import { EmailDispatcher } from "./EmailDispatcher";

export interface NotificationDetails {
  issueId: string | null;
  issueTitle?: string;
  level?: string;
  message?: string;
  environmentName?: string;
  eventCount?: number;
}

export class NotificationDispatcher {
  /**
   * Dispatches alerts to all members of the organization who have notifications enabled.
   */
  static async dispatch(rule: AlertRule, details: NotificationDetails): Promise<void> {
    // 1. Fetch project and organization details
    const project = await db.project.findUnique({
      where: { id: rule.projectId },
      include: { organization: true },
    });

    if (!project) {
      throw new Error(`Project ${rule.projectId} not found`);
    }

    const org = project.organization;

    // 2. Build title, body, and targetUrl based on alert type
    let title = "";
    let body = "";
    let targetUrl = "";

    const baseUrl = `/app/${org.slug}/projects/${project.slug}`;

    if (rule.type === "NEW_ISSUE") {
      title = `New Issue in ${project.name}`;
      body = details.issueTitle || "A new unresolved error has been detected.";
      targetUrl = `${baseUrl}/issues/${details.issueId}`;
    } else if (rule.type === "REGRESSION") {
      title = `Regression in ${project.name}`;
      body = `Resolved issue reopened: ${details.issueTitle || "An error has reoccurred."}`;
      targetUrl = `${baseUrl}/issues/${details.issueId}`;
    } else if (rule.type === "SPIKE") {
      const windowMin = Math.round(((rule.thresholdWindowSeconds ?? 300) / 60) * 10) / 10;
      title = `Error Spike in ${project.name}`;
      body = `Rule "${rule.name}" triggered: ${details.eventCount} events in the last ${windowMin}m (threshold: >${rule.thresholdCount}).`;
      targetUrl = `${baseUrl}/alerts`; // Redirect to alert settings or spike dashboard
    }

    // 3. Fetch active members of the organization
    const memberships = await db.membership.findMany({
      where: {
        organizationId: org.id,
        status: "ACTIVE",
      },
      include: {
        user: true,
      },
    });

    // 4. Send to each active member
    for (const membership of memberships) {
      const user = membership.user;
      if (user.deletedAt) continue;

      // Fetch preference or use default
      const preference = await db.notificationPreference.findUnique({
        where: {
          userId_type: {
            userId: user.id,
            type: NotificationType.ALERT,
          },
        },
      });

      const inAppEnabled = preference ? preference.inAppEnabled : true;
      const emailEnabled = preference ? preference.emailEnabled : true;

      // Dispatch in-app notification
      if (inAppEnabled) {
        await db.notification.create({
          data: {
            userId: user.id,
            organizationId: org.id,
            type: NotificationType.ALERT,
            title,
            body,
            targetUrl,
            payload: {
              alertRuleId: rule.id,
              issueId: details.issueId,
              eventCount: details.eventCount,
            } as Prisma.InputJsonValue,
          },
        });
      }

      // Dispatch email notification via swappable queue
      if (emailEnabled && user.email) {
        await EmailDispatcher.enqueueEmail({
          userId: user.id,
          userEmail: user.email,
          userName: user.displayName,
          type: rule.type,
          projectName: project.name,
          issueId: details.issueId || undefined,
          issueTitle: details.issueTitle,
          level: details.level,
          message: details.message,
          environmentName: details.environmentName,
          thresholdCount: rule.thresholdCount || undefined,
          thresholdWindowSeconds: rule.thresholdWindowSeconds || undefined,
          eventCount: details.eventCount,
        });
      }
    }
  }
}
