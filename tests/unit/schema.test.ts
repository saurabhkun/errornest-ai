import { db } from "@/lib/db/client";
import { describe, it, expect } from "vitest";

describe("Prisma Schema Model Verification", () => {
  it("should have all architectural models defined on the database client", () => {
    expect(db.user).toBeDefined();
    expect(db.oAuthAccount).toBeDefined();
    expect(db.session).toBeDefined();
    expect(db.verificationToken).toBeDefined();
    expect(db.organization).toBeDefined();
    expect(db.membership).toBeDefined();
    expect(db.invite).toBeDefined();
    expect(db.project).toBeDefined();
    expect(db.apiKey).toBeDefined();
    expect(db.environment).toBeDefined();
    expect(db.release).toBeDefined();
    expect(db.issue).toBeDefined();
    expect(db.event).toBeDefined();
    expect(db.issueComment).toBeDefined();
    expect(db.commentMention).toBeDefined();
    expect(db.issueActivity).toBeDefined();
    expect(db.alertRule).toBeDefined();
    expect(db.alertOccurrence).toBeDefined();
    expect(db.notification).toBeDefined();
    expect(db.notificationPreference).toBeDefined();
    expect(db.aiResult).toBeDefined();
    expect(db.auditLog).toBeDefined();
    expect(db.analyticsHourly).toBeDefined();
  });
});
