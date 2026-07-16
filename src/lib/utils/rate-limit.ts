import { redis } from "@/lib/redis";

// Memory-based rate limiter to support local/test environments out of the box
const rateLimitCache = new Map<string, number[]>();

export async function checkRateLimit(
  key: string,
  limit = 100,
  windowMs = 60000
): Promise<{ limited: boolean; retryAfter: number }> {
  if (redis) {
    try {
      const windowId = Math.floor(Date.now() / windowMs);
      const redisKey = `rate_limit:${key}:${windowId}`;

      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, Math.ceil(windowMs / 1000));
      }

      if (count > limit) {
        const nextWindowTime = (windowId + 1) * windowMs;
        const retryAfter = Math.max(1, Math.ceil((nextWindowTime - Date.now()) / 1000));
        return { limited: true, retryAfter };
      }

      return { limited: false, retryAfter: 0 };
    } catch (error) {
      console.error("Upstash Redis rate limit failed, falling back to memory:", error);
    }
  }

  // Fallback to memory-based rate limiting
  const now = Date.now();
  const timestamps = rateLimitCache.get(key) || [];

  // Filter timestamps to keep only those within the active sliding window
  const activeTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (activeTimestamps.length >= limit) {
    const oldest = activeTimestamps[0];
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
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
