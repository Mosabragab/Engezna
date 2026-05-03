import { sendAlert, type AlertSeverity } from './slack-alerting';

/**
 * Typed wrapper around sendAlert() for the gift-system observability checks.
 * The DB function observability_check_thresholds() returns rows shaped like
 * the {@link ThresholdRow} interface; this module turns each one into a
 * Slack alert with consistent metadata.
 */

export interface ThresholdRow {
  severity: AlertSeverity | string;
  code: string;
  message_ar: string;
  message_en: string;
  context: Record<string, unknown> | null;
}

const SEVERITY_FALLBACK: AlertSeverity = 'medium';

function normalizeSeverity(value: string | undefined): AlertSeverity {
  if (value === 'critical' || value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }
  return SEVERITY_FALLBACK;
}

/**
 * Fan out one Slack alert per row returned by
 * observability_check_thresholds(). Returns the count of alerts attempted —
 * sendAlert() handles dedup + rate limiting internally.
 */
export async function dispatchThresholdAlerts(rows: ThresholdRow[]): Promise<number> {
  let dispatched = 0;
  for (const row of rows) {
    const severity = normalizeSeverity(row.severity);
    // Flatten the JSONB context into Slack-friendly metadata fields. Skip
    // nested objects / arrays because Slack message blocks expect scalars.
    const metadata: Record<string, string | number | boolean | null> = { code: row.code };
    if (row.context && typeof row.context === 'object') {
      for (const [k, v] of Object.entries(row.context)) {
        if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) {
          metadata[k] = v as string | number | boolean | null;
        }
      }
    }
    try {
      await sendAlert({
        title: `Gift system: ${row.code}`,
        description: `${row.message_en}\n${row.message_ar}`,
        severity,
        source: 'gift-system/observability',
        metadata,
      });
      dispatched++;
    } catch {
      // sendAlert never throws, but defend against future regressions.
    }
  }
  return dispatched;
}
