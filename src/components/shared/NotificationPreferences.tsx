'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Bell, Volume2, Moon, Loader2 } from 'lucide-react';
import { getAudioManager } from '@/lib/audio/audio-manager';

type UserRole = 'customer' | 'provider' | 'admin';

interface PreferenceItem {
  key: string;
  label: { ar: string; en: string };
  description: { ar: string; en: string };
}

const CUSTOMER_PREFERENCES: PreferenceItem[] = [
  {
    key: 'order_updates',
    label: { ar: 'تحديثات الطلبات', en: 'Order Updates' },
    description: { ar: 'إشعارات تغيير حالة الطلب', en: 'Notifications for order status changes' },
  },
  {
    key: 'promotions',
    label: { ar: 'العروض والتخفيضات', en: 'Promotions' },
    description: { ar: 'عروض وخصومات حصرية', en: 'Exclusive deals and discounts' },
  },
  {
    key: 'chat_messages',
    label: { ar: 'رسائل المحادثة', en: 'Chat Messages' },
    description: { ar: 'رسائل جديدة من المتاجر', en: 'New messages from stores' },
  },
];

const PROVIDER_PREFERENCES: PreferenceItem[] = [
  {
    key: 'new_orders',
    label: { ar: 'طلبات جديدة', en: 'New Orders' },
    description: { ar: 'تنبيه عند وصول طلب جديد', en: 'Alert when a new order arrives' },
  },
  {
    key: 'order_cancellations',
    label: { ar: 'إلغاء الطلبات', en: 'Order Cancellations' },
    description: { ar: 'إشعار عند إلغاء طلب', en: 'Notification when an order is cancelled' },
  },
  {
    key: 'low_stock_alerts',
    label: { ar: 'تنبيهات المخزون', en: 'Low Stock Alerts' },
    description: { ar: 'تحذير عند انخفاض المخزون', en: 'Warning when stock is running low' },
  },
  {
    key: 'new_reviews',
    label: { ar: 'تقييمات جديدة', en: 'New Reviews' },
    description: { ar: 'إشعار عند استلام تقييم', en: 'Notification when a review is received' },
  },
  {
    key: 'chat_messages',
    label: { ar: 'رسائل العملاء', en: 'Customer Messages' },
    description: { ar: 'رسائل جديدة من العملاء', en: 'New messages from customers' },
  },
];

const ADMIN_PREFERENCES: PreferenceItem[] = [
  {
    key: 'new_providers',
    label: { ar: 'متاجر جديدة', en: 'New Providers' },
    description: { ar: 'إشعار عند تسجيل متجر جديد', en: 'Notification when a new store registers' },
  },
  {
    key: 'complaints',
    label: { ar: 'شكاوى وتذاكر الدعم', en: 'Complaints & Support' },
    description: { ar: 'شكاوى وتذاكر دعم جديدة', en: 'New complaints and support tickets' },
  },
  {
    key: 'system_alerts',
    label: { ar: 'تنبيهات النظام', en: 'System Alerts' },
    description: { ar: 'إشعارات النظام والتحديثات', en: 'System notifications and updates' },
  },
];

interface NotificationPreferencesProps {
  role: UserRole;
}

export function NotificationPreferences({ role }: NotificationPreferencesProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const preferenceItems =
    role === 'customer'
      ? CUSTOMER_PREFERENCES
      : role === 'provider'
        ? PROVIDER_PREFERENCES
        : ADMIN_PREFERENCES;

  const loadPreferences = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      const prefs: Record<string, boolean> = {};
      for (const item of preferenceItems) {
        prefs[item.key] = data[item.key] ?? true;
      }
      setPreferences(prefs);
      setSoundEnabled(data.sound_enabled ?? true);
      setQuietHoursEnabled(data.quiet_hours_enabled ?? false);
      if (data.quiet_hours_start) setQuietHoursStart(data.quiet_hours_start);
      if (data.quiet_hours_end) setQuietHoursEnd(data.quiet_hours_end);
    } else {
      // Set defaults
      const prefs: Record<string, boolean> = {};
      for (const item of preferenceItems) {
        prefs[item.key] = true;
      }
      setPreferences(prefs);
    }

    setLoading(false);
  }, [preferenceItems]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const savePreferences = useCallback(async () => {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('notification_preferences').upsert(
      {
        user_id: user.id,
        ...preferences,
        sound_enabled: soundEnabled,
        quiet_hours_enabled: quietHoursEnabled,
        quiet_hours_start: quietHoursEnabled ? quietHoursStart : null,
        quiet_hours_end: quietHoursEnabled ? quietHoursEnd : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (!error) {
      // Update AudioManager sound setting
      getAudioManager().setEnabled(soundEnabled);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }

    setSaving(false);
  }, [preferences, soundEnabled, quietHoursEnabled, quietHoursStart, quietHoursEnd]);

  const togglePreference = (key: string) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Types */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-slate-800">
            {locale === 'ar' ? 'أنواع الإشعارات' : 'Notification Types'}
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {preferenceItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between px-4 py-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">
                  {item.label[isRTL ? 'ar' : 'en']}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {item.description[isRTL ? 'ar' : 'en']}
                </p>
              </div>
              <button
                onClick={() => togglePreference(item.key)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  preferences[item.key] ? 'bg-primary' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    preferences[item.key]
                      ? isRTL
                        ? 'translate-x-[-1.25rem]'
                        : 'translate-x-[1.25rem]'
                      : isRTL
                        ? 'translate-x-[-0.125rem]'
                        : 'translate-x-[0.125rem]'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Sound Settings */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-slate-800">
            {locale === 'ar' ? 'إعدادات الصوت' : 'Sound Settings'}
          </h3>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-800">
              {locale === 'ar' ? 'صوت الإشعارات' : 'Notification Sound'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {locale === 'ar'
                ? 'تشغيل صوت عند وصول إشعار'
                : 'Play sound when notification arrives'}
            </p>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              soundEnabled ? 'bg-primary' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                soundEnabled
                  ? isRTL
                    ? 'translate-x-[-1.25rem]'
                    : 'translate-x-[1.25rem]'
                  : isRTL
                    ? 'translate-x-[-0.125rem]'
                    : 'translate-x-[0.125rem]'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Moon className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-slate-800">
            {locale === 'ar' ? 'وقت الراحة' : 'Quiet Hours'}
          </h3>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-slate-800">
                {locale === 'ar' ? 'تفعيل وقت الراحة' : 'Enable Quiet Hours'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {locale === 'ar'
                  ? 'كتم الإشعارات في أوقات محددة'
                  : 'Mute notifications during specified times'}
              </p>
            </div>
            <button
              onClick={() => setQuietHoursEnabled(!quietHoursEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                quietHoursEnabled ? 'bg-primary' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  quietHoursEnabled
                    ? isRTL
                      ? 'translate-x-[-1.25rem]'
                      : 'translate-x-[1.25rem]'
                    : isRTL
                      ? 'translate-x-[-0.125rem]'
                      : 'translate-x-[0.125rem]'
                }`}
              />
            </button>
          </div>

          {quietHoursEnabled && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">
                  {locale === 'ar' ? 'من' : 'From'}
                </label>
                <input
                  type="time"
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">
                  {locale === 'ar' ? 'إلى' : 'To'}
                </label>
                <input
                  type="time"
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={savePreferences}
        disabled={saving}
        className={`w-full py-3 rounded-xl font-medium transition-colors ${
          saved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary/90'
        }`}
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        ) : saved ? (
          locale === 'ar' ? (
            'تم الحفظ ✓'
          ) : (
            'Saved ✓'
          )
        ) : locale === 'ar' ? (
          'حفظ التفضيلات'
        ) : (
          'Save Preferences'
        )}
      </button>
    </div>
  );
}
