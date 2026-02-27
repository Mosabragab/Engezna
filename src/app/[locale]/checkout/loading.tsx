'use client';

/**
 * Checkout Loading State
 * Shows skeleton UI while checkout page is loading
 */
export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-slate-50 animate-[fadeIn_300ms_ease-out_400ms_forwards] opacity-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center h-14 px-4 gap-3">
          <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
          <div className="w-32 h-5 bg-slate-200 rounded animate-pulse" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4 max-w-lg">
        {/* Delivery Address */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <div className="w-28 h-5 bg-slate-200 rounded animate-pulse" />
          <div className="w-full h-10 bg-slate-100 rounded-xl animate-pulse" />
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <div className="w-24 h-5 bg-slate-200 rounded animate-pulse" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="w-14 h-14 bg-slate-200 rounded-xl animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="w-3/4 h-4 bg-slate-200 rounded animate-pulse" />
                <div className="w-1/3 h-3 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="w-16 h-5 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Promo Code */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex gap-2">
            <div className="flex-1 h-10 bg-slate-100 rounded-xl animate-pulse" />
            <div className="w-20 h-10 bg-slate-200 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <div className="flex justify-between">
            <div className="w-24 h-4 bg-slate-200 rounded animate-pulse" />
            <div className="w-16 h-4 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="flex justify-between">
            <div className="w-20 h-4 bg-slate-200 rounded animate-pulse" />
            <div className="w-16 h-4 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="border-t pt-3 flex justify-between">
            <div className="w-16 h-5 bg-slate-200 rounded animate-pulse" />
            <div className="w-20 h-5 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>

        {/* Place Order Button */}
        <div className="h-12 bg-[#009DE0]/20 rounded-xl animate-pulse" />
      </main>
    </div>
  );
}
