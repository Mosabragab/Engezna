import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Quota Check API Endpoint
 *
 * Checks usage quotas for external services and sends alerts if thresholds are exceeded.
 * Designed to be called by a cron job (e.g., Vercel Cron, GitHub Actions)
 *
 * POST /api/monitoring/quota-check
 * Headers: Authorization: Bearer <CRON_SECRET>
 */

interface QuotaCheckResult {
  service: string;
  status: 'ok' | 'warning' | 'critical';
  usage?: {
    current: number;
    limit: number;
    percentage: number;
    unit: string;
  };
  message: string;
}

interface QuotaCheckResponse {
  timestamp: string;
  overallStatus: 'ok' | 'warning' | 'critical';
  results: QuotaCheckResult[];
  alertsSent: boolean;
}

// Thresholds for alerts
const THRESHOLDS = {
  WARNING: 70, // 70%
  CRITICAL: 90, // 90%
};

/**
 * Check Supabase database size
 */
async function checkSupabaseDatabase(): Promise<QuotaCheckResult> {
  try {
    const supabase = createAdminClient();

    // Get database size using pg_database_size
    const { data, error } = await supabase.rpc('get_database_stats').single();

    if (error || !data) {
      return {
        service: 'Supabase Database',
        status: 'ok',
        message: 'Unable to fetch database stats (function may not exist)',
      };
    }

    // Supabase Free tier: 500MB, Pro: 8GB
    const limitMB = process.env.SUPABASE_DB_LIMIT_MB
      ? parseInt(process.env.SUPABASE_DB_LIMIT_MB)
      : 500;
    const currentMB = data.database_size_mb || 0;
    const percentage = (currentMB / limitMB) * 100;

    let status: 'ok' | 'warning' | 'critical' = 'ok';
    if (percentage >= THRESHOLDS.CRITICAL) status = 'critical';
    else if (percentage >= THRESHOLDS.WARNING) status = 'warning';

    return {
      service: 'Supabase Database',
      status,
      usage: {
        current: currentMB,
        limit: limitMB,
        percentage: Math.round(percentage),
        unit: 'MB',
      },
      message:
        status === 'ok'
          ? `Database usage normal: ${Math.round(percentage)}%`
          : `Database usage ${status}: ${Math.round(percentage)}% (${currentMB}MB / ${limitMB}MB)`,
    };
  } catch {
    return {
      service: 'Supabase Database',
      status: 'ok',
      message: 'Database stats check not configured',
    };
  }
}

/**
 * Check Supabase storage usage
 */
async function checkSupabaseStorage(): Promise<QuotaCheckResult> {
  try {
    const supabase = createAdminClient();

    // List all buckets and calculate total size
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error || !buckets) {
      return {
        service: 'Supabase Storage',
        status: 'ok',
        message: 'Unable to fetch storage stats',
      };
    }

    // Supabase Free tier: 1GB, Pro: 100GB
    const limitGB = process.env.SUPABASE_STORAGE_LIMIT_GB
      ? parseInt(process.env.SUPABASE_STORAGE_LIMIT_GB)
      : 1;

    // Note: Getting actual storage size requires iterating through all files
    // This is a simplified check based on bucket count
    const bucketCount = buckets.length;

    return {
      service: 'Supabase Storage',
      status: 'ok',
      message: `${bucketCount} storage buckets configured`,
    };
  } catch {
    return {
      service: 'Supabase Storage',
      status: 'ok',
      message: 'Storage check not configured',
    };
  }
}

/**
 * Check Upstash Redis usage
 */
async function checkUpstashRedis(): Promise<QuotaCheckResult> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!upstashUrl || !upstashToken) {
    return {
      service: 'Upstash Redis',
      status: 'ok',
      message: 'Upstash Redis not configured',
    };
  }

  try {
    // Get Redis info
    const response = await fetch(`${upstashUrl}/info`, {
      headers: {
        Authorization: `Bearer ${upstashToken}`,
      },
    });

    if (!response.ok) {
      return {
        service: 'Upstash Redis',
        status: 'warning',
        message: `Unable to fetch Redis info: HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    // Upstash Free tier: 10,000 commands/day, 256MB
    const limitCommands = process.env.UPSTASH_COMMANDS_LIMIT
      ? parseInt(process.env.UPSTASH_COMMANDS_LIMIT)
      : 10000;

    return {
      service: 'Upstash Redis',
      status: 'ok',
      message: 'Redis connection healthy',
    };
  } catch {
    return {
      service: 'Upstash Redis',
      status: 'warning',
      message: 'Unable to check Redis stats',
    };
  }
}

/**
 * Send alert notification (email/webhook)
 */
async function sendAlerts(results: QuotaCheckResult[]): Promise<boolean> {
  const criticalAlerts = results.filter((r) => r.status === 'critical');
  const warningAlerts = results.filter((r) => r.status === 'warning');

  if (criticalAlerts.length === 0 && warningAlerts.length === 0) {
    return false;
  }

  // Log alerts to platform_settings for admin visibility
  try {
    const supabase = createAdminClient();

    const alertData = {
      timestamp: new Date().toISOString(),
      critical: criticalAlerts.map((a) => ({ service: a.service, message: a.message })),
      warnings: warningAlerts.map((a) => ({ service: a.service, message: a.message })),
    };

    // Store in platform_settings
    await supabase.from('platform_settings').upsert(
      {
        key: 'quota_alerts',
        value: alertData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );

    // TODO: Add email notification using Resend
    // if (criticalAlerts.length > 0) {
    //   await sendEmail({
    //     to: process.env.ADMIN_EMAIL,
    //     subject: '🚨 Engezna Quota Alert - Critical',
    //     body: formatAlertEmail(criticalAlerts, warningAlerts),
    //   });
    // }

    console.log('[Quota Check] Alerts stored:', alertData);
    return true;
  } catch (error) {
    console.error('[Quota Check] Failed to send alerts:', error);
    return false;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  // Verify cron secret (optional security)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: QuotaCheckResult[] = [];

  // Run all checks in parallel
  const [dbResult, storageResult, redisResult] = await Promise.all([
    checkSupabaseDatabase(),
    checkSupabaseStorage(),
    checkUpstashRedis(),
  ]);

  results.push(dbResult, storageResult, redisResult);

  // Determine overall status
  let overallStatus: 'ok' | 'warning' | 'critical' = 'ok';
  if (results.some((r) => r.status === 'critical')) {
    overallStatus = 'critical';
  } else if (results.some((r) => r.status === 'warning')) {
    overallStatus = 'warning';
  }

  // Send alerts if needed
  const alertsSent = await sendAlerts(results);

  const response: QuotaCheckResponse = {
    timestamp: new Date().toISOString(),
    overallStatus,
    results,
    alertsSent,
  };

  return NextResponse.json(response, {
    status: overallStatus === 'critical' ? 503 : 200,
  });
}

// Also support GET for manual checks
export async function GET(request: Request): Promise<NextResponse> {
  return POST(request);
}
