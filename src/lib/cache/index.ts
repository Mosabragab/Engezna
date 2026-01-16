/**
 * In-Memory Cache Service
 *
 * Simple, lightweight caching with TTL support.
 * For production at scale, consider Redis or Upstash.
 */

import { logger } from '@/lib/logger';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number | null; // null = no expiration
  createdAt: number;
  accessCount: number;
  lastAccessedAt: number;
}

/**
 * Cache options
 */
export interface CacheOptions {
  /** Time to live in milliseconds (null = no expiration) */
  ttlMs?: number | null;
  /** Maximum number of entries (0 = unlimited) */
  maxSize?: number;
  /** Callback when entry is evicted */
  onEvict?: (key: string, value: unknown) => void;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
}

/**
 * Create a new cache instance
 */
export function createCache<T = unknown>(options: CacheOptions = {}) {
  const { ttlMs = null, maxSize = 1000, onEvict } = options;

  const store = new Map<string, CacheEntry<T>>();
  let hits = 0;
  let misses = 0;
  let evictions = 0;

  /**
   * Clean up expired entries
   */
  function cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt !== null && now > entry.expiresAt) {
        store.delete(key);
        evictions++;
        onEvict?.(key, entry.value);
      }
    }
  }

  /**
   * Evict least recently used entry if at capacity
   */
  function evictLRU(): void {
    if (maxSize <= 0 || store.size < maxSize) {
      return;
    }

    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of store.entries()) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = store.get(oldestKey);
      store.delete(oldestKey);
      evictions++;
      if (entry) {
        onEvict?.(oldestKey, entry.value);
      }
    }
  }

  return {
    /**
     * Get a value from cache
     */
    get(key: string): T | undefined {
      const entry = store.get(key);

      if (!entry) {
        misses++;
        return undefined;
      }

      // Check if expired
      if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
        store.delete(key);
        evictions++;
        onEvict?.(key, entry.value);
        misses++;
        return undefined;
      }

      // Update access stats
      entry.accessCount++;
      entry.lastAccessedAt = Date.now();
      hits++;

      return entry.value;
    },

    /**
     * Set a value in cache
     */
    set(key: string, value: T, customTtlMs?: number | null): void {
      // Evict if at capacity
      evictLRU();

      const now = Date.now();
      const entryTtl = customTtlMs !== undefined ? customTtlMs : ttlMs;

      store.set(key, {
        value,
        expiresAt: entryTtl !== null ? now + entryTtl : null,
        createdAt: now,
        accessCount: 0,
        lastAccessedAt: now,
      });
    },

    /**
     * Check if key exists (and is not expired)
     */
    has(key: string): boolean {
      const entry = store.get(key);
      if (!entry) {
        return false;
      }
      if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
        store.delete(key);
        evictions++;
        onEvict?.(key, entry.value);
        return false;
      }
      return true;
    },

    /**
     * Delete a key from cache
     */
    delete(key: string): boolean {
      const entry = store.get(key);
      const deleted = store.delete(key);
      if (deleted && entry) {
        onEvict?.(key, entry.value);
      }
      return deleted;
    },

    /**
     * Clear all entries
     */
    clear(): void {
      if (onEvict) {
        for (const [key, entry] of store.entries()) {
          onEvict(key, entry.value);
        }
      }
      store.clear();
    },

    /**
     * Get cache statistics
     */
    stats(): CacheStats {
      cleanup(); // Clean expired entries first
      const total = hits + misses;
      return {
        size: store.size,
        hits,
        misses,
        hitRate: total > 0 ? hits / total : 0,
        evictions,
      };
    },

    /**
     * Get all keys
     */
    keys(): string[] {
      cleanup();
      return Array.from(store.keys());
    },

    /**
     * Get cache size
     */
    size(): number {
      return store.size;
    },

    /**
     * Get or set pattern - returns cached value or computes and caches it
     */
    async getOrSet(
      key: string,
      factory: () => Promise<T>,
      customTtlMs?: number | null
    ): Promise<T> {
      const cached = this.get(key);
      if (cached !== undefined) {
        return cached;
      }

      const value = await factory();
      this.set(key, value, customTtlMs);
      return value;
    },

    /**
     * Memoize a function
     */
    memoize<Args extends unknown[], R extends T>(
      fn: (...args: Args) => Promise<R>,
      keyGenerator: (...args: Args) => string,
      customTtlMs?: number | null
    ): (...args: Args) => Promise<R> {
      return async (...args: Args): Promise<R> => {
        const key = keyGenerator(...args);
        const cached = this.get(key);
        if (cached !== undefined) {
          return cached as R;
        }

        const value = await fn(...args);
        this.set(key, value, customTtlMs);
        return value;
      };
    },
  };
}

/**
 * Default application cache instance
 */
export const appCache = createCache({
  ttlMs: 5 * 60 * 1000, // 5 minutes default TTL
  maxSize: 1000,
  onEvict: (key) => {
    logger.debug(`Cache evicted: ${key}`);
  },
});

/**
 * Short-lived cache for request deduplication
 */
export const requestCache = createCache({
  ttlMs: 10 * 1000, // 10 seconds
  maxSize: 500,
});

/**
 * Long-lived cache for static data
 */
export const staticCache = createCache({
  ttlMs: 60 * 60 * 1000, // 1 hour
  maxSize: 200,
});

/**
 * Cache key generator helpers
 */
export const cacheKey = {
  /**
   * Generate cache key for user data
   */
  user: (userId: string, resource?: string) =>
    resource ? `user:${userId}:${resource}` : `user:${userId}`,

  /**
   * Generate cache key for provider data
   */
  provider: (providerId: string, resource?: string) =>
    resource ? `provider:${providerId}:${resource}` : `provider:${providerId}`,

  /**
   * Generate cache key for product data
   */
  product: (productId: string) => `product:${productId}`,

  /**
   * Generate cache key for order data
   */
  order: (orderId: string) => `order:${orderId}`,

  /**
   * Generate cache key for list data with pagination
   */
  list: (entity: string, page: number, limit: number, filters?: Record<string, unknown>) =>
    `list:${entity}:${page}:${limit}${filters ? `:${JSON.stringify(filters)}` : ''}`,

  /**
   * Generate cache key for API response
   */
  api: (endpoint: string, params?: Record<string, unknown>) =>
    `api:${endpoint}${params ? `:${JSON.stringify(params)}` : ''}`,
};

export type Cache<T = unknown> = ReturnType<typeof createCache<T>>;
