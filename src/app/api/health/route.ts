import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Health Check API Endpoint
 *
 * Returns the current health status of the application.
 * Used for monitoring, load balancers, and Kubernetes probes.
 *
 * GET /api/health - Basic health check
 * GET /api/health?detailed=true - Detailed health with dependency checks
 */

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks?: {
    database?: HealthCheck;
    supabase?: HealthCheck;
  };
}

interface HealthCheck {
  status: 'pass' | 'fail';
  responseTime?: number;
  error?: string;
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
 * GET /api/health
 *
 * Basic health check endpoint
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get('detailed') === 'true';

  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: getVersion(),
    uptime: getUptime(),
  };

  // If detailed check is requested, check dependencies
  if (detailed) {
    healthStatus.checks = {};

    // Check Supabase
    const supabaseCheck = await checkSupabase();
    healthStatus.checks.supabase = supabaseCheck;

    // Determine overall status based on checks
    if (supabaseCheck.status === 'fail') {
      healthStatus.status = 'degraded';
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
