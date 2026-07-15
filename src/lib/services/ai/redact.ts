/**
 * Best-effort PII / secret redaction before sending content to an LLM provider.
 * Patterns are additive; false positives are acceptable (safety > precision).
 */

interface RedactionResult {
  text: string;
  redacted: boolean;
}

const REDACT_PATTERNS: Array<{ name: string; pattern: RegExp; replacement: string }> = [
  {
    name: "email",
    pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    replacement: "[REDACTED_EMAIL]",
  },
  {
    name: "jwt",
    pattern: /\beyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*/g,
    replacement: "[REDACTED_JWT]",
  },
  {
    name: "bearer_token",
    pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
    replacement: "Bearer [REDACTED_TOKEN]",
  },
  {
    name: "api_key_header",
    pattern: /(api[-_]?key|token|secret|password|passwd|pwd|auth)\s*[:=]\s*["']?[\w\-./+=]{8,}["']?/gi,
    replacement: "$1=[REDACTED]",
  },
  {
    name: "credit_card",
    // Luhn-compatible patterns (4-16 digits with spaces/dashes)
    pattern: /\b(?:\d[ -]?){13,16}\b/g,
    replacement: "[REDACTED_CC]",
  },
  {
    name: "aws_access_key",
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    replacement: "[REDACTED_AWS_KEY]",
  },
  {
    name: "private_key_block",
    pattern: /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]+?-----END [A-Z ]+ PRIVATE KEY-----/g,
    replacement: "[REDACTED_PRIVATE_KEY]",
  },
  {
    name: "ipv4",
    // Only redact IPs that look like internal/private or that appear alongside sensitive keywords
    pattern: /\b(?:10|172\.(?:1[6-9]|2[0-9]|3[0-1])|192\.168)\.\d{1,3}\.\d{1,3}\b/g,
    replacement: "[REDACTED_IP]",
  },
];

export function redactSensitiveData(text: string): RedactionResult {
  let redacted = false;
  let result = text;

  for (const { pattern, replacement } of REDACT_PATTERNS) {
    // Create a fresh regex (avoid stateful lastIndex issues)
    const freshPattern = new RegExp(pattern.source, pattern.flags);
    const next = result.replace(freshPattern, () => {
      redacted = true;
      return replacement;
    });
    result = next;
  }

  return { text: result, redacted };
}

/**
 * Truncate a stack trace payload to a maximum character count.
 * Returns the truncated string and a flag indicating truncation occurred.
 */
export function truncateIfNeeded(
  text: string,
  maxChars = 8_000
): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  return {
    text: text.slice(0, maxChars) + "\n... [TRUNCATED — payload exceeded context limit]",
    truncated: true,
  };
}
