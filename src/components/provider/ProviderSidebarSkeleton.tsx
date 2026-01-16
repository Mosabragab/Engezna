'use client';

/**
 * ProviderSidebarSkeleton - هيكل تحميل للقائمة الجانبية للتاجر
 * يظهر أثناء تحميل بيانات المتجر لمنع Layout Shift
 */
export function ProviderSidebarSkeleton() {
  return (
    <aside className="w-64 bg-white/95 backdrop-blur-md border-r border-slate-100 shadow-elegant flex flex-col h-screen animate-pulse">
      {/* Logo & Store Info Skeleton */}
      <div className="p-3 lg:p-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            {/* Logo */}
            <div className="h-8 w-20 bg-slate-200 rounded-lg" />
            <div className="h-2 w-16 bg-slate-100 rounded" />
          </div>
        </div>
      </div>

      {/* Store Card Skeleton */}
      <div className="p-3 border-b border-slate-100">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Store Logo */}
            <div className="w-12 h-12 bg-slate-200 rounded-xl" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="h-3 w-16 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Skeleton */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Main Navigation Items */}
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={`nav-${i}`} className="flex items-center gap-3 px-4 py-2.5 rounded-xl">
            <div className="w-5 h-5 bg-slate-200 rounded" />
            <div className="h-4 flex-1 bg-slate-200 rounded" />
            {/* Badge skeleton for some items */}
            {i === 2 && <div className="w-5 h-5 bg-slate-200 rounded-full" />}
            {i === 5 && <div className="w-5 h-5 bg-slate-200 rounded-full" />}
          </div>
        ))}

        {/* Divider */}
        <div className="my-3 border-t border-slate-100" />

        {/* Secondary Navigation Items */}
        {[1, 2, 3].map((i) => (
          <div key={`sec-${i}`} className="flex items-center gap-3 px-4 py-2.5 rounded-xl">
            <div className="w-5 h-5 bg-slate-200 rounded" />
            <div className="h-4 flex-1 bg-slate-200 rounded" />
          </div>
        ))}
      </nav>

      {/* Bottom Section Skeleton */}
      <div className="p-3 border-t border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl">
          <div className="w-5 h-5 bg-slate-200 rounded" />
          <div className="h-4 flex-1 bg-slate-200 rounded" />
        </div>
      </div>
    </aside>
  );
}

export default ProviderSidebarSkeleton;
