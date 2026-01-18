'use client';

/**
 * Global Error Boundary
 *
 * Ultimate fallback for the entire application.
 * Catches errors that propagate beyond route-level boundaries.
 *
 * @version 1.0.0 - Phase 1.5 Implementation
 * @see docs/MASTER_IMPLEMENTATION_PLAN.md - Section 1.5
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
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
            <h2 className="text-2xl font-bold text-slate-900 mb-4">حدث خطأ في التطبيق</h2>

            {/* Error Message */}
            <p className="text-slate-600 mb-6">
              نعتذر عن هذا الخلل. فريقنا تم إبلاغه وسيعمل على حله في أقرب وقت.
            </p>

            {/* Error Digest (for debugging) */}
            {error.digest && (
              <p className="text-xs text-slate-400 mb-4 font-mono">Error ID: {error.digest}</p>
            )}

            {/* Reset Button */}
            <button
              onClick={() => reset()}
              className="px-6 py-3 bg-[#009DE0] hover:bg-[#0088c7] text-white rounded-lg font-medium transition-colors duration-200"
            >
              حاول مرة أخرى
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
