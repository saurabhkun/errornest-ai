import crypto from "crypto";
import { db } from "@/lib/db/client";

/**
 * Normalizes volatile patterns (UUIDs, database IDs, timestamps, hashes, query strings) in a string.
 */
export function normalizeString(str: string): string {
  if (!str) return "";

  // 1. Normalize timestamps
  const isoTimestampRegex =
    /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?\b/g;
  let normalized = str.replace(isoTimestampRegex, "{timestamp}");

  const dateRegex = /\b\d{4}[-/]\d{2}[-/]\d{2}\b/g;
  normalized = normalized.replace(dateRegex, "{timestamp}");

  // 2. Normalize UUIDs
  const uuidRegex =
    /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g;
  normalized = normalized.replace(uuidRegex, "{uuid}");

  // 3. Normalize hashes (64-char, 40-char, 32-char hex strings)
  const sha256Regex = /\b[0-9a-fA-F]{64}\b/g;
  const sha1Regex = /\b[0-9a-fA-F]{40}\b/g;
  const md5Regex = /\b[0-9a-fA-F]{32}\b/g;
  normalized = normalized
    .replace(sha256Regex, "{hash}")
    .replace(sha1Regex, "{hash}")
    .replace(md5Regex, "{hash}");

  // 4. Normalize query strings in URLs
  const queryStringRegex =
    /\?[a-zA-Z0-9_.~%-]+=[a-zA-Z0-9_.~%-]+(?:&[a-zA-Z0-9_.~%-]+=[a-zA-Z0-9_.~%-]+)*/g;
  normalized = normalized.replace(queryStringRegex, "?{query}");

  // 5. Normalize IDs (5+ digit series)
  const idRegex = /\b\d{5,}\b/g;
  normalized = normalized.replace(idRegex, "{id}");

  // 6. Normalize general numbers (integers/decimals)
  const numberRegex = /\b\d+(?:\.\d+)?\b/g;
  normalized = normalized.replace(numberRegex, "{number}");

  return normalized;
}

interface StackFrame {
  fileName?: string;
  functionName?: string;
  lineNumber?: number;
  columnNumber?: number;
}

/**
 * Deterministically generates a fingerprint for an incoming event.
 */
export function generateFingerprint(
  projectId: string,
  errorType: string,
  message: string,
  frames: StackFrame[]
): string {
  const normType = (errorType || "Error").trim();
  const normMessage = normalizeString(message);

  // Filter application frames (in-app)
  let appFrames = (frames || []).filter((f) => {
    const file = (f.fileName || "").toLowerCase();
    return (
      file &&
      !file.includes("node_modules") &&
      !file.includes("next/dist") &&
      !file.includes("next/server") &&
      !file.includes("node:internal") &&
      !file.includes("webpack-internal")
    );
  });

  // Fallback to all frames if no in-app frames are present
  if (appFrames.length === 0) {
    appFrames = frames || [];
  }

  // Take first 5 frames
  const topFrames = appFrames.slice(0, 5);

  const frameParts = topFrames.map((f) => {
    const fn = normalizeString(f.functionName || "anonymous");
    const file = normalizeString(f.fileName || "unknown");
    return `${fn}:${file}`;
  });

  const combined = [projectId, normType, normMessage, ...frameParts].join("|");

  return crypto.createHash("sha256").update(combined).digest("hex");
}

/**
 * Core event grouping workflow. Finds or creates an issue, attaches the event,
 * updates counters, handles resolved regression reopening, and logs activity.
 */
export async function groupEvent(eventId: string): Promise<{
  issueId: string;
  isNewIssue: boolean;
  isRegression: boolean;
}> {
  const event = await db.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error(`Event ${eventId} not found`);
  }

  const frames = (event.normalizedFrames as unknown as StackFrame[]) || [];
  const fingerprint = generateFingerprint(event.projectId, event.errorType, event.message, frames);

  const normMessage = normalizeString(event.message);

  // Find existing issue in the same project with matching fingerprint
  const existingIssue = await db.issue.findUnique({
    where: {
      projectId_fingerprint: {
        projectId: event.projectId,
        fingerprint,
      },
    },
  });

  let issueId: string;
  let isNewIssue = false;
  let isRegression = false;

  if (existingIssue) {
    issueId = existingIssue.id;

    // Check if regression has occurred (reopening a resolved issue)
    const isResolved = existingIssue.status === "RESOLVED";
    isRegression = isResolved;
    const newStatus = isResolved ? "REOPENED" : existingIssue.status;

    // Calculate affected user increment
    let userIncrement = 0;
    if (event.userExternalId) {
      const alreadySeenUser = await db.event.findFirst({
        where: {
          issueId: existingIssue.id,
          userExternalId: event.userExternalId,
          id: { not: event.id }, // Exclude the current event
        },
        select: { id: true },
      });
      if (!alreadySeenUser) {
        userIncrement = 1;
      }
    }

    // Update existing issue
    await db.issue.update({
      where: { id: existingIssue.id },
      data: {
        occurrenceCount: { increment: 1 },
        affectedUserCount: { increment: userIncrement },
        lastSeenAt: event.clientSentAt ? new Date(event.clientSentAt) : new Date(),
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    if (isResolved) {
      // Create REOPENED activity entry
      await db.issueActivity.create({
        data: {
          issueId,
          type: "REOPENED",
          metadata: {
            triggerEventId: event.id,
            reason: "New matching event received for resolved issue",
          },
        },
      });
    }
  } else {
    // Create new issue
    const title = `${event.errorType}: ${event.message}`;
    const newIssue = await db.issue.create({
      data: {
        projectId: event.projectId,
        fingerprint,
        title: title.length > 255 ? title.substring(0, 252) + "..." : title,
        errorType: event.errorType,
        normalizedMessage: normMessage.length > 255 ? normMessage.substring(0, 255) : normMessage,
        status: "UNRESOLVED",
        level: event.level,
        firstSeenAt: event.clientSentAt ? new Date(event.clientSentAt) : new Date(),
        lastSeenAt: event.clientSentAt ? new Date(event.clientSentAt) : new Date(),
        occurrenceCount: 1,
        affectedUserCount: event.userExternalId ? 1 : 0,
        groupingConfidence: 1.0,
      },
    });

    issueId = newIssue.id;
    isNewIssue = true;

    // Create CREATED activity entry
    await db.issueActivity.create({
      data: {
        issueId,
        type: "CREATED",
        metadata: {
          creatorEventId: event.id,
        },
      },
    });
  }

  // Attach event to issue and mark processed
  await db.event.update({
    where: { id: event.id },
    data: {
      issueId,
      processedAt: new Date(),
      processingError: null,
    },
  });

  return { issueId, isNewIssue, isRegression };
}
