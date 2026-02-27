/**
 * Slack Alerting Service
 *
 * Sends critical alerts to Slack webhook when errors occur in production.
 * Provides real-time visibility into system health without requiring
 * manual monitoring of Sentry/Vercel dashboards.
 *
 * Features:
 * - Deduplication: Same error only alerts once per 5 minutes
 * - Severity levels: critical, high, medium, low
 * - Rate limiting: Max 30 alerts per minute to prevent Slack flooding
 * - Graceful degradation: Never throws — alerting failure doesn't break the app
 *
 * @see docs/ENGINEERING_DESIGN_AUDIT_2026.md - Item #17
 */

import { logger } from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AlertPayload {
  /** Alert title — short summary of the issue */
  title: string;
  /** Detailed description */
  description: string;
  /** Severity level */
  severity: AlertSeverity;
  /** Source component/route where the error occurred */
  source: string;
  /** Optional error object for stack trace */
  error?: Error | unknown;
  /** Additional metadata (user ID, request path, etc.) */
  metadata?: Record<string, string | number | boolean | null>;
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: Array<{ type: string; text: string; emoji?: boolean }>;
  fields?: Array<{ type: string; text: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const SLACK_WEBHOOK_URL = process.env.SLACK_ALERT_WEBHOOK_URL;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const APP_NAME = 'Engezna';
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.engezna.com';

/** Deduplication window — same error key only alerts once per window */
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/** Rate limit — max alerts per minute */
const MAX_ALERTS_PER_MINUTE = 30;

// ═══════════════════════════════════════════════════════════════════════════════
// Deduplication & Rate Limiting (in-memory, per-instance)
// ═══════════════════════════════════════════════════════════════════════════════

const recentAlerts = new Map<string, number>();
let alertCountThisMinute = 0;
let currentMinute = 0;

function getDedupKey(payload: AlertPayload): string {
  return `${payload.severity}:${payload.source}:${payload.title}`;
}

function isDuplicate(key: string): boolean {
  const lastSent = recentAlerts.get(key);
  if (!lastSent) return false;
  return Date.now() - lastSent < DEDUP_WINDOW_MS;
}

function isRateLimited(): boolean {
  const now = Math.floor(Date.now() / 60000);
  if (now !== currentMinute) {
    currentMinute = now;
    alertCountThisMinute = 0;
  }
  return alertCountThisMinute >= MAX_ALERTS_PER_MINUTE;
}

function recordAlert(key: string): void {
  recentAlerts.set(key, Date.now());
  alertCountThisMinute++;

  // Cleanup old entries periodically
  if (recentAlerts.size > 200) {
    const cutoff = Date.now() - DEDUP_WINDOW_MS;
    for (const [k, v] of recentAlerts) {
      if (v < cutoff) recentAlerts.delete(k);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Severity Config
// ═══════════════════════════════════════════════════════════════════════════════

const SEVERITY_CONFIG: Record<AlertSeverity, { emoji: string; color: string }> = {
  critical: { emoji: ':rotating_light:', color: '#dc2626' },
  high: { emoji: ':warning:', color: '#f59e0b' },
  medium: { emoji: ':large_blue_circle:', color: '#3b82f6' },
  low: { emoji: ':information_source:', color: '#6b7280' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Slack Message Builder
// ═══════════════════════════════════════════════════════════════════════════════

function buildSlackMessage(payload: AlertPayload) {
  const config = SEVERITY_CONFIG[payload.severity];
  const timestamp = new Date().toISOString();

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${config.emoji} [${payload.severity.toUpperCase()}] ${payload.title}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: payload.description,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Source:*\n\`${payload.source}\`` },
        { type: 'mrkdwn', text: `*Environment:*\n\`${process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown'}\`` },
        { type: 'mrkdwn', text: `*Time:*\n${timestamp}` },
        { type: 'mrkdwn', text: `*App:*\n<${APP_URL}|${APP_NAME}>` },
      ],
    },
  ];

  // Add error details if present
  if (payload.error) {
    const errorMsg =
      payload.error instanceof Error
        ? `${payload.error.name}: ${payload.error.message}`
        : String(payload.error);

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Error:*\n\`\`\`${errorMsg.slice(0, 500)}\`\`\``,
      },
    });
  }

  // Add metadata if present
  if (payload.metadata && Object.keys(payload.metadata).length > 0) {
    const metaFields = Object.entries(payload.metadata)
      .filter(([, v]) => v !== null && v !== undefined)
      .slice(0, 10) // Max 10 fields
      .map(([k, v]) => ({ type: 'mrkdwn' as const, text: `*${k}:* \`${v}\`` }));

    if (metaFields.length > 0) {
      blocks.push({ type: 'section', fields: metaFields });
    }
  }

  // Divider
  blocks.push({ type: 'divider' } as SlackBlock);

  return {
    text: `${config.emoji} [${payload.severity.toUpperCase()}] ${payload.title}`,
    blocks,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Core Alert Function
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send an alert to Slack.
 *
 * - In development: logs to console instead of sending to Slack
 * - In production without webhook URL: silently skips
 * - Deduplicates identical alerts within 5 minutes
 * - Rate limits to 30 alerts/minute
 */
export async function sendAlert(payload: AlertPayload): Promise<void> {
  try {
    // In development, log to console instead
    if (!IS_PRODUCTION) {
      logger.warn(`[Slack Alert - DEV] ${payload.severity.toUpperCase()}: ${payload.title}`, {
        source: payload.source,
        description: payload.description,
      });
      return;
    }

    // Skip if no webhook URL configured
    if (!SLACK_WEBHOOK_URL) {
      return;
    }

    // Check deduplication
    const dedupKey = getDedupKey(payload);
    if (isDuplicate(dedupKey)) {
      return;
    }

    // Check rate limit
    if (isRateLimited()) {
      logger.warn('[Slack Alert] Rate limited — too many alerts');
      return;
    }

    // Build and send message
    const message = buildSlackMessage(payload);

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      logger.warn('[Slack Alert] Failed to send', {
        status: String(response.status),
      });
      return;
    }

    // Record successful send for dedup
    recordAlert(dedupKey);
  } catch {
    // Never throw — alerting failure must not break the app
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Convenience Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/** Alert for 500-level API errors */
export async function alertApiError(
  route: string,
  error: unknown,
  metadata?: Record<string, string | number | boolean | null>
): Promise<void> {
  return sendAlert({
    title: `API Error: ${route}`,
    description: `An unhandled error occurred in \`${route}\`.`,
    severity: 'high',
    source: route,
    error,
    metadata,
  });
}

/** Alert for payment failures */
export async function alertPaymentFailure(
  orderId: string,
  error: unknown,
  metadata?: Record<string, string | number | boolean | null>
): Promise<void> {
  return sendAlert({
    title: 'Payment Processing Failure',
    description: `Payment failed for order \`${orderId}\`.`,
    severity: 'critical',
    source: 'payment',
    error,
    metadata: { orderId, ...metadata },
  });
}

/** Alert for rate limit violations (potential attack) */
export async function alertRateLimitViolation(
  endpoint: string,
  ip: string,
  metadata?: Record<string, string | number | boolean | null>
): Promise<void> {
  return sendAlert({
    title: `Rate Limit Exceeded: ${endpoint}`,
    description: `IP \`${ip}\` exceeded rate limit on \`${endpoint}\`. Possible abuse/attack.`,
    severity: 'medium',
    source: endpoint,
    metadata: { ip, ...metadata },
  });
}

/** Alert for authentication anomalies */
export async function alertAuthAnomaly(
  type: string,
  details: string,
  metadata?: Record<string, string | number | boolean | null>
): Promise<void> {
  return sendAlert({
    title: `Auth Anomaly: ${type}`,
    description: details,
    severity: 'high',
    source: 'auth',
    metadata,
  });
}

/** Alert for database connection issues */
export async function alertDatabaseIssue(
  description: string,
  error?: unknown
): Promise<void> {
  return sendAlert({
    title: 'Database Issue Detected',
    description,
    severity: 'critical',
    source: 'database',
    error,
  });
}
