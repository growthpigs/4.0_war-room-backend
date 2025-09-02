import { APIError } from "encore.dev/api";
import log from "encore.dev/log";

interface RateLimitRecord {
  count: number;
  windowStart: number;
  blocked: boolean;
  blockExpires?: number;
}

const requestCounts = new Map<string, RateLimitRecord>();
const RATE_LIMIT = 100; // requests per minute
const WINDOW_MS = 60 * 1000; // 1 minute
const BLOCK_DURATION_MS = 60 * 1000; // 1 minute block

export function checkRateLimit(identifier: string = 'global'): void {
  const now = Date.now();
  let record = requestCounts.get(identifier);

  // Check if currently blocked
  if (record?.blocked && record.blockExpires && now < record.blockExpires) {
    const remainingSeconds = Math.ceil((record.blockExpires - now) / 1000);
    throw APIError.resourceExhausted(
      `Rate limit exceeded. Try again in ${remainingSeconds} seconds.`,
      { retryAfter: `${remainingSeconds}s` }
    );
  }

  // Reset window if expired or first request
  if (!record || now > record.windowStart + WINDOW_MS) {
    record = {
      count: 1,
      windowStart: now,
      blocked: false
    };
    requestCounts.set(identifier, record);
    return;
  }

  // Increment count
  record.count++;

  // Check if limit exceeded
  if (record.count > RATE_LIMIT) {
    record.blocked = true;
    record.blockExpires = now + BLOCK_DURATION_MS;
    requestCounts.set(identifier, record);
    
    log.warn(`Rate limit exceeded for ${identifier}`, {
      count: record.count,
      limit: RATE_LIMIT
    });

    throw APIError.resourceExhausted(
      "Rate limit exceeded. Try again in 60 seconds.",
      { retryAfter: "60s" }
    );
  }

  requestCounts.set(identifier, record);
}

// Cleanup old records every 5 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, record] of requestCounts.entries()) {
    const isExpired = now > record.windowStart + WINDOW_MS;
    const isUnblocked = !record.blocked || (record.blockExpires && now > record.blockExpires);
    
    if (isExpired && isUnblocked) {
      requestCounts.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    log.info(`Cleaned up ${cleaned} old rate limit records`);
  }
}, 5 * 60 * 1000);
