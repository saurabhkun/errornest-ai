import { describe, it, expect } from "vitest";
import { generateApiKey, hashApiKey } from "@/lib/utils/keys";
import crypto from "crypto";

describe("API Key Utilities", () => {
  it("should generate a valid key structure", () => {
    const keyData = generateApiKey();

    expect(keyData.rawKey).toBeDefined();
    expect(keyData.rawKey.startsWith("en_live_")).toBe(true);
    expect(keyData.keyPrefix).toBe("en_live_");
    expect(keyData.keySuffix).toHaveLength(6);
    expect(keyData.keyHash).toBeDefined();
    expect(keyData.keyHash).toHaveLength(64); // SHA-256 hex string length
  });

  it("should hash the API key consistently", () => {
    const testKey = "en_live_abc123xyz789";
    const hash1 = hashApiKey(testKey);
    const hash2 = hashApiKey(testKey);

    expect(hash1).toBe(hash2);
    expect(hash1).toBe(crypto.createHash("sha256").update(testKey).digest("hex"));
  });

  it("should generate unique API keys each invocation", () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();

    expect(key1.rawKey).not.toBe(key2.rawKey);
    expect(key1.keyHash).not.toBe(key2.keyHash);
  });
});
