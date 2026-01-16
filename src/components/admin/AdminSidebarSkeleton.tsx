'use client';

/**
 * AdminSidebarSkeleton - هيكل تحميل للقائمة الجانبية
 * يظهر أثناء تحميل الصلاحيات لمنع Layout Shift
 */
export function AdminSidebarSkeleton() {
  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen animate-pulse">
      {/* Logo Section */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="h-8 w-24 bg-slate-200 rounded-lg" />
            <div className="h-3 w-20 bg-slate-100 rounded" />
          </div>
        </div>
      </div>

      {/* Role Badge Skeleton */}
      <div className="px-4 py-2 border-b border-slate-100">
        <div className="h-7 w-28 bg-slate-100 rounded-lg" />
      </div>

      {/* Navigation Skeleton */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {/* Operations Section */}
        <div>
          <div className="h-3 w-16 bg-slate-100 rounded mb-3 mx-4" />
          <div className="space-y-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={`ops-${i}`} className="flex items-center gap-3 px-4 py-2.5 rounded-xl">
                <div className="w-5 h-5 bg-slate-200 rounded" />
                <div className="h-4 flex-1 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Financial Section */}
        <div>
          <div className="h-3 w-14 bg-amber-100 rounded mb-3 mx-4" />
          <div className="space-y-1">
            {[1, 2, 3].map((i) => (
              <div key={`fin-${i}`} className="flex items-center gap-3 px-4 py-2.5 rounded-xl">
                <div className="w-5 h-5 bg-slate-200 rounded" />
                <div className="h-4 flex-1 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Marketing Section */}
        <div>
          <div className="h-3 w-16 bg-slate-100 rounded mb-3 mx-4" />
          <div className="space-y-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={`mkt-${i}`} className="flex items-center gap-3 px-4 py-2.5 rounded-xl">
                <div className="w-5 h-5 bg-slate-200 rounded" />
                <div className="h-4 flex-1 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Team Section */}
        <div>
          <div className="h-3 w-12 bg-slate-100 rounded mb-3 mx-4" />
          <div className="space-y-1">
            {[1, 2, 3].map((i) => (
              <div key={`team-${i}`} className="flex items-center gap-3 px-4 py-2.5 rounded-xl">
                <div className="w-5 h-5 bg-slate-200 rounded" />
                <div className="h-4 flex-1 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}

export default AdminSidebarSkeleton;
