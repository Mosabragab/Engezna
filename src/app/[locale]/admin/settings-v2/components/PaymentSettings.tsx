/**
 * Payment Settings Tab
 *
 * Manages payment methods and configurations.
 * Uses usePaymentMethods hook.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  CreditCard,
  Banknote,
  Wallet,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  usePaymentMethods,
  useUpdateAppSetting,
  useAppSettingsChangelog,
} from '@/hooks/useSettings';
import { SETTING_KEYS, type PaymentMethods } from '@/lib/settings';
import { SettingsChangelogDisplay } from './SettingsChangelog';

interface PaymentSettingsTabProps {
  isRTL: boolean;
}

export function PaymentSettingsTab({ isRTL }: PaymentSettingsTabProps) {
  // Fetch payment methods
  const { data: settings, isLoading, error } = usePaymentMethods();
  const updateMutation = useUpdateAppSetting();
  const { data: changelog, isLoading: changelogLoading } = useAppSettingsChangelog(
    SETTING_KEYS.PAYMENT_METHODS,
    10
  );

  // Local form state
  const [formData, setFormData] = useState<PaymentMethods>({
    cod_enabled: true,
    cod_label_ar: '',
    cod_label_en: '',
    online_payment_enabled: false,
    wallet_payment_enabled: true,
    min_order_for_online_payment: 0,
  });

  // Sync form data with fetched settings
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Handle save
  const handleSave = async () => {
    await updateMutation.mutateAsync({
      key: SETTING_KEYS.PAYMENT_METHODS,
      value: formData,
      reason: 'Updated payment methods from admin settings',
    });
  };

  // Handle input change
  const handleChange = (field: keyof PaymentMethods, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ms-2 text-gray-600">
            {isRTL ? 'جاري التحميل...' : 'Loading...'}
          </span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-8 flex items-center justify-center text-red-600">
          <AlertCircle className="w-6 h-6" />
          <span className="ms-2">
            {isRTL ? 'فشل في تحميل الإعدادات' : 'Failed to load settings'}
          </span>
        </CardContent>
      </Card>
    );
  }

  const paymentMethods = [
    {
      id: 'cod',
      icon: Banknote,
      title: isRTL ? 'الدفع عند الاستلام' : 'Cash on Delivery',
      description: isRTL
        ? 'السماح للعملاء بالدفع نقداً عند التسليم'
        : 'Allow customers to pay cash upon delivery',
      enabled: formData.cod_enabled,
      onToggle: () => handleChange('cod_enabled', !formData.cod_enabled),
      color: 'bg-green-100 text-green-700',
    },
    {
      id: 'online',
      icon: CreditCard,
      title: isRTL ? 'الدفع الإلكتروني' : 'Online Payment',
      description: isRTL
        ? 'الدفع عبر البطاقات الائتمانية والخصم المباشر'
        : 'Payment via credit/debit cards',
      enabled: formData.online_payment_enabled,
      onToggle: () => handleChange('online_payment_enabled', !formData.online_payment_enabled),
      color: 'bg-blue-100 text-blue-700',
    },
    {
      id: 'wallet',
      icon: Wallet,
      title: isRTL ? 'محفظة إنجزنا' : 'Engezna Wallet',
      description: isRTL
        ? 'الدفع من رصيد المحفظة الإلكترونية'
        : 'Payment from e-wallet balance',
      enabled: formData.wallet_payment_enabled,
      onToggle: () => handleChange('wallet_payment_enabled', !formData.wallet_payment_enabled),
      color: 'bg-purple-100 text-purple-700',
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            {isRTL ? 'طرق الدفع' : 'Payment Methods'}
          </CardTitle>
          <CardDescription>
            {isRTL
              ? 'تفعيل وتعطيل طرق الدفع المتاحة للعملاء'
              : 'Enable and disable payment methods available to customers'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Payment Methods Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  method.enabled ? 'border-primary bg-primary/5' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${method.color}`}>
                    <method.icon className="w-5 h-5" />
                  </div>
                  <Switch
                    checked={method.enabled}
                    onCheckedChange={method.onToggle}
                  />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">{method.title}</h3>
                <p className="text-sm text-gray-500">{method.description}</p>
              </div>
            ))}
          </div>

          {/* COD Labels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="cod_label_ar">
                {isRTL ? 'اسم الدفع عند الاستلام (عربي)' : 'COD Label (Arabic)'}
              </Label>
              <Input
                id="cod_label_ar"
                value={formData.cod_label_ar}
                onChange={(e) => handleChange('cod_label_ar', e.target.value)}
                dir="rtl"
                placeholder="الدفع عند الاستلام"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cod_label_en">
                {isRTL ? 'اسم الدفع عند الاستلام (إنجليزي)' : 'COD Label (English)'}
              </Label>
              <Input
                id="cod_label_en"
                value={formData.cod_label_en}
                onChange={(e) => handleChange('cod_label_en', e.target.value)}
                dir="ltr"
                placeholder="Cash on Delivery"
              />
            </div>
          </div>

          {/* Online Payment Settings */}
          {formData.online_payment_enabled && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="min_order_online" className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  {isRTL ? 'الحد الأدنى للدفع الإلكتروني' : 'Minimum Order for Online Payment'}
                </Label>
                <div className="relative max-w-xs">
                  <Input
                    id="min_order_online"
                    type="number"
                    min="0"
                    value={formData.min_order_for_online_payment}
                    onChange={(e) =>
                      handleChange('min_order_for_online_payment', parseFloat(e.target.value) || 0)
                    }
                    className="pe-12"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    EGP
                  </span>
                </div>
                <p className="text-xs text-blue-600">
                  {isRTL
                    ? 'الحد الأدنى لقيمة الطلب لإتاحة الدفع الإلكتروني'
                    : 'Minimum order value to enable online payment option'}
                </p>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              {updateMutation.isSuccess && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">
                    {isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully'}
                  </span>
                </div>
              )}
              {updateMutation.isError && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">
                    {isRTL ? 'فشل في الحفظ' : 'Failed to save'}
                  </span>
                </div>
              )}
            </div>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Changelog */}
      <SettingsChangelogDisplay
        changelog={changelog || []}
        isLoading={changelogLoading}
        isRTL={isRTL}
        title={isRTL ? 'سجل تغييرات الدفع' : 'Payment Change History'}
      />
    </div>
  );
}
