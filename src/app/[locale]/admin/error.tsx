'use client';

/**
 * Admin Error Boundary
 *
 * Specialized error boundary for the admin dashboard.
 * Provides admin-specific error handling and recovery options.
 * Integrates with Sentry for error monitoring (Phase 4.2).
 *
 * @version 1.1.0 - Added Sentry integration
 * @see docs/MASTER_IMPLEMENTATION_PLAN.md - Section 1.5, 4.2
 */

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Send error to Sentry with admin context
    Sentry.captureException(error, {
      tags: {
        errorBoundary: 'admin',
        digest: error.digest ?? 'unknown',
        area: 'dashboard',
      },
      extra: {
        componentStack: error.stack,
      },
    });

    console.error('[Admin Error]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">خطأ في لوحة التحكم</h1>
            <p className="text-sm text-slate-500">حدث خطأ أثناء تحميل هذه الصفحة</p>
          </div>
        </div>

        {/* Error Details */}
        <div className="bg-slate-50 rounded-lg p-4 mb-6">
          <p className="text-slate-600 text-sm mb-2">
            حدث خطأ غير متوقع في لوحة التحكم. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني إذا
            استمرت المشكلة.
          </p>
          {error.digest && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-400">Error ID:</span>
              <code className="text-xs text-slate-600 bg-white px-2 py-1 rounded">
                {error.digest}
              </code>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Try Again Button */}
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#009DE0] hover:bg-[#0088c7] text-white rounded-lg font-medium transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            إعادة المحاولة
          </button>

          {/* Dashboard Home Button */}
          <Link
            href="/ar/admin"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-slate-300 hover:border-slate-400 text-slate-700 rounded-lg font-medium transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
            لوحة التحكم
          </Link>
        </div>
      </div>
    </div>
  );
}
