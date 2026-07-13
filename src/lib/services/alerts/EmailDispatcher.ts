import React from "react";
import { NewIssueEmail, RegressionEmail, SpikeEmail } from "./EmailTemplates";
import { EmailJobData, alertEmailQueue } from "@/lib/queue/alert-queue";

export class EmailDispatcher {
  /**
   * Initialize and start processing the email queue.
   */
  static startQueueProcessor(): void {
    alertEmailQueue.process(async (job: EmailJobData) => {
      await EmailDispatcher.sendEmail(job);
    });
  }

  /**
   * Enqueues an email dispatch job.
   */
  static async enqueueEmail(data: EmailJobData): Promise<void> {
    await alertEmailQueue.add(data);
  }

  /**
   * Compiles JSX template to HTML and dispatches the email.
   */
  private static async sendEmail(data: EmailJobData): Promise<void> {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    let subject = "";
    let html = "";

    try {
      if (data.type === "NEW_ISSUE") {
        subject = `[New Issue] ${data.projectName}: ${data.issueTitle}`;
        const targetUrl = `${baseUrl}/app/${data.projectName.toLowerCase()}/projects/${data.projectName.toLowerCase()}/issues/${data.issueId}`;
        html = renderToStaticMarkup(
          React.createElement(NewIssueEmail, {
            projectName: data.projectName,
            issueTitle: data.issueTitle || "",
            errorType: data.level || "ERROR",
            message: data.message || "",
            level: data.level || "ERROR",
            targetUrl,
          })
        );
      } else if (data.type === "REGRESSION") {
        subject = `[Regression] ${data.projectName}: ${data.issueTitle}`;
        const targetUrl = `${baseUrl}/app/${data.projectName.toLowerCase()}/projects/${data.projectName.toLowerCase()}/issues/${data.issueId}`;
        html = renderToStaticMarkup(
          React.createElement(RegressionEmail, {
            projectName: data.projectName,
            issueTitle: data.issueTitle || "",
            errorType: data.level || "ERROR",
            level: data.level || "ERROR",
            targetUrl,
          })
        );
      } else if (data.type === "SPIKE") {
        subject = `[Spike Alert] ${data.projectName}: ${data.userName || "Alert triggered"}`;
        const targetUrl = `${baseUrl}/app/${data.projectName.toLowerCase()}/projects/${data.projectName.toLowerCase()}/alerts`;
        html = renderToStaticMarkup(
          React.createElement(SpikeEmail, {
            projectName: data.projectName,
            ruleName: data.userName || "Spike alert rule triggered",
            environmentName: data.environmentName || "production",
            thresholdCount: data.thresholdCount || 10,
            thresholdWindowSeconds: data.thresholdWindowSeconds || 300,
            eventCount: data.eventCount || 0,
            targetUrl,
          })
        );
      }

      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey || apiKey === "mock") {
        console.log(`[MOCK EMAIL] To: ${data.userEmail} (${data.userName})`);
        console.log(`Subject: ${subject}`);
        console.log(`HTML length: ${html.length} chars`);
        return;
      }

      const fromEmail = process.env.EMAIL_FROM || "alerts@errornest.dev";
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `ErrorNest <${fromEmail}>`,
          to: [data.userEmail],
          subject,
          html,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Resend API returned status ${response.status}: ${errText}`);
      }

      const resBody = await response.json();
      console.log(
        `Email successfully dispatched via Resend to ${data.userEmail}. ID: ${resBody.id}`
      );
    } catch (error) {
      console.error(`Failed to dispatch email to ${data.userEmail}:`, error);
      throw error; // Re-throw to allow queue retry/logging if wanted
    }
  }
}

// Start processing eagerly
EmailDispatcher.startQueueProcessor();
