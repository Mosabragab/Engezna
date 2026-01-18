import { createStaticClient } from '@/lib/supabase/static';
import { MapPin, CheckCircle2 } from 'lucide-react';

interface Governorate {
  id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}

interface GovernoratesListProps {
  locale: string;
}

// This component fetches data - will be streamed with Suspense
export async function GovernoratesList({ locale }: GovernoratesListProps) {
  const isRTL = locale === 'ar';

  const supabase = createStaticClient();

  // Handle missing Supabase client (e.g., in test environments)
  if (!supabase) {
    return (
      <p className="text-slate-500 mb-6">
        {isRTL ? 'قريباً في محافظتك' : 'Coming soon to your governorate'}
      </p>
    );
  }

  const { data: governorates } = await supabase
    .from('governorates')
    .select('id, name_ar, name_en, is_active')
    .eq('is_active', true)
    .order('name_ar');

  if (!governorates || governorates.length === 0) {
    return (
      <p className="text-slate-500 mb-6">
        {isRTL ? 'قريباً في محافظتك' : 'Coming soon to your governorate'}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-3 mb-6">
      {governorates.map((gov) => (
        <span
          key={gov.id}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white rounded-full text-slate-700 font-medium shadow-sm border border-slate-100"
        >
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          {isRTL ? gov.name_ar : gov.name_en}
        </span>
      ))}
    </div>
  );
}

// Loading placeholder - shown while GovernoratesList is loading
export function GovernoratesListSkeleton({ locale }: { locale: string }) {
  const isRTL = locale === 'ar';

  return (
    <div className="flex flex-wrap justify-center gap-3 mb-6">
      {/* Show placeholder badges */}
      {[1, 2].map((i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/50 rounded-full text-slate-400 font-medium shadow-sm border border-slate-100 animate-pulse"
        >
          <div className="w-4 h-4 bg-slate-200 rounded-full" />
          <div className="w-16 h-4 bg-slate-200 rounded" />
        </span>
      ))}
    </div>
  );
}
