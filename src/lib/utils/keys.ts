import crypto from "crypto";

export function generateApiKey(): {
  rawKey: string;
  keyPrefix: string;
  keySuffix: string;
  keyHash: string;
} {
  // Prefix: en_live_ followed by 32 random hex characters (16 bytes)
  const randomBytes = crypto.randomBytes(16).toString("hex");
  const rawKey = `en_live_${randomBytes}`;
  const keyPrefix = "en_live_";
  const keySuffix = rawKey.slice(-6); // last 6 characters (e.g. randomBytes suffix)
  const keyHash = hashApiKey(rawKey);

  return {
    rawKey,
    keyPrefix,
    keySuffix,
    keyHash,
  };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}
