// Memory-based rate limiter to support local/test environments out of the box
const rateLimitCache = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit = 100,
  windowMs = 60000
): { limited: boolean; retryAfter: number } {
  const now = Date.now();
  const timestamps = rateLimitCache.get(key) || [];

  // Filter timestamps to keep only those within the active sliding window
  const activeTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (activeTimestamps.length >= limit) {
    const oldest = activeTimestamps[0];
    const retryAfter = Math.ceil((windowMs - (now - oldest)) / 1000);
    return { limited: true, retryAfter };
  }

  activeTimestamps.push(now);
  rateLimitCache.set(key, activeTimestamps);
  return { limited: false, retryAfter: 0 };
}

// Helper to clear limits (useful for testing)
export function resetRateLimits(): void {
  rateLimitCache.clear();
}
