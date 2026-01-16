'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldX, ArrowLeft, ArrowRight, Home } from 'lucide-react';

interface AccessDeniedProps {
  message?: string;
  showHomeButton?: boolean;
}

export function AccessDenied({ message, showHomeButton = true }: AccessDeniedProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const defaultMessage =
    locale === 'ar'
      ? 'ليس لديك صلاحية للوصول لهذه الصفحة. تواصل مع مالك المتجر للحصول على الصلاحية.'
      : 'You do not have permission to access this page. Contact the store owner to get access.';

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-8 text-center shadow-elegant">
      {/* Icon */}
      <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-red-100 to-orange-100 rounded-2xl flex items-center justify-center">
        <ShieldX className="w-10 h-10 text-red-500" />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-slate-800 mb-2">
        {locale === 'ar' ? 'غير مصرح بالوصول' : 'Access Denied'}
      </h2>

      {/* Message */}
      <p className="text-slate-500 mb-6 max-w-md mx-auto">{message || defaultMessage}</p>

      {/* Actions */}
      {showHomeButton && (
        <Link href={`/${locale}/provider`}>
          <Button variant="outline" className="gap-2">
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {locale === 'ar' ? 'العودة للرئيسية' : 'Back to Dashboard'}
          </Button>
        </Link>
      )}
    </div>
  );
}

// ============================================================================
// Permission Guard Component
// ============================================================================

interface PermissionGuardProps {
  children: React.ReactNode;
  hasPermission: boolean;
  loading?: boolean;
  message?: string;
}

export function PermissionGuard({
  children,
  hasPermission,
  loading = false,
  message,
}: PermissionGuardProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!hasPermission) {
    return <AccessDenied message={message} />;
  }

  return <>{children}</>;
}
