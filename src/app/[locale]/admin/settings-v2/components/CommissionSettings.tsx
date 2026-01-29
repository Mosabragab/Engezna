/**
 * Commission Settings Tab
 *
 * Manages commission rates, grace periods, and service fees.
 * Uses useCommissionSettings hook.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Percent,
  Calendar,
  DollarSign,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  useCommissionSettings,
  useUpdateCommissionSettings,
  useCommissionChangelog,
} from '@/hooks/useSettings';
import { SettingsChangelogDisplay } from './SettingsChangelog';

interface CommissionSettingsTabProps {
  isRTL: boolean;
}

export function CommissionSettingsTab({ isRTL }: CommissionSettingsTabProps) {
  // Fetch commission settings
  const { data: settings, isLoading, error } = useCommissionSettings();
  const updateMutation = useUpdateCommissionSettings();
  const { data: changelog, isLoading: changelogLoading } = useCommissionChangelog(10);

  // Local form state
  const [formData, setFormData] = useState({
    commission_enabled: false,
    default_commission_rate: 0,
    max_commission_rate: 7,
    default_grace_period_days: 180,
    service_fee_enabled: false,
    service_fee_amount: 0,
  });

  // Sync form data with fetched settings
  useEffect(() => {
    if (settings) {
      setFormData({
        commission_enabled: settings.commission_enabled,
        default_commission_rate: settings.default_commission_rate,
        max_commission_rate: settings.max_commission_rate,
        default_grace_period_days: settings.default_grace_period_days,
        service_fee_enabled: settings.service_fee_enabled,
        service_fee_amount: settings.service_fee_amount,
      });
    }
  }, [settings]);

  // Handle save
  const handleSave = async () => {
    await updateMutation.mutateAsync({ settings: formData });
  };

  // Handle input change
  const handleChange = (field: string, value: number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ms-2 text-gray-600">{isRTL ? 'جاري التحميل...' : 'Loading...'}</span>
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

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle
            className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}
          >
            <Percent className="w-5 h-5 text-primary" />
            {isRTL ? 'إعدادات العمولة' : 'Commission Settings'}
          </CardTitle>
          <CardDescription>
            {isRTL
              ? 'تحكم في نسب العمولة وفترة السماح للتجار الجدد'
              : 'Control commission rates and grace period for new providers'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Commission Enabled Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label className="font-medium">{isRTL ? 'تفعيل العمولة' : 'Enable Commission'}</Label>
              <p className="text-sm text-gray-500 mt-1">
                {isRTL
                  ? 'تفعيل أو تعطيل نظام العمولة بالكامل'
                  : 'Enable or disable the commission system entirely'}
              </p>
            </div>
            <Switch
              checked={formData.commission_enabled}
              onCheckedChange={(checked) => handleChange('commission_enabled', checked)}
            />
          </div>

          {/* Commission Rates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Default Commission Rate */}
            <div className="space-y-2">
              <Label htmlFor="default_rate" className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-gray-500" />
                {isRTL ? 'نسبة العمولة الافتراضية' : 'Default Commission Rate'}
              </Label>
              <div className="relative">
                <Input
                  id="default_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.default_commission_rate}
                  onChange={(e) =>
                    handleChange('default_commission_rate', parseFloat(e.target.value) || 0)
                  }
                  className="pe-8"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              </div>
              <p className="text-xs text-gray-500">
                {isRTL
                  ? 'النسبة المطبقة على التجار بعد فترة السماح'
                  : 'Rate applied to providers after grace period'}
              </p>
            </div>

            {/* Max Commission Rate */}
            <div className="space-y-2">
              <Label htmlFor="max_rate" className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-gray-500" />
                {isRTL ? 'الحد الأقصى للعمولة' : 'Maximum Commission Rate'}
              </Label>
              <div className="relative">
                <Input
                  id="max_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.max_commission_rate}
                  onChange={(e) =>
                    handleChange('max_commission_rate', parseFloat(e.target.value) || 0)
                  }
                  className="pe-8"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              </div>
              <p className="text-xs text-gray-500">
                {isRTL
                  ? 'أعلى نسبة عمولة يمكن تطبيقها'
                  : 'Highest commission rate that can be applied'}
              </p>
            </div>

            {/* Grace Period Days */}
            <div className="space-y-2">
              <Label htmlFor="grace_period" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                {isRTL ? 'فترة السماح (بالأيام)' : 'Grace Period (days)'}
              </Label>
              <Input
                id="grace_period"
                type="number"
                min="0"
                max="365"
                value={formData.default_grace_period_days}
                onChange={(e) =>
                  handleChange('default_grace_period_days', parseInt(e.target.value) || 0)
                }
              />
              <p className="text-xs text-gray-500">
                {isRTL
                  ? 'الفترة التي لا تُطبق فيها عمولة على التجار الجدد'
                  : 'Period with no commission for new providers'}
              </p>
            </div>

            {/* Service Fee */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="service_fee" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  {isRTL ? 'رسوم الخدمة' : 'Service Fee'}
                </Label>
                <Switch
                  checked={formData.service_fee_enabled}
                  onCheckedChange={(checked) => handleChange('service_fee_enabled', checked)}
                />
              </div>
              <div className="relative">
                <Input
                  id="service_fee"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.service_fee_amount}
                  onChange={(e) =>
                    handleChange('service_fee_amount', parseFloat(e.target.value) || 0)
                  }
                  disabled={!formData.service_fee_enabled}
                  className="pe-12"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  EGP
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {isRTL ? 'رسوم ثابتة تُضاف على كل طلب' : 'Fixed fee added to each order'}
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              {updateMutation.isSuccess && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">{isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully'}</span>
                </div>
              )}
              {updateMutation.isError && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{isRTL ? 'فشل في الحفظ' : 'Failed to save'}</span>
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
        title={isRTL ? 'سجل تغييرات العمولة' : 'Commission Change History'}
      />
    </div>
  );
}
