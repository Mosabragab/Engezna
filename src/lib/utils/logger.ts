/**
 * Logger Utility - نظام تسجيل موحد
 *
 * يوفر logging متسق عبر التطبيق مع:
 * - مستويات مختلفة (debug, info, warn, error)
 * - تعطيل تلقائي في Production للـ debug logs
 * - دعم للـ structured logging
 * - ربط تلقائي مع Sentry للأخطاء
 */

import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  source?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const IS_SERVER = typeof window === 'undefined';

// Log levels that are enabled in production
const PRODUCTION_LOG_LEVELS: LogLevel[] = ['warn', 'error'];

// Map our log levels to Sentry severity levels
const SENTRY_LEVEL_MAP: Record<LogLevel, Sentry.SeverityLevel> = {
  debug: 'debug',
  info: 'info',
  warn: 'warning',
  error: 'error',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Formatting
// ═══════════════════════════════════════════════════════════════════════════════

function formatLogEntry(entry: LogEntry): string {
  const { message, source, context } = entry;
  const prefix = source ? `[${source}]` : '';
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `${prefix} ${message}${contextStr}`;
}

function getLogColor(level: LogLevel): string {
  switch (level) {
    case 'debug':
      return '\x1b[36m'; // Cyan
    case 'info':
      return '\x1b[32m'; // Green
    case 'warn':
      return '\x1b[33m'; // Yellow
    case 'error':
      return '\x1b[31m'; // Red
    default:
      return '\x1b[0m'; // Reset
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sentry Integration
// ═══════════════════════════════════════════════════════════════════════════════

function sendToSentry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  source?: string
): void {
  // Only send warnings and errors to Sentry in production
  if (IS_DEVELOPMENT) return;
  if (level !== 'warn' && level !== 'error') return;

  try {
    // Add breadcrumb for context
    Sentry.addBreadcrumb({
      category: source || 'logger',
      message: message,
      level: SENTRY_LEVEL_MAP[level],
      data: context,
    });

    // For errors, capture as an event
    if (level === 'error') {
      Sentry.captureMessage(message, {
        level: SENTRY_LEVEL_MAP[level],
        extra: context,
        tags: {
          source: source || 'unknown',
          logLevel: level,
        },
      });
    }
  } catch {
    // Silently fail if Sentry is not initialized
    // This prevents crashes in environments without Sentry
  }
}

/**
 * Capture an actual Error object to Sentry with full stack trace
 */
function captureErrorToSentry(error: Error, context?: LogContext, source?: string): void {
  if (IS_DEVELOPMENT) return;

  try {
    Sentry.captureException(error, {
      extra: context,
      tags: {
        source: source || 'unknown',
      },
    });
  } catch {
    // Silently fail if Sentry is not initialized
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Core Logger Function
// ═══════════════════════════════════════════════════════════════════════════════

function shouldLog(level: LogLevel): boolean {
  if (IS_DEVELOPMENT) return true;
  return PRODUCTION_LOG_LEVELS.includes(level);
}

function logInternal(
  level: LogLevel,
  message: string,
  context?: LogContext,
  source?: string
): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
    source,
  };

  const formattedMessage = formatLogEntry(entry);

  // Console logging
  if (IS_SERVER) {
    const color = getLogColor(level);
    const reset = '\x1b[0m';
    const levelUpper = level.toUpperCase().padEnd(5);

    switch (level) {
      case 'debug':
        console.debug(`${color}[${levelUpper}]${reset}`, formattedMessage);
        break;
      case 'info':
        console.info(`${color}[${levelUpper}]${reset}`, formattedMessage);
        break;
      case 'warn':
        console.warn(`${color}[${levelUpper}]${reset}`, formattedMessage);
        break;
      case 'error':
        console.error(`${color}[${levelUpper}]${reset}`, formattedMessage);
        break;
    }
  } else {
    // Client-side logging (browser)
    switch (level) {
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        break;
    }
  }

  // Send to Sentry (production only, warn/error only)
  sendToSentry(level, message, context, source);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Logger Factory - Creates scoped loggers
// ═══════════════════════════════════════════════════════════════════════════════

export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  /** Capture an Error object with full stack trace to Sentry */
  captureException: (error: Error, context?: LogContext) => void;
}

/**
 * Creates a scoped logger with a source identifier
 * @param source - Identifier for the log source (e.g., 'AdminLayout', 'FinancialService')
 */
export function createLogger(source: string): Logger {
  return {
    debug: (message: string, context?: LogContext) =>
      logInternal('debug', message, context, source),
    info: (message: string, context?: LogContext) => logInternal('info', message, context, source),
    warn: (message: string, context?: LogContext) => logInternal('warn', message, context, source),
    error: (message: string, context?: LogContext) =>
      logInternal('error', message, context, source),
    captureException: (error: Error, context?: LogContext) => {
      // Log locally
      logInternal('error', error.message, { ...context, stack: error.stack }, source);
      // Send to Sentry with full stack trace
      captureErrorToSentry(error, context, source);
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Default Logger Instance
// ═══════════════════════════════════════════════════════════════════════════════

export const logger: Logger = {
  debug: (message: string, context?: LogContext) => logInternal('debug', message, context),
  info: (message: string, context?: LogContext) => logInternal('info', message, context),
  warn: (message: string, context?: LogContext) => logInternal('warn', message, context),
  error: (message: string, context?: LogContext) => logInternal('error', message, context),
  captureException: (error: Error, context?: LogContext) => {
    logInternal('error', error.message, { ...context, stack: error.stack });
    captureErrorToSentry(error, context);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Safely logs an error with stack trace and sends to Sentry
 */
export function logError(error: unknown, message?: string, source?: string): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  logInternal(
    'error',
    message || errorMessage,
    {
      errorMessage,
      stack,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    },
    source
  );

  // If it's an actual Error object, capture with full stack trace
  if (error instanceof Error) {
    captureErrorToSentry(error, { customMessage: message }, source);
  }
}

/**
 * Performance logging utility
 */
export function logPerformance(operation: string, durationMs: number, source?: string): void {
  const level: LogLevel = durationMs > 1000 ? 'warn' : 'debug';
  logInternal(level, `${operation} completed`, { durationMs: Math.round(durationMs) }, source);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export types
// ═══════════════════════════════════════════════════════════════════════════════

export type { LogLevel, LogContext, LogEntry };
