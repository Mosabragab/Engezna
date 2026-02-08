'use client';

import { useLocale } from 'next-intl';
import { CustomerLayout } from '@/components/customer/layout';
import { NotificationPreferences } from '@/components/shared/NotificationPreferences';

export default function NotificationSettingsPage() {
  const locale = useLocale();

  return (
    <CustomerLayout
      headerTitle={locale === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}
      showBackButton
      showBottomNav={false}
    >
      <div className="px-4 py-4 pb-24">
        <NotificationPreferences role="customer" />
      </div>
    </CustomerLayout>
  );
}
