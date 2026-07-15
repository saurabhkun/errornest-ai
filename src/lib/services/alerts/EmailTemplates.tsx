import React from "react";

interface BaseLayoutProps {
  title: string;
  previewText: string;
  children: React.ReactNode;
}

function BaseLayout({ title, previewText, children }: BaseLayoutProps) {
  return (
    <html lang="en">
      {React.createElement(
        "head",
        null,
        React.createElement("title", null, title),
        React.createElement("meta", {
          name: "viewport",
          content: "width=device-width, initial-scale=1.0",
        }),
        React.createElement("meta", {
          httpEquiv: "Content-Type",
          content: "text/html; charset=UTF-8",
        })
      )}
      <body
        style={{
          backgroundColor: "#09090b",
          color: "#e4e4e7",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          margin: 0,
          padding: 0,
          WebkitTextSizeAdjust: "100%",
        }}
      >
        <span
          style={{
            display: "none",
            maxHeight: 0,
            overflow: "hidden",
            opacity: 0,
          }}
        >
          {previewText}
        </span>
        <table
          role="presentation"
          width="100%"
          cellPadding="0"
          cellSpacing="0"
          style={{ backgroundColor: "#09090b", padding: "40px 20px" }}
        >
          <tr>
            <td align="center">
              <table
                role="presentation"
                width="600"
                cellPadding="0"
                cellSpacing="0"
                style={{
                  backgroundColor: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <tr>
                  <td
                    style={{
                      background: "linear-gradient(to right, #064e3b, #022c22)",
                      padding: "24px",
                      borderBottom: "1px solid #27272a",
                    }}
                  >
                    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0">
                      <tr>
                        <td>
                          <span
                            style={{
                              backgroundColor: "#059669",
                              color: "#ffffff",
                              fontWeight: "bold",
                              fontSize: "12px",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              marginRight: "10px",
                            }}
                          >
                            EN
                          </span>
                          <span
                            style={{
                              color: "#ffffff",
                              fontSize: "18px",
                              fontWeight: "bold",
                              letterSpacing: "-0.025em",
                            }}
                          >
                            ErrorNest Alert
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                {/* Content */}
                <tr>
                  <td style={{ padding: "32px 24px" }}>{children}</td>
                </tr>

                {/* Footer */}
                <tr>
                  <td
                    style={{
                      padding: "20px 24px",
                      borderTop: "1px solid #27272a",
                      backgroundColor: "#121214",
                      textAlign: "center",
                      fontSize: "11px",
                      color: "#71717a",
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      This is an automated notification from your ErrorNest workspace.
                    </p>
                    <p style={{ margin: "8px 0 0 0" }}>
                      Manage your alert preferences in the notification settings page.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}

interface NewIssueEmailProps {
  projectName: string;
  issueTitle: string;
  errorType: string;
  message: string;
  level: string;
  targetUrl: string;
}

export function NewIssueEmail({
  projectName,
  issueTitle,
  errorType,
  message,
  level,
  targetUrl,
}: NewIssueEmailProps) {
  const levelColor =
    level === "FATAL"
      ? "#ef4444"
      : level === "ERROR"
        ? "#f97316"
        : level === "WARNING"
          ? "#eab308"
          : "#3b82f6";

  return (
    <BaseLayout title={`New Issue in ${projectName}`} previewText={`[New Issue] ${issueTitle}`}>
      <h2
        style={{
          color: "#ffffff",
          fontSize: "20px",
          fontWeight: "bold",
          margin: "0 0 16px 0",
        }}
      >
        New Issue Detected
      </h2>
      <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#a1a1aa", margin: "0 0 24px 0" }}>
        A new issue has been captured in project <strong>{projectName}</strong>. Here are the
        details:
      </p>

      <table
        role="presentation"
        width="100%"
        cellPadding="0"
        cellSpacing="0"
        style={{
          backgroundColor: "#09090b",
          border: "1px solid #27272a",
          borderRadius: "8px",
          padding: "16px",
          margin: "0 0 24px 0",
        }}
      >
        <tr>
          <td style={{ paddingBottom: "10px" }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: "bold",
                color: "#71717a",
                textTransform: "uppercase",
              }}
            >
              Project
            </span>
            <div style={{ fontSize: "14px", color: "#e4e4e7", marginTop: "2px" }}>
              {projectName}
            </div>
          </td>
        </tr>
        <tr>
          <td style={{ paddingBottom: "10px" }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: "bold",
                color: "#71717a",
                textTransform: "uppercase",
              }}
            >
              Type / Level
            </span>
            <div style={{ marginTop: "2px" }}>
              <span style={{ fontSize: "12px", color: "#e4e4e7", marginRight: "10px" }}>
                {errorType}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: levelColor,
                  border: `1px solid ${levelColor}`,
                  borderRadius: "3px",
                  padding: "1px 4px",
                }}
              >
                {level}
              </span>
            </div>
          </td>
        </tr>
        <tr>
          <td>
            <span
              style={{
                fontSize: "10px",
                fontWeight: "bold",
                color: "#71717a",
                textTransform: "uppercase",
              }}
            >
              Message
            </span>
            <div
              style={{
                fontSize: "13px",
                color: "#f4f4f5",
                fontFamily: "monospace",
                marginTop: "2px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {message || "No message provided"}
            </div>
          </td>
        </tr>
      </table>

      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block",
          backgroundColor: "#059669",
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: "semibold",
          textDecoration: "none",
          padding: "12px 24px",
          borderRadius: "6px",
          textAlign: "center",
        }}
      >
        View Issue Details
      </a>
    </BaseLayout>
  );
}

interface RegressionEmailProps {
  projectName: string;
  issueTitle: string;
  errorType: string;
  level: string;
  targetUrl: string;
}

export function RegressionEmail({
  projectName,
  issueTitle,
  errorType,
  level,
  targetUrl,
}: RegressionEmailProps) {
  return (
    <BaseLayout
      title={`Regression Alert in ${projectName}`}
      previewText={`[Regression] ${issueTitle}`}
    >
      <h2
        style={{
          color: "#ffffff",
          fontSize: "20px",
          fontWeight: "bold",
          margin: "0 0 16px 0",
        }}
      >
        Regression Alert
      </h2>
      <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#a1a1aa", margin: "0 0 24px 0" }}>
        An issue previously marked as <strong>RESOLVED</strong> in project{" "}
        <strong>{projectName}</strong> has received a new event, causing it to transition back to{" "}
        <strong>REOPENED</strong>.
      </p>

      <table
        role="presentation"
        width="100%"
        cellPadding="0"
        cellSpacing="0"
        style={{
          backgroundColor: "#09090b",
          border: "1px solid #27272a",
          borderRadius: "8px",
          padding: "16px",
          margin: "0 0 24px 0",
        }}
      >
        <tr>
          <td style={{ paddingBottom: "10px" }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: "bold",
                color: "#71717a",
                textTransform: "uppercase",
              }}
            >
              Issue Title
            </span>
            <div
              style={{ fontSize: "14px", color: "#ffffff", marginTop: "2px", fontWeight: "bold" }}
            >
              {issueTitle}
            </div>
          </td>
        </tr>
        <tr>
          <td>
            <span
              style={{
                fontSize: "10px",
                fontWeight: "bold",
                color: "#71717a",
                textTransform: "uppercase",
              }}
            >
              Type / Level
            </span>
            <div style={{ marginTop: "2px" }}>
              <span style={{ fontSize: "12px", color: "#e4e4e7", marginRight: "10px" }}>
                {errorType}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: "#ef4444",
                  border: "1px solid #ef4444",
                  borderRadius: "3px",
                  padding: "1px 4px",
                  fontWeight: "bold",
                }}
              >
                {level}
              </span>
            </div>
          </td>
        </tr>
      </table>

      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block",
          backgroundColor: "#b91c1c",
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: "semibold",
          textDecoration: "none",
          padding: "12px 24px",
          borderRadius: "6px",
          textAlign: "center",
        }}
      >
        View Regressed Issue
      </a>
    </BaseLayout>
  );
}

interface SpikeEmailProps {
  projectName: string;
  ruleName: string;
  environmentName: string;
  thresholdCount: number;
  thresholdWindowSeconds: number;
  eventCount: number;
  targetUrl: string;
}

export function SpikeEmail({
  projectName,
  ruleName,
  environmentName,
  thresholdCount,
  thresholdWindowSeconds,
  eventCount,
  targetUrl,
}: SpikeEmailProps) {
  const windowMinutes = Math.round((thresholdWindowSeconds / 60) * 10) / 10;

  return (
    <BaseLayout
      title={`Spike Alert: ${ruleName}`}
      previewText={`[Spike Alert] ${projectName} - ${ruleName}`}
    >
      <h2
        style={{
          color: "#ffffff",
          fontSize: "20px",
          fontWeight: "bold",
          margin: "0 0 16px 0",
        }}
      >
        Error Spike Triggered
      </h2>
      <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#a1a1aa", margin: "0 0 24px 0" }}>
        An alert rule threshold has been crossed for project <strong>{projectName}</strong> in
        environment <strong>{environmentName}</strong>.
      </p>

      <table
        role="presentation"
        width="100%"
        cellPadding="0"
        cellSpacing="0"
        style={{
          backgroundColor: "#09090b",
          border: "1px solid #27272a",
          borderRadius: "8px",
          padding: "16px",
          margin: "0 0 24px 0",
        }}
      >
        <tr>
          <td style={{ paddingBottom: "10px" }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: "bold",
                color: "#71717a",
                textTransform: "uppercase",
              }}
            >
              Alert Rule
            </span>
            <div
              style={{ fontSize: "14px", color: "#ffffff", marginTop: "2px", fontWeight: "bold" }}
            >
              {ruleName}
            </div>
          </td>
        </tr>
        <tr>
          <td style={{ paddingBottom: "10px" }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: "bold",
                color: "#71717a",
                textTransform: "uppercase",
              }}
            >
              Threshold Conditions
            </span>
            <div style={{ fontSize: "13px", color: "#e4e4e7", marginTop: "2px" }}>
              &gt; {thresholdCount} events within {windowMinutes} minutes
            </div>
          </td>
        </tr>
        <tr>
          <td>
            <span
              style={{
                fontSize: "10px",
                fontWeight: "bold",
                color: "#71717a",
                textTransform: "uppercase",
              }}
            >
              Current Event Count
            </span>
            <div
              style={{ fontSize: "16px", color: "#f87171", marginTop: "2px", fontWeight: "bold" }}
            >
              {eventCount} events
            </div>
          </td>
        </tr>
      </table>

      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block",
          backgroundColor: "#d97706",
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: "semibold",
          textDecoration: "none",
          padding: "12px 24px",
          borderRadius: "6px",
          textAlign: "center",
        }}
      >
        View Project Dashboard
      </a>
    </BaseLayout>
  );
}
