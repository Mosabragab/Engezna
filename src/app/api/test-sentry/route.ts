/**
 * Test API Route for Sentry Integration
 *
 * استخدم هذا الـ endpoint لاختبار أن Sentry يعمل بشكل صحيح
 *
 * الاستخدام:
 * GET /api/test-sentry              - اختبار Sentry مباشرة
 * GET /api/test-sentry?type=logger  - اختبار عبر Logger
 *
 * ⚠️ احذف هذا الملف بعد الاختبار!
 */

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('SentryTest');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testType = searchParams.get('type') || 'direct';

  const testData = {
    testId: `test-${Date.now()}`,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    testType,
    sentryDsnExists: !!process.env.SENTRY_DSN,
    nextPublicSentryDsnExists: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  };

  switch (testType) {
    case 'logger':
      // اختبار عبر Logger
      logger.error('🧪 Test error via Logger', testData);
      return NextResponse.json({
        success: true,
        message: 'Error logged via Logger - check Sentry issues',
        data: testData,
      });

    case 'direct':
    default:
      // اختبار Sentry مباشرة (أكثر موثوقية)
      try {
        Sentry.captureMessage('🧪 Direct Sentry test from Engezna API', {
          level: 'error',
          extra: testData,
          tags: {
            source: 'test-sentry-endpoint',
            testType: 'direct',
          },
        });

        // أيضاً اختبار captureException
        const testError = new Error('🧪 Test Exception from Engezna API');
        Sentry.captureException(testError, {
          extra: testData,
          tags: {
            source: 'test-sentry-endpoint',
            testType: 'exception',
          },
        });

        // Flush to ensure events are sent
        await Sentry.flush(2000);

        return NextResponse.json({
          success: true,
          message: 'Direct Sentry test sent - check Sentry issues in 1-2 minutes',
          data: testData,
          note: 'If SENTRY_DSN shows false, add it to Vercel env vars',
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: 'Failed to send to Sentry',
          error: error instanceof Error ? error.message : String(error),
          data: testData,
        });
      }
  }
}
