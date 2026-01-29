/**
 * Admin Settings V2 Page
 *
 * Modern settings management page using React hooks.
 * Features:
 * - Tab-based navigation
 * - Isolated components per section
 * - Real-time validation with Zod
 * - Audit trail (changelog) display
 */

'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import {
  Percent,
  Building,
  CreditCard,
  Truck,
  Settings,
  Loader2,
} from 'lucide-react';

// Tab Components
import {
  CommissionSettingsTab,
  GeneralSettingsTab,
  PaymentSettingsTab,
  DeliverySettingsTab,
} from './components';

export default function AdminSettingsV2Page() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user on mount
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
      setLoading(false);
    };
    fetchUser();
  }, []);

  const tabs = [
    {
      id: 'commission',
      label: isRTL ? 'العمولة' : 'Commission',
      icon: Percent,
    },
    {
      id: 'general',
      label: isRTL ? 'المنصة' : 'Platform',
      icon: Building,
    },
    {
      id: 'payment',
      label: isRTL ? 'الدفع' : 'Payment',
      icon: CreditCard,
    },
    {
      id: 'delivery',
      label: isRTL ? 'التوصيل' : 'Delivery',
      icon: Truck,
    },
  ];

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <AdminHeader
        user={user}
        title={isRTL ? 'إعدادات المنصة' : 'Platform Settings'}
        onMenuClick={toggleSidebar}
      />

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">
              {isRTL ? 'إعدادات المنصة' : 'Platform Settings'}
            </h1>
          </div>
          <p className="text-gray-600">
            {isRTL
              ? 'إدارة إعدادات العمولة والدفع والتوصيل للمنصة'
              : 'Manage commission, payment, and delivery settings for the platform'}
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="commission" className="w-full">
          <TabsList className="w-full justify-start bg-white border rounded-lg p-1 mb-6 flex-wrap">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Commission Tab */}
          <TabsContent value="commission">
            <CommissionSettingsTab isRTL={isRTL} />
          </TabsContent>

          {/* General/Platform Tab */}
          <TabsContent value="general">
            <GeneralSettingsTab isRTL={isRTL} />
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment">
            <PaymentSettingsTab isRTL={isRTL} />
          </TabsContent>

          {/* Delivery Tab */}
          <TabsContent value="delivery">
            <DeliverySettingsTab isRTL={isRTL} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
