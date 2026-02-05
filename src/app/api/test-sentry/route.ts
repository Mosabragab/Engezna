/**
 * Test API Route for Sentry Integration
 *
 * استخدم هذا الـ endpoint لاختبار أن Logger يرسل الأخطاء لـ Sentry بشكل صحيح
 *
 * الاستخدام:
 * GET /api/test-sentry              - اختبار logger.error()
 * GET /api/test-sentry?type=warn    - اختبار logger.warn()
 * GET /api/test-sentry?type=exception - اختبار captureException()
 *
 * ⚠️ احذف هذا الملف بعد الاختبار!
 */

import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('SentryTest');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testType = searchParams.get('type') || 'error';

  const testData = {
    testId: `test-${Date.now()}`,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    testType,
  };

  switch (testType) {
    case 'warn':
      // اختبار Warning - يُضاف كـ breadcrumb في Sentry
      logger.warn('🧪 Test warning from Engezna Logger', testData);
      return NextResponse.json({
        success: true,
        message: 'Warning logged - check Sentry breadcrumbs',
        data: testData,
      });

    case 'exception':
      // اختبار Exception - يُرسل مع Stack Trace كامل
      try {
        throw new Error('🧪 Test exception from Engezna Logger');
      } catch (error) {
        if (error instanceof Error) {
          logger.captureException(error, testData);
        }
      }
      return NextResponse.json({
        success: true,
        message: 'Exception captured - check Sentry issues',
        data: testData,
      });

    case 'error':
    default:
      // اختبار Error - يُرسل كـ message في Sentry
      logger.error('🧪 Test error from Engezna Logger', testData);
      return NextResponse.json({
        success: true,
        message: 'Error logged - check Sentry issues',
        data: testData,
      });
  }
}
