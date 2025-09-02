import log from "encore.dev/log";

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    log.info(`Cache set`, { key, ttl });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      log.info(`Cache expired and removed`, { key });
      return null;
    }

    log.info(`Cache hit`, { key });
    return item.data as T;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      log.info(`Cache deleted`, { key });
    }
    return deleted;
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    log.info(`Cache cleared`, { itemsRemoved: size });
  }

  // Generate cache key from endpoint and parameters
  generateKey(endpoint: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result: Record<string, any>, key) => {
        result[key] = params[key];
        return result;
      }, {});
    
    const paramString = JSON.stringify(sortedParams);
    return `${endpoint}:${Buffer.from(paramString).toString('base64')}`;
  }

  // Cleanup expired items periodically
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log.info(`Cache cleanup completed`, { itemsRemoved: cleaned });
    }
  }
}

export const cache = new MemoryCache();

// Run cleanup every 10 minutes
setInterval(() => {
  cache.cleanup();
}, 10 * 60 * 1000);
