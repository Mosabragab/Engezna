/**
 * Performance Utilities
 *
 * Tools for measuring and tracking application performance.
 */

import { logger } from '@/lib/logger';

/**
 * Performance measurement result
 */
export interface PerformanceResult<T> {
  result: T;
  durationMs: number;
  startTime: number;
  endTime: number;
}

/**
 * Measure execution time of a synchronous function
 */
export function measureSync<T>(fn: () => T): PerformanceResult<T> {
  const startTime = performance.now();
  const result = fn();
  const endTime = performance.now();

  return {
    result,
    durationMs: Math.round(endTime - startTime),
    startTime,
    endTime,
  };
}

/**
 * Measure execution time of an async function
 */
export async function measureAsync<T>(fn: () => Promise<T>): Promise<PerformanceResult<T>> {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();

  return {
    result,
    durationMs: Math.round(endTime - startTime),
    startTime,
    endTime,
  };
}

/**
 * Create a timer that can be started and stopped
 */
export function createTimer(name: string) {
  let startTime: number | null = null;
  let totalDuration = 0;
  let lapCount = 0;

  return {
    /**
     * Start the timer
     */
    start(): void {
      if (startTime !== null) {
        logger.warn(`Timer '${name}' is already running`);
        return;
      }
      startTime = performance.now();
    },

    /**
     * Stop the timer and return elapsed time
     */
    stop(): number {
      if (startTime === null) {
        logger.warn(`Timer '${name}' was not started`);
        return 0;
      }
      const elapsed = performance.now() - startTime;
      totalDuration += elapsed;
      lapCount++;
      startTime = null;
      return Math.round(elapsed);
    },

    /**
     * Get current elapsed time without stopping
     */
    elapsed(): number {
      if (startTime === null) {
        return 0;
      }
      return Math.round(performance.now() - startTime);
    },

    /**
     * Reset the timer
     */
    reset(): void {
      startTime = null;
      totalDuration = 0;
      lapCount = 0;
    },

    /**
     * Get statistics
     */
    stats(): { totalDuration: number; lapCount: number; averageDuration: number } {
      return {
        totalDuration: Math.round(totalDuration),
        lapCount,
        averageDuration: lapCount > 0 ? Math.round(totalDuration / lapCount) : 0,
      };
    },
  };
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastRun = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = limitMs - (now - lastRun);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastRun = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastRun = Date.now();
        timeoutId = null;
        fn(...args);
      }, remaining);
    }
  };
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }

      const delay = Math.min(initialDelayMs * Math.pow(backoffMultiplier, attempt - 1), maxDelayMs);

      logger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`, {
        error: error instanceof Error ? error.message : String(error),
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Track metrics for monitoring
 */
interface MetricEntry {
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

const metricsStore = new Map<string, MetricEntry[]>();
const MAX_METRICS_PER_KEY = 1000;

/**
 * Record a metric
 */
export function trackMetric(name: string, value: number, tags?: Record<string, string>): void {
  if (!metricsStore.has(name)) {
    metricsStore.set(name, []);
  }

  const entries = metricsStore.get(name)!;
  entries.push({
    value,
    timestamp: Date.now(),
    tags,
  });

  // Keep only recent entries
  if (entries.length > MAX_METRICS_PER_KEY) {
    entries.splice(0, entries.length - MAX_METRICS_PER_KEY);
  }
}

/**
 * Get metric statistics
 */
export function getMetricStats(
  name: string,
  windowMs?: number
): {
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
} | null {
  const entries = metricsStore.get(name);
  if (!entries || entries.length === 0) {
    return null;
  }

  let values = entries.map((e) => e.value);

  // Filter by time window if specified
  if (windowMs) {
    const cutoff = Date.now() - windowMs;
    values = entries.filter((e) => e.timestamp >= cutoff).map((e) => e.value);
    if (values.length === 0) {
      return null;
    }
  }

  // Sort for percentile calculation
  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;

  return {
    count,
    min: sorted[0],
    max: sorted[count - 1],
    avg: Math.round(sorted.reduce((a, b) => a + b, 0) / count),
    p50: sorted[Math.floor(count * 0.5)],
    p95: sorted[Math.floor(count * 0.95)],
    p99: sorted[Math.floor(count * 0.99)],
  };
}

/**
 * Clear metrics
 */
export function clearMetrics(name?: string): void {
  if (name) {
    metricsStore.delete(name);
  } else {
    metricsStore.clear();
  }
}

/**
 * Wrapper to track function execution time as a metric
 */
export async function withMetrics<T>(
  metricName: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const { result, durationMs } = await measureAsync(fn);
  trackMetric(metricName, durationMs, tags);
  return result;
}
