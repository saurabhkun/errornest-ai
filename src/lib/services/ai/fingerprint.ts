import crypto from "crypto";

/**
 * Produce a deterministic SHA-256 fingerprint of the AI input payload.
 * Identical issue context → identical fingerprint → cache hit.
 */
export function buildInputFingerprint(params: {
  issueId: string;
  type: string;
  errorType: string;
  normalizedMessage: string;
  stackTrace: string;
}): string {
  const canonical = JSON.stringify({
    i: params.issueId,
    t: params.type,
    et: params.errorType,
    nm: params.normalizedMessage,
    st: params.stackTrace,
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}
