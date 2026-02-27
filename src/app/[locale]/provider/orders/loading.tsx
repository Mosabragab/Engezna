'use client';

/**
 * Provider Orders Loading State
 */
export default function ProviderOrdersLoading() {
  return (
    <div className="flex-1 bg-slate-50 animate-[fadeIn_300ms_ease-out_400ms_forwards] opacity-0">
      {/* Tabs */}
      <div className="bg-white border-b px-4 py-2">
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-20 bg-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Order Cards */}
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse" />
                <div className="space-y-1">
                  <div className="w-28 h-4 bg-slate-200 rounded animate-pulse" />
                  <div className="w-20 h-3 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
              <div className="w-16 h-6 bg-slate-200 rounded-full animate-pulse" />
            </div>
            <div className="border-t pt-2 flex justify-between items-center">
              <div className="w-20 h-3 bg-slate-200 rounded animate-pulse" />
              <div className="w-24 h-8 bg-[#009DE0]/10 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
