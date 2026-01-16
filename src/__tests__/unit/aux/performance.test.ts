import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  measureSync,
  measureAsync,
  createTimer,
  debounce,
  throttle,
  retry,
  trackMetric,
  getMetricStats,
  clearMetrics,
  withMetrics,
} from '@/lib/utils/performance';

describe('Performance Utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearMetrics();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('measureSync', () => {
    it('should measure synchronous function execution', () => {
      const result = measureSync(() => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) sum += i;
        return sum;
      });

      expect(result.result).toBe(499500);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.startTime).toBeLessThanOrEqual(result.endTime);
    });

    it('should return correct result', () => {
      const result = measureSync(() => 'hello');
      expect(result.result).toBe('hello');
    });
  });

  describe('measureAsync', () => {
    it('should measure async function execution', async () => {
      vi.useRealTimers(); // Need real timers for async

      const result = await measureAsync(async () => {
        await new Promise((resolve) => setTimeout(resolve, 15));
        return 'done';
      });

      expect(result.result).toBe('done');
      // Use slightly lower threshold due to timer resolution variance
      expect(result.durationMs).toBeGreaterThanOrEqual(10);
    });
  });

  describe('createTimer', () => {
    it('should create and use a timer', () => {
      vi.useRealTimers();
      const timer = createTimer('test-timer');

      timer.start();
      // Simulate some work
      const elapsed = timer.stop();

      expect(elapsed).toBeGreaterThanOrEqual(0);
    });

    it('should track multiple laps', () => {
      vi.useRealTimers();
      const timer = createTimer('lap-timer');

      timer.start();
      timer.stop();
      timer.start();
      timer.stop();

      const stats = timer.stats();
      expect(stats.lapCount).toBe(2);
      expect(stats.totalDuration).toBeGreaterThanOrEqual(0);
    });

    it('should warn when starting already running timer', () => {
      const timer = createTimer('warn-timer');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      timer.start();
      timer.start(); // Should warn

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should reset timer stats', () => {
      vi.useRealTimers();
      const timer = createTimer('reset-timer');

      timer.start();
      timer.stop();
      timer.reset();

      const stats = timer.stats();
      expect(stats.lapCount).toBe(0);
      expect(stats.totalDuration).toBe(0);
    });

    it('should calculate average duration', () => {
      vi.useRealTimers();
      const timer = createTimer('avg-timer');

      timer.start();
      timer.stop();
      timer.start();
      timer.stop();

      const stats = timer.stats();
      expect(stats.averageDuration).toBe(Math.round(stats.totalDuration / stats.lapCount));
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to debounced function', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 50);

      debouncedFn('arg1', 'arg2');
      vi.advanceTimersByTime(50);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should reset timer on subsequent calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      vi.advanceTimersByTime(50);
      debouncedFn();
      vi.advanceTimersByTime(50);

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1);

      throttledFn();
      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttledFn();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should pass arguments to throttled function', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 50);

      throttledFn('first');
      expect(fn).toHaveBeenCalledWith('first');
    });
  });

  describe('retry', () => {
    it('should return result on first success', async () => {
      vi.useRealTimers();
      const fn = vi.fn().mockResolvedValue('success');

      const result = await retry(fn, { maxAttempts: 3 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      vi.useRealTimers();
      const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('success');

      const result = await retry(fn, {
        maxAttempts: 3,
        initialDelayMs: 10,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max attempts', async () => {
      vi.useRealTimers();
      const fn = vi.fn().mockRejectedValue(new Error('always fail'));

      await expect(retry(fn, { maxAttempts: 3, initialDelayMs: 10 })).rejects.toThrow(
        'always fail'
      );

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should respect shouldRetry callback', async () => {
      vi.useRealTimers();
      const fn = vi.fn().mockRejectedValue(new Error('permanent'));

      await expect(
        retry(fn, {
          maxAttempts: 5,
          shouldRetry: () => false,
        })
      ).rejects.toThrow('permanent');

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('trackMetric and getMetricStats', () => {
    it('should track metrics', () => {
      trackMetric('response_time', 100);
      trackMetric('response_time', 150);
      trackMetric('response_time', 200);

      const stats = getMetricStats('response_time');

      expect(stats).not.toBeNull();
      expect(stats?.count).toBe(3);
      expect(stats?.min).toBe(100);
      expect(stats?.max).toBe(200);
      expect(stats?.avg).toBe(150);
    });

    it('should return null for unknown metrics', () => {
      const stats = getMetricStats('unknown_metric');
      expect(stats).toBeNull();
    });

    it('should calculate percentiles', () => {
      for (let i = 1; i <= 100; i++) {
        trackMetric('percentile_test', i);
      }

      const stats = getMetricStats('percentile_test');

      // With Math.floor indexing: p50 = sorted[50] = 51, p95 = sorted[95] = 96, p99 = sorted[99] = 100
      expect(stats?.p50).toBe(51);
      expect(stats?.p95).toBe(96);
      expect(stats?.p99).toBe(100);
    });

    it('should filter by time window', () => {
      vi.useRealTimers();

      trackMetric('windowed', 100);

      const stats = getMetricStats('windowed', 60000); // 1 minute window
      expect(stats?.count).toBe(1);
    });
  });

  describe('clearMetrics', () => {
    it('should clear specific metric', () => {
      trackMetric('metric1', 100);
      trackMetric('metric2', 200);

      clearMetrics('metric1');

      expect(getMetricStats('metric1')).toBeNull();
      expect(getMetricStats('metric2')).not.toBeNull();
    });

    it('should clear all metrics', () => {
      trackMetric('metric1', 100);
      trackMetric('metric2', 200);

      clearMetrics();

      expect(getMetricStats('metric1')).toBeNull();
      expect(getMetricStats('metric2')).toBeNull();
    });
  });

  describe('withMetrics', () => {
    it('should track function execution time as metric', async () => {
      vi.useRealTimers();

      const result = await withMetrics('api_call', async () => {
        await new Promise((resolve) => setTimeout(resolve, 15));
        return 'result';
      });

      expect(result).toBe('result');

      const stats = getMetricStats('api_call');
      expect(stats).not.toBeNull();
      expect(stats?.count).toBe(1);
      // Use slightly lower threshold due to timer resolution variance
      expect(stats?.min).toBeGreaterThanOrEqual(10);
    });
  });
});
