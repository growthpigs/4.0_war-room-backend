import { APIError } from "encore.dev/api";
import log from "encore.dev/log";

interface RateLimitOptions {
  attempts: number;
  windowMs: number;
}

// In-memory store for rate limiting. In a distributed environment, a shared store like Redis would be needed.
const ipRequestCounts = new Map<string, { count: number; windowStart: number; blockExpires?: number; blockDurationMs?: number }>();

/**
 * Applies rate limiting to a request based on IP address.
 * Throws an APIError.resourceExhausted if the rate limit is exceeded.
 * @param ip The IP address of the client.
 * @param options The rate limiting configuration.
 */
export function rateLimiter(ip: string, options: RateLimitOptions) {
  const now = Date.now();
  let record = ipRequestCounts.get(ip);

  // Check if IP is currently blocked
  if (record?.blockExpires && now < record.blockExpires) {
    const timeLeft = Math.ceil((record.blockExpires - now) / 1000);
    throw APIError.resourceExhausted(`Too many requests. Please try again in ${timeLeft} seconds.`, { retryAfter: `${timeLeft}s` });
  }

  if (!record || now > record.windowStart + options.windowMs) {
    // Start a new window, reset block duration if it existed
    record = { count: 1, windowStart: now, blockDurationMs: 60 * 1000 }; // Reset backoff to 1 minute
    ipRequestCounts.set(ip, record);
  } else {
    // Increment count within the current window
    record.count++;
    if (record.count > options.attempts) {
      // Block the IP with exponential backoff
      const blockDuration = record.blockDurationMs || 60 * 1000;
      record.blockExpires = now + blockDuration;
      record.blockDurationMs = blockDuration * 2; // Double for next time
      ipRequestCounts.set(ip, record);
      
      const timeLeft = Math.ceil(blockDuration / 1000);
      throw APIError.resourceExhausted(`Too many requests. Please try again in ${timeLeft} seconds.`, { retryAfter: `${timeLeft}s` });
    }
    ipRequestCounts.set(ip, record);
  }
}

// Periodically clean up old entries to prevent memory leaks.
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  for (const [ip, record] of ipRequestCounts.entries()) {
    // Clean up entries where the window and block have long expired
    const safeExpiry = (record.blockExpires || record.windowStart) + 60 * 60 * 1000; // 1 hour after last activity
    if (now > safeExpiry) {
      ipRequestCounts.delete(ip);
      cleanedCount++;
    }
  }
  if (cleanedCount > 0) {
    log.info(`Cleaned up ${cleanedCount} old rate limit entries.`);
  }
}, 15 * 60 * 1000); // Run every 15 minutes
