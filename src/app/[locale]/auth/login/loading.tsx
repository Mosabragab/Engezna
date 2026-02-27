'use client';

/**
 * Login Page Loading State
 */
export default function LoginLoading() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 animate-[fadeIn_300ms_ease-out_400ms_forwards] opacity-0">
      {/* Logo */}
      <div className="w-20 h-20 bg-slate-200 rounded-2xl animate-pulse mb-8" />

      {/* Title */}
      <div className="w-40 h-6 bg-slate-200 rounded animate-pulse mb-2" />
      <div className="w-56 h-4 bg-slate-200 rounded animate-pulse mb-8" />

      {/* Form Fields */}
      <div className="w-full max-w-sm space-y-4">
        <div className="space-y-2">
          <div className="w-20 h-3 bg-slate-200 rounded animate-pulse" />
          <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="w-24 h-3 bg-slate-200 rounded animate-pulse" />
          <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
        </div>

        {/* Submit Button */}
        <div className="h-12 bg-[#009DE0]/20 rounded-xl animate-pulse mt-6" />

        {/* Social Login */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-slate-200" />
          <div className="w-8 h-3 bg-slate-200 rounded animate-pulse" />
          <div className="flex-1 h-px bg-slate-200" />
        </div>
        <div className="flex gap-3">
          <div className="flex-1 h-12 bg-slate-100 rounded-xl animate-pulse" />
          <div className="flex-1 h-12 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
