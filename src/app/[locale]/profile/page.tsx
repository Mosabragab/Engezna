'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { clearAppBadge } from '@/hooks/useBadge';
import { CustomerLayout } from '@/components/customer/layout';
import { Card } from '@/components/ui/card';
import {
  User,
  MapPin,
  Mail,
  Lock,
  Globe,
  MapPinned,
  LogOut,
  Loader2,
  ChevronLeft,
  Phone,
  ShoppingBag,
  HeadphonesIcon,
} from 'lucide-react';

interface UserProfile {
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

export default function SettingsPage() {
  const locale = useLocale();
  const t = useTranslations('settings');
  const router = useRouter();
  const isRTL = locale === 'ar';

  const [authLoading, setAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const checkAuth = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/profile`);
      return;
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .single();

    setUserProfile({
      full_name: profile?.full_name || null,
      phone: profile?.phone || null,
      email: user.email || null,
    });

    setAuthLoading(false);
  }, [locale, router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearAppBadge(); // Clear badge on sign out
    router.push(`/${locale}/auth/login`);
  }

  // Loading state
  if (authLoading) {
    return (
      <CustomerLayout headerTitle={t('title')} showBackButton showBottomNav={true}>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    );
  }

  // Unified colors - all icons use primary blue
  const menuItems = [
    {
      icon: ShoppingBag,
      label: t('menu.orders'),
      href: `/${locale}/orders`,
    },
    {
      icon: HeadphonesIcon,
      label: isRTL ? 'الدعم والمساعدة' : 'Support & Help',
      href: `/${locale}/profile/support`,
      highlight: true,
    },
    {
      icon: User,
      label: t('menu.account'),
      href: `/${locale}/profile/account`,
    },
    {
      icon: MapPin,
      label: t('menu.addresses'),
      href: `/${locale}/profile/addresses`,
    },
    {
      icon: Mail,
      label: t('menu.email'),
      href: `/${locale}/profile/email`,
    },
    {
      icon: Lock,
      label: t('menu.password'),
      href: `/${locale}/profile/password`,
    },
    {
      icon: Globe,
      label: t('menu.language'),
      href: `/${locale}/profile/language`,
    },
    {
      icon: MapPinned,
      label: t('menu.governorate'),
      href: `/${locale}/profile/governorate`,
    },
  ];

  return (
    <CustomerLayout headerTitle={t('title')} showBackButton showBottomNav={true}>
      <div className="px-4 py-4 pb-24">
        {/* User Info Card */}
        {userProfile && (
          <Card className="p-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-slate-900 truncate">
                  {userProfile.full_name || (isRTL ? 'مستخدم' : 'User')}
                </h2>
                {userProfile.phone && (
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {userProfile.phone}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Settings Menu Items - Unified colors */}
        <Card className="overflow-hidden">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isHighlight = 'highlight' in item && item.highlight;

            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors ${
                    index < menuItems.length - 1 ? 'border-b border-slate-100' : ''
                  } ${isHighlight ? 'bg-orange-50' : ''}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isHighlight ? 'bg-orange-100' : 'bg-primary/10'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${isHighlight ? 'text-orange-600' : 'text-primary'}`}
                    />
                  </div>
                  <span
                    className={`flex-1 font-medium ${isHighlight ? 'text-orange-900' : 'text-slate-900'}`}
                  >
                    {item.label}
                  </span>
                  <ChevronLeft
                    className={`w-5 h-5 ${isHighlight ? 'text-orange-400' : 'text-slate-400'} ${isRTL ? '' : 'rotate-180'}`}
                  />
                </div>
              </Link>
            );
          })}
        </Card>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full mt-4 bg-red-50 text-red-500 py-3 rounded-xl font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          {t('menu.logout')}
        </button>
      </div>
    </CustomerLayout>
  );
}
