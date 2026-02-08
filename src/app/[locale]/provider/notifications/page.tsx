'use client';

import { useLocale } from 'next-intl';
import { ProviderLayout } from '@/components/provider';
import { NotificationPreferences } from '@/components/shared/NotificationPreferences';

export default function ProviderNotificationSettingsPage() {
  const locale = useLocale();

  return (
    <ProviderLayout
      pageTitle={{
        ar: 'إعدادات الإشعارات',
        en: 'Notification Settings',
      }}
    >
      <div className="p-4 lg:p-6 max-w-2xl">
        <NotificationPreferences role="provider" />
      </div>
    </ProviderLayout>
  );
}
