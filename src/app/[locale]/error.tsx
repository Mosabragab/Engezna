'use client';

/**
 * Locale Error Boundary
 *
 * Provides a themed error experience within the main application layout.
 * Logs errors for future Sentry integration.
 *
 * @version 1.0.0 - Phase 1.5 Implementation
 * @see docs/MASTER_IMPLEMENTATION_PLAN.md - Section 1.5
 */

import { useEffect } from 'react';
import Link from 'next/link';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for monitoring (ready for Sentry integration)
    console.error('[Application Error]:', error);
    // TODO: Send to Sentry when integrated
    // Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* Error Icon */}
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-600"
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

        {/* Error Title */}
        <h1 className="text-xl font-bold text-slate-900 mb-2">حدث خطأ غير متوقع</h1>

        {/* Error Message */}
        <p className="text-slate-600 mb-6">
          نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
        </p>

        {/* Error Digest (for debugging) */}
        {error.digest && (
          <p className="text-xs text-slate-400 mb-4 font-mono bg-slate-50 py-2 px-3 rounded">
            Error ID: {error.digest}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          {/* Try Again Button */}
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#009DE0] hover:bg-[#0088c7] text-white rounded-lg font-medium transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            حاول مرة أخرى
          </button>

          {/* Home Button */}
          <Link
            href="/ar"
            className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 hover:border-slate-400 text-slate-700 rounded-lg font-medium transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
