import { db } from "@/lib/db/client";
import { describe, it, expect } from "vitest";

describe("Database Client Integration", () => {
  it("should initialize Prisma client", () => {
    expect(db).toBeDefined();
  });
});
