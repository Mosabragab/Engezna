'use client';

/**
 * Provider Error Boundary
 *
 * Specialized error boundary for the provider dashboard.
 * Provides provider-specific error handling and recovery options.
 *
 * @version 1.0.0 - Phase 1.5 Implementation
 * @see docs/MASTER_IMPLEMENTATION_PLAN.md - Section 1.5
 */

import { useEffect } from 'react';
import Link from 'next/link';

export default function ProviderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for monitoring
    console.error('[Provider Error]:', error);
    // TODO: Send to Sentry when integrated
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-amber-600"
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
            <h1 className="text-xl font-bold text-slate-900">خطأ في لوحة المتجر</h1>
            <p className="text-sm text-slate-500">حدث خطأ أثناء تحميل هذه الصفحة</p>
          </div>
        </div>

        {/* Error Message */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-slate-700 text-sm">
            نعتذر عن هذا الخلل. يرجى المحاولة مرة أخرى. إذا استمرت المشكلة، تواصل مع فريق دعم
            إنجزنا.
          </p>
          {error.digest && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-amber-200">
              <span className="text-xs text-slate-500">معرف الخطأ:</span>
              <code className="text-xs text-slate-700 bg-white px-2 py-1 rounded border border-amber-200">
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

          {/* Provider Dashboard Button */}
          <Link
            href="/ar/provider"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-slate-300 hover:border-slate-400 text-slate-700 rounded-lg font-medium transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            لوحة المتجر
          </Link>
        </div>

        {/* Support Link */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            تحتاج مساعدة؟{' '}
            <a
              href="mailto:support@engezna.com"
              className="text-[#009DE0] hover:underline font-medium"
            >
              تواصل مع الدعم
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
