/**
 * Centralized Logger Service
 *
 * Provides structured logging with different levels and formats.
 * - Development: Pretty, colorful console output
 * - Production: JSON format for log aggregation
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  /** Request ID for tracing */
  requestId?: string;
  /** User ID if authenticated */
  userId?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * Logger interface - defined before implementation to avoid circular reference
 */
export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: unknown, context?: LogContext): void;
  child(baseContext: LogContext): Logger;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Log level priority (higher = more severe)
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Console colors for development
 */
const COLORS = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m', // Green
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m', // Red
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

/**
 * Get current log level from environment
 */
function getMinLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    return envLevel;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

/**
 * Check if we should use JSON format
 */
function shouldUseJsonFormat(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.LOG_FORMAT === 'json';
}

/**
 * Format timestamp
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format error for logging
 */
function formatError(error: unknown): LogEntry['error'] | undefined {
  if (!error) return undefined;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    };
  }

  return {
    name: 'UnknownError',
    message: String(error),
  };
}

/**
 * Format log entry as JSON
 */
function formatJson(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Format log entry for console (pretty)
 */
function formatPretty(entry: LogEntry): string {
  const color = COLORS[entry.level];
  const levelStr = entry.level.toUpperCase().padEnd(5);

  let output = `${COLORS.dim}${entry.timestamp}${COLORS.reset} `;
  output += `${color}${COLORS.bold}${levelStr}${COLORS.reset} `;
  output += entry.message;

  if (entry.context && Object.keys(entry.context).length > 0) {
    output += ` ${COLORS.dim}${JSON.stringify(entry.context)}${COLORS.reset}`;
  }

  if (entry.error) {
    output += `\n${color}  Error: ${entry.error.name}: ${entry.error.message}${COLORS.reset}`;
    if (entry.error.stack) {
      output += `\n${COLORS.dim}${entry.error.stack}${COLORS.reset}`;
    }
  }

  return output;
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: LogContext, error?: unknown): void {
  // Check if we should log this level
  const minLevel = getMinLogLevel();
  if (LOG_LEVELS[level] < LOG_LEVELS[minLevel]) {
    return;
  }

  const entry: LogEntry = {
    timestamp: formatTimestamp(),
    level,
    message,
    context: context && Object.keys(context).length > 0 ? context : undefined,
    error: formatError(error),
  };

  const formatted = shouldUseJsonFormat() ? formatJson(entry) : formatPretty(entry);

  // Use appropriate console method
  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'info':
      // eslint-disable-next-line no-console
      console.info(formatted);
      break;
    case 'debug':
    default:
      // eslint-disable-next-line no-console
      console.log(formatted);
  }
}

/**
 * Logger instance with all methods
 */
export const logger: Logger = {
  /**
   * Debug level - detailed information for debugging
   */
  debug(message: string, context?: LogContext): void {
    log('debug', message, context);
  },

  /**
   * Info level - general information about application flow
   */
  info(message: string, context?: LogContext): void {
    log('info', message, context);
  },

  /**
   * Warn level - potentially harmful situations
   */
  warn(message: string, context?: LogContext): void {
    log('warn', message, context);
  },

  /**
   * Error level - error events
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    log('error', message, context, error);
  },

  /**
   * Create a child logger with preset context
   */
  child(baseContext: LogContext): Logger {
    return {
      debug: (message: string, context?: LogContext) =>
        log('debug', message, { ...baseContext, ...context }),
      info: (message: string, context?: LogContext) =>
        log('info', message, { ...baseContext, ...context }),
      warn: (message: string, context?: LogContext) =>
        log('warn', message, { ...baseContext, ...context }),
      error: (message: string, error?: unknown, context?: LogContext) =>
        log('error', message, { ...baseContext, ...context }, error),
      child: (childContext: LogContext) => logger.child({ ...baseContext, ...childContext }),
    };
  },
};

/**
 * Create a request-scoped logger
 */
export function createRequestLogger(requestId: string, userId?: string): Logger {
  return logger.child({ requestId, userId });
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Measure and log execution time
 */
export async function logTimed<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = Math.round(performance.now() - start);
    logger.info(`${operation} completed`, { ...context, durationMs: duration });
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error(`${operation} failed`, error, { ...context, durationMs: duration });
    throw error;
  }
}

// Default export
export default logger;
