import {
  PrismaClient,
  MembershipRole,
  MembershipStatus,
  ProjectStatus,
  IssueStatus,
  EventLevel,
  AlertType,
  NotificationType,
  AiResultType,
  Issue,
  Event,
} from "@prisma/client";

import { PrismaNeon } from "@prisma/adapter-neon";

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/errornest?sslmode=disable";
const adapter = new PrismaNeon({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Clean existing data (in reverse dependency order)
  console.log("🧹 Clearing existing data...");
  await prisma.analyticsHourly.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.aiResult.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.alertOccurrence.deleteMany();
  await prisma.alertRule.deleteMany();
  await prisma.issueActivity.deleteMany();
  await prisma.commentMention.deleteMany();
  await prisma.issueComment.deleteMany();
  await prisma.event.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.release.deleteMany();
  await prisma.environment.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.project.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Demo User (Owner)
  console.log("👤 Creating Demo User...");
  const demoUser = await prisma.user.create({
    data: {
      email: "owner@example.com",
      displayName: "Demo Owner",
      passwordHash: "$2b$10$EpY9g7x8Y4F4u9fWvDkK1uO8w3G/2/u76R2L9.p2Q2M2o0BvRkYyK", // dummy hash
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=owner",
      emailVerifiedAt: new Date(),
    },
  });

  // 3. Create Demo Organization
  console.log("🏢 Creating Demo Organization...");
  const demoOrg = await prisma.organization.create({
    data: {
      name: "Demo Corporation",
      slug: "demo-corp",
    },
  });

  // 4. Create Owner Membership
  console.log("📋 Creating Membership...");
  await prisma.membership.create({
    data: {
      organizationId: demoOrg.id,
      userId: demoUser.id,
      role: MembershipRole.OWNER,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
    },
  });

  // 5. Create Demo Projects (Frontend and Backend)
  console.log("📁 Creating Projects...");
  const projectFrontend = await prisma.project.create({
    data: {
      organizationId: demoOrg.id,
      name: "Frontend React App",
      slug: "frontend-react",
      platform: "react",
      status: ProjectStatus.ACTIVE,
    },
  });

  const projectBackend = await prisma.project.create({
    data: {
      organizationId: demoOrg.id,
      name: "Backend Node Service",
      slug: "backend-node",
      platform: "node",
      status: ProjectStatus.ACTIVE,
    },
  });

  // 6. Create Environments for Projects (Production and Staging)
  console.log("🌐 Creating Environments...");
  const envProdFront = await prisma.environment.create({
    data: { projectId: projectFrontend.id, name: "production" },
  });
  const envStgFront = await prisma.environment.create({
    data: { projectId: projectFrontend.id, name: "staging" },
  });

  const envProdBack = await prisma.environment.create({
    data: { projectId: projectBackend.id, name: "production" },
  });
  const envStgBack = await prisma.environment.create({
    data: { projectId: projectBackend.id, name: "staging" },
  });

  // 7. Create Releases for Projects
  console.log("📦 Creating Releases...");
  const releaseFront1 = await prisma.release.create({
    data: {
      projectId: projectFrontend.id,
      version: "v1.0.0",
      commitSha: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
      deployedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      createdByUserId: demoUser.id,
    },
  });

  const releaseFront2 = await prisma.release.create({
    data: {
      projectId: projectFrontend.id,
      version: "v1.1.0",
      commitSha: "z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0",
      deployedAt: new Date(),
      createdByUserId: demoUser.id,
    },
  });

  const releaseBack1 = await prisma.release.create({
    data: {
      projectId: projectBackend.id,
      version: "v2.0.0",
      commitSha: "11223344556677889900aabbccddeeff00112233",
      deployedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      createdByUserId: demoUser.id,
    },
  });

  // 8. Create Demo API Key
  console.log("🔑 Creating API Key...");
  await prisma.apiKey.create({
    data: {
      projectId: projectFrontend.id,
      name: "Default Ingestion Key",
      keyPrefix: "en_live_",
      keySuffix: "8x9y0z",
      keyHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", // dummy key hash
      createdByUserId: demoUser.id,
    },
  });

  // 9. Create 15-25 Demo Issues
  console.log("🐛 Creating Issues...");
  const issueData = [
    {
      title: "TypeError: Cannot read properties of undefined (reading 'map')",
      errorType: "TypeError",
      normalizedMessage: "Cannot read properties of undefined (reading 'map')",
      level: EventLevel.ERROR,
      fingerprint: "frontend-react:typeerror:map",
    },
    {
      title: "ReferenceError: process is not defined",
      errorType: "ReferenceError",
      normalizedMessage: "process is not defined",
      level: EventLevel.ERROR,
      fingerprint: "frontend-react:referenceerror:process",
    },
    {
      title: "NetworkError: Failed to fetch API resource",
      errorType: "NetworkError",
      normalizedMessage: "Failed to fetch API resource",
      level: EventLevel.ERROR,
      fingerprint: "frontend-react:networkerror:fetch",
    },
    {
      title: "RangeError: Maximum call stack size exceeded",
      errorType: "RangeError",
      normalizedMessage: "Maximum call stack size exceeded",
      level: EventLevel.FATAL,
      fingerprint: "frontend-react:rangeerror:stack",
    },
    {
      title: "SyntaxError: Unexpected token < in JSON at position 0",
      errorType: "SyntaxError",
      normalizedMessage: "Unexpected token < in JSON at position 0",
      level: EventLevel.ERROR,
      fingerprint: "frontend-react:syntaxerror:json",
    },
    {
      title: "Error: Render methods should be pure functions",
      errorType: "Error",
      normalizedMessage: "Render methods should be pure functions",
      level: EventLevel.WARNING,
      fingerprint: "frontend-react:error:pure",
    },
    {
      title: "URIError: URI malformed",
      errorType: "URIError",
      normalizedMessage: "URI malformed",
      level: EventLevel.ERROR,
      fingerprint: "frontend-react:urierror:malformed",
    },
    {
      title: "Database connection timeout after 5000ms",
      errorType: "TimeoutError",
      normalizedMessage: "Database connection timeout after 5000ms",
      level: EventLevel.FATAL,
      fingerprint: "backend-node:timeouterror:db",
    },
    {
      title: "Error: JWT expired",
      errorType: "JsonWebTokenError",
      normalizedMessage: "JWT expired",
      level: EventLevel.WARNING,
      fingerprint: "backend-node:jwterror:expired",
    },
    {
      title: "Error: Out of memory",
      errorType: "OutOfMemoryError",
      normalizedMessage: "Out of memory",
      level: EventLevel.FATAL,
      fingerprint: "backend-node:oom",
    },
    {
      title: "Error: Permission denied on table users",
      errorType: "PostgresError",
      normalizedMessage: "Permission denied on table users",
      level: EventLevel.ERROR,
      fingerprint: "backend-node:pgerror:permission",
    },
    {
      title: "Error: EADDRINUSE: address already in use :::3000",
      errorType: "SystemError",
      normalizedMessage: "EADDRINUSE: address already in use :::3000",
      level: EventLevel.ERROR,
      fingerprint: "backend-node:systemerror:eaddrinuse",
    },
    {
      title: "Error: ECONNREFUSED 127.0.0.1:6379",
      errorType: "RedisError",
      normalizedMessage: "ECONNREFUSED 127.0.0.1:6379",
      level: EventLevel.ERROR,
      fingerprint: "backend-node:rediserror:econnrefused",
    },
    {
      title: "Error: Invalid API Key provided",
      errorType: "AuthError",
      normalizedMessage: "Invalid API Key provided",
      level: EventLevel.INFO,
      fingerprint: "backend-node:autherror:invalidkey",
    },
    {
      title: "Error: Failed to write to disk /var/log/errornest.log",
      errorType: "FileSystemError",
      normalizedMessage: "Failed to write to disk",
      level: EventLevel.WARNING,
      fingerprint: "backend-node:fserror:write",
    },
  ];

  const issues: Issue[] = [];
  for (let i = 0; i < issueData.length; i++) {
    const data = issueData[i];
    const isFrontend = data.fingerprint.startsWith("frontend-react");
    const projId = isFrontend ? projectFrontend.id : projectBackend.id;
    const issue = await prisma.issue.create({
      data: {
        projectId: projId,
        fingerprint: data.fingerprint,
        title: data.title,
        errorType: data.errorType,
        normalizedMessage: data.normalizedMessage,
        status: IssueStatus.UNRESOLVED,
        level: data.level,
        firstSeenAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        lastSeenAt: new Date(),
        occurrenceCount: 0, // Will be updated by events
        affectedUserCount: 0,
        groupingConfidence: 0.95,
      },
    });
    issues.push(issue);
  }

  // 10. Create 200+ Demo Events
  console.log("📊 Creating 200+ Events...");
  const eventPromises: Promise<Event>[] = [];
  const environments = [
    { front: envProdFront, back: envProdBack },
    { front: envStgFront, back: envStgBack },
  ];

  for (let j = 0; j < 220; j++) {
    // Pick a random issue
    const issueIndex = j % issues.length;
    const issue = issues[issueIndex];
    const isFrontend = issue.fingerprint.startsWith("frontend-react");
    const projId = isFrontend ? projectFrontend.id : projectBackend.id;

    // Pick environment
    const envObj = environments[j % environments.length];
    const envId = isFrontend ? envObj.front.id : envObj.back.id;

    // Pick release
    let releaseId: string | null = null;
    if (isFrontend) {
      releaseId = j % 3 === 0 ? releaseFront1.id : releaseFront2.id;
    } else {
      releaseId = j % 3 === 0 ? releaseBack1.id : null;
    }

    const level = issue.level;

    const event = prisma.event.create({
      data: {
        projectId: projId,
        issueId: issue.id,
        environmentId: envId,
        releaseId: releaseId,
        idempotencyKey: `idempotency_${j}_${Date.now()}`,
        message: issue.title,
        errorType: issue.errorType,
        level: level,
        rawStackTrace: `Error: ${issue.title}\n    at render (src/components/dashboard.tsx:24:12)\n    at Object.fn (src/app/page.tsx:10:5)`,
        normalizedFrames: JSON.stringify([
          { file: "src/components/dashboard.tsx", line: 24, function: "render" },
          { file: "src/app/page.tsx", line: 10, function: "fn" },
        ]),
        userExternalId: `user_${j % 15}`,
        userContext: JSON.stringify({
          id: `user_${j % 15}`,
          email: `user_${j % 15}@example.com`,
          ip: `192.168.1.${j % 254}`,
        }),
        tags: JSON.stringify({
          browser: j % 2 === 0 ? "Chrome" : "Firefox",
          os: j % 2 === 0 ? "Windows" : "MacOS",
          device: j % 3 === 0 ? "Desktop" : (j % 3 === 1 ? "Mobile" : "Tablet"),
        }),
        rawPayload: JSON.stringify({
          originalError: issue.title,
          stackTrace: "...",
        }),
        payloadTruncated: false,
        clientSentAt: new Date(Date.now() - j * 15 * 60 * 1000),
        serverReceivedAt: new Date(Date.now() - j * 15 * 60 * 1000),
        processedAt: new Date(),
      },
    });

    eventPromises.push(event);
  }

  await Promise.all(eventPromises);

  // 10b. Aggregate seed events into AnalyticsHourly
  console.log("🌱 Aggregating seed events into AnalyticsHourly...");
  const seededEvents = await prisma.event.findMany({});
  const rollupsMap = new Map<string, {
    projectId: string;
    environmentId: string;
    releaseId: string | null;
    bucketStart: Date;
    eventCount: number;
    newIssueCount: number;
    reopenedIssueCount: number;
    affectedUsers: Set<string>;
  }>();

  for (const ev of seededEvents) {
    const bucketStart = new Date(ev.createdAt || ev.serverReceivedAt);
    bucketStart.setUTCMinutes(0, 0, 0);
    bucketStart.setUTCMilliseconds(0);

    const key = `${ev.projectId}_${ev.environmentId}_${ev.releaseId || "null"}_${bucketStart.getTime()}`;

    if (!rollupsMap.has(key)) {
      rollupsMap.set(key, {
        projectId: ev.projectId,
        environmentId: ev.environmentId,
        releaseId: ev.releaseId,
        bucketStart,
        eventCount: 0,
        newIssueCount: 0,
        reopenedIssueCount: 0,
        affectedUsers: new Set<string>(),
      });
    }

    const rollup = rollupsMap.get(key)!;
    rollup.eventCount += 1;

    // Simulate some new and reopened issues
    if (Math.random() < 0.1) rollup.newIssueCount += 1;
    if (Math.random() < 0.05) rollup.reopenedIssueCount += 1;

    if (ev.userExternalId) {
      rollup.affectedUsers.add(ev.userExternalId);
    }
  }

  for (const rollup of rollupsMap.values()) {
    await prisma.analyticsHourly.create({
      data: {
        projectId: rollup.projectId,
        environmentId: rollup.environmentId,
        releaseId: rollup.releaseId,
        bucketStart: rollup.bucketStart,
        eventCount: rollup.eventCount,
        newIssueCount: rollup.newIssueCount,
        reopenedIssueCount: rollup.reopenedIssueCount,
        affectedUserCount: rollup.affectedUsers.size,
      },
    });
  }


  // Update Occurrence counts and affected user counts in issues
  console.log("📈 Updating issue summary metrics...");
  for (const issue of issues) {
    const count = await prisma.event.count({ where: { issueId: issue.id } });
    const userCountResult = await prisma.event.groupBy({
      by: ["userExternalId"],
      where: { issueId: issue.id, userExternalId: { not: null } },
    });
    await prisma.issue.update({
      where: { id: issue.id },
      data: {
        occurrenceCount: count,
        affectedUserCount: userCountResult.length,
      },
    });
  }

  // 11. Create Sample AI Explanations
  console.log("🤖 Creating AI Results...");
  for (let k = 0; k < 5; k++) {
    await prisma.aiResult.create({
      data: {
        issueId: issues[k].id,
        type: AiResultType.EXPLANATION,
        inputFingerprint: issues[k].fingerprint,
        model: "gemini-2.5-flash",
        content: `### Diagnostics for ${issues[k].errorType}\n\nThis issue occurs when attempting to read the \`map\` property of an undefined object. Check if data is null or undefined before rendering it.`,
        requestedByUserId: demoUser.id,
      },
    });
  }

  // 12. Create Alert Rules
  console.log("🔔 Creating Alert Rules...");
  await prisma.alertRule.create({
    data: {
      projectId: projectFrontend.id,
      name: "New Issue Alert",
      type: AlertType.NEW_ISSUE,
      environmentId: envProdFront.id,
      cooldownSeconds: 3600,
      createdByUserId: demoUser.id,
      isActive: true,
    },
  });

  // 13. Create Notifications
  console.log("💌 Creating Notifications...");
  await prisma.notification.create({
    data: {
      userId: demoUser.id,
      organizationId: demoOrg.id,
      type: NotificationType.ALERT,
      title: "New Spike in Frontend React App",
      body: "TypeError occurrences have spiked in the last 15 minutes.",
      targetUrl: `/organizations/${demoOrg.slug}/projects/${projectFrontend.slug}/issues`,
      payload: JSON.stringify({ issueCount: 25 }),
    },
  });

  console.log("🎉 Database seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
