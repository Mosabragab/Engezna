import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCache, cacheKey } from '@/lib/cache';

describe('Cache Service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createCache', () => {
    it('should create a cache instance', () => {
      const cache = createCache();
      expect(cache).toBeDefined();
      expect(typeof cache.get).toBe('function');
      expect(typeof cache.set).toBe('function');
    });

    it('should set and get values', () => {
      const cache = createCache();
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for missing keys', () => {
      const cache = createCache();
      expect(cache.get('missing')).toBeUndefined();
    });

    it('should check if key exists', () => {
      const cache = createCache();
      cache.set('exists', 'value');
      expect(cache.has('exists')).toBe(true);
      expect(cache.has('missing')).toBe(false);
    });

    it('should delete keys', () => {
      const cache = createCache();
      cache.set('key', 'value');
      expect(cache.delete('key')).toBe(true);
      expect(cache.get('key')).toBeUndefined();
    });

    it('should clear all entries', () => {
      const cache = createCache();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size()).toBe(0);
    });

    it('should return cache size', () => {
      const cache = createCache();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
    });

    it('should return all keys', () => {
      const cache = createCache();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.keys()).toEqual(['key1', 'key2']);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', () => {
      const cache = createCache({ ttlMs: 1000 });
      cache.set('key', 'value');

      expect(cache.get('key')).toBe('value');

      vi.advanceTimersByTime(1001);

      expect(cache.get('key')).toBeUndefined();
    });

    it('should support custom TTL per entry', () => {
      const cache = createCache({ ttlMs: 5000 });
      cache.set('short', 'value', 1000);
      cache.set('long', 'value', 10000);

      vi.advanceTimersByTime(2000);

      expect(cache.get('short')).toBeUndefined();
      expect(cache.get('long')).toBe('value');
    });

    it('should not expire entries with null TTL', () => {
      const cache = createCache({ ttlMs: null });
      cache.set('permanent', 'value');

      vi.advanceTimersByTime(100000);

      expect(cache.get('permanent')).toBe('value');
    });

    it('should update has() for expired entries', () => {
      const cache = createCache({ ttlMs: 1000 });
      cache.set('key', 'value');

      expect(cache.has('key')).toBe(true);

      vi.advanceTimersByTime(1001);

      expect(cache.has('key')).toBe(false);
    });
  });

  describe('LRU eviction', () => {
    it('should evict LRU entry when at capacity', () => {
      const cache = createCache({ maxSize: 3 });

      cache.set('a', 1);
      vi.advanceTimersByTime(10); // Advance time to differentiate timestamps
      cache.set('b', 2);
      vi.advanceTimersByTime(10);
      cache.set('c', 3);
      vi.advanceTimersByTime(10);

      // Access 'a' to make it recently used
      cache.get('a');
      vi.advanceTimersByTime(10);

      // Add new entry, should evict 'b' (least recently used)
      cache.set('d', 4);

      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('should call onEvict callback', () => {
      const onEvict = vi.fn();
      const cache = createCache({ maxSize: 2, onEvict });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3); // Should evict 'a'

      expect(onEvict).toHaveBeenCalledWith('a', 1);
    });
  });

  describe('stats', () => {
    it('should track hits and misses', () => {
      const cache = createCache();
      cache.set('key', 'value');

      cache.get('key'); // hit
      cache.get('key'); // hit
      cache.get('missing'); // miss

      const stats = cache.stats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3);
    });

    it('should track evictions', () => {
      const cache = createCache({ maxSize: 2 });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3); // evicts 'a'

      const stats = cache.stats();
      expect(stats.evictions).toBe(1);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      vi.useRealTimers();
      const cache = createCache<string>();
      cache.set('key', 'cached');

      const factory = vi.fn().mockResolvedValue('fresh');
      const result = await cache.getOrSet('key', factory);

      expect(result).toBe('cached');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result if not exists', async () => {
      vi.useRealTimers();
      const cache = createCache<string>();

      const factory = vi.fn().mockResolvedValue('fresh');
      const result = await cache.getOrSet('key', factory);

      expect(result).toBe('fresh');
      expect(factory).toHaveBeenCalledTimes(1);
      expect(cache.get('key')).toBe('fresh');
    });
  });

  describe('memoize', () => {
    it('should memoize function results', async () => {
      vi.useRealTimers();
      const cache = createCache<number>();
      const expensiveFn = vi.fn().mockImplementation(async (x: number) => x * 2);

      const memoized = cache.memoize(expensiveFn, (x) => `calc:${x}`);

      const result1 = await memoized(5);
      const result2 = await memoized(5);
      const result3 = await memoized(10);

      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(result3).toBe(20);
      expect(expensiveFn).toHaveBeenCalledTimes(2); // Only 2 calls, not 3
    });
  });

  describe('cacheKey helpers', () => {
    it('should generate user keys', () => {
      expect(cacheKey.user('123')).toBe('user:123');
      expect(cacheKey.user('123', 'profile')).toBe('user:123:profile');
    });

    it('should generate provider keys', () => {
      expect(cacheKey.provider('456')).toBe('provider:456');
      expect(cacheKey.provider('456', 'menu')).toBe('provider:456:menu');
    });

    it('should generate product keys', () => {
      expect(cacheKey.product('789')).toBe('product:789');
    });

    it('should generate order keys', () => {
      expect(cacheKey.order('ord-123')).toBe('order:ord-123');
    });

    it('should generate list keys', () => {
      expect(cacheKey.list('products', 1, 20)).toBe('list:products:1:20');
      expect(cacheKey.list('products', 1, 20, { category: 'food' })).toBe(
        'list:products:1:20:{"category":"food"}'
      );
    });

    it('should generate API keys', () => {
      expect(cacheKey.api('/api/users')).toBe('api:/api/users');
      expect(cacheKey.api('/api/users', { id: '123' })).toBe('api:/api/users:{"id":"123"}');
    });
  });

  describe('typed cache', () => {
    interface User {
      id: string;
      name: string;
    }

    it('should work with typed values', () => {
      const cache = createCache<User>();

      cache.set('user1', { id: '1', name: 'John' });
      const user = cache.get('user1');

      expect(user?.id).toBe('1');
      expect(user?.name).toBe('John');
    });
  });
});
