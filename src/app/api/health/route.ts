import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Health Check API Endpoint
 *
 * Returns the current health status of the application.
 * Used for monitoring, load balancers, UptimeRobot, and Kubernetes probes.
 *
 * GET /api/health - Basic health check (for UptimeRobot)
 * GET /api/health?detailed=true - Detailed health with dependency checks
 * GET /api/health?quotas=true - Include quota usage information
 */

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  checks?: {
    database?: HealthCheck;
    supabase?: HealthCheck;
    redis?: HealthCheck;
  };
  quotas?: QuotaStatus;
}

interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  responseTime?: number;
  error?: string;
}

interface QuotaStatus {
  supabase?: {
    dbSize?: { used: string; limit: string; percentage: number };
    storage?: { used: string; limit: string; percentage: number };
    bandwidth?: { used: string; limit: string; percentage: number };
  };
  alerts: string[];
}

// Track application start time
const startTime = Date.now();

/**
 * Get application version from package.json
 */
function getVersion(): string {
  return process.env.npm_package_version || '0.1.0';
}

/**
 * Calculate uptime in seconds
 */
function getUptime(): number {
  return Math.floor((Date.now() - startTime) / 1000);
}

/**
 * Check Supabase connection
 */
async function checkSupabase(): Promise<HealthCheck> {
  const start = performance.now();

  try {
    const supabase = await createClient();

    // Simple query to test connection
    const { error } = await supabase.from('profiles').select('id').limit(1);

    const responseTime = Math.round(performance.now() - start);

    if (error) {
      return {
        status: 'fail',
        responseTime,
        error: error.message,
      };
    }

    // Warn if response time is high (> 1000ms)
    if (responseTime > 1000) {
      return {
        status: 'warn',
        responseTime,
      };
    }

    return {
      status: 'pass',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Redis/Upstash connection (if configured)
 */
async function checkRedis(): Promise<HealthCheck> {
  const start = performance.now();

  // Check if Upstash is configured
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!upstashUrl || !upstashToken) {
    return {
      status: 'pass',
      responseTime: 0,
    };
  }

  try {
    const response = await fetch(`${upstashUrl}/ping`, {
      headers: {
        Authorization: `Bearer ${upstashToken}`,
      },
    });

    const responseTime = Math.round(performance.now() - start);

    if (!response.ok) {
      return {
        status: 'fail',
        responseTime,
        error: `HTTP ${response.status}`,
      };
    }

    return {
      status: 'pass',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get quota usage information
 */
async function getQuotaStatus(): Promise<QuotaStatus> {
  const alerts: string[] = [];
  const quotas: QuotaStatus = { alerts };

  // Note: Actual quota checking would require Supabase Management API
  // This is a placeholder that can be extended with actual quota checks

  // Check environment variables for quota thresholds
  const QUOTA_WARN_THRESHOLD = 80; // 80%

  // Example: If you have quota tracking, add alerts here
  // if (dbUsagePercent > QUOTA_WARN_THRESHOLD) {
  //   alerts.push(`Database usage at ${dbUsagePercent}%`);
  // }

  return quotas;
}

/**
 * GET /api/health
 *
 * Basic health check endpoint
 * - UptimeRobot: GET /api/health (returns 200 if healthy)
 * - Detailed: GET /api/health?detailed=true
 * - With quotas: GET /api/health?quotas=true
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get('detailed') === 'true';
  const includeQuotas = searchParams.get('quotas') === 'true';

  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: getVersion(),
    uptime: getUptime(),
    environment: process.env.NODE_ENV || 'development',
  };

  // If detailed check is requested, check dependencies
  if (detailed) {
    healthStatus.checks = {};

    // Check Supabase and Redis in parallel
    const [supabaseCheck, redisCheck] = await Promise.all([checkSupabase(), checkRedis()]);

    healthStatus.checks.supabase = supabaseCheck;
    healthStatus.checks.redis = redisCheck;

    // Determine overall status based on checks
    const allChecks = [supabaseCheck, redisCheck];
    const hasFail = allChecks.some((c) => c.status === 'fail');
    const hasWarn = allChecks.some((c) => c.status === 'warn');

    if (hasFail) {
      healthStatus.status = 'degraded';
    } else if (hasWarn) {
      healthStatus.status = 'healthy'; // Warnings don't change status
    }
  }

  // Include quota information if requested
  if (includeQuotas) {
    healthStatus.quotas = await getQuotaStatus();

    // If there are quota alerts, mark as degraded
    if (healthStatus.quotas.alerts.length > 0) {
      healthStatus.status = healthStatus.status === 'unhealthy' ? 'unhealthy' : 'degraded';
    }
  }

  // Return appropriate status code
  const statusCode =
    healthStatus.status === 'healthy' ? 200 : healthStatus.status === 'degraded' ? 200 : 503;

  return NextResponse.json(healthStatus, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}

/**
 * HEAD /api/health
 *
 * Lightweight health check (no body)
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Health-Status': 'healthy',
    },
  });
}
