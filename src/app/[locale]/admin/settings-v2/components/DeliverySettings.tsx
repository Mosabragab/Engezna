/**
 * Delivery Settings Tab
 *
 * Manages default delivery settings for the platform.
 * Uses useDeliveryDefaults hook.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Truck,
  Clock,
  MapPin,
  DollarSign,
  Gift,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  useDeliveryDefaults,
  useUpdateAppSetting,
  useAppSettingsChangelog,
} from '@/hooks/useSettings';
import { SETTING_KEYS, type DeliveryDefaults } from '@/lib/settings';
import { SettingsChangelogDisplay } from './SettingsChangelog';

interface DeliverySettingsTabProps {
  isRTL: boolean;
}

export function DeliverySettingsTab({ isRTL }: DeliverySettingsTabProps) {
  // Fetch delivery defaults
  const { data: settings, isLoading, error } = useDeliveryDefaults();
  const updateMutation = useUpdateAppSetting();
  const { data: changelog, isLoading: changelogLoading } = useAppSettingsChangelog(
    SETTING_KEYS.DELIVERY_DEFAULTS,
    10
  );

  // Local form state
  const [formData, setFormData] = useState<DeliveryDefaults>({
    default_delivery_fee: 15,
    default_delivery_time_min: 30,
    default_delivery_radius_km: 5,
    free_delivery_threshold: 200,
    max_delivery_radius_km: 50,
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
      key: SETTING_KEYS.DELIVERY_DEFAULTS,
      value: formData,
      reason: 'Updated delivery defaults from admin settings',
    });
  };

  // Handle input change
  const handleChange = (field: keyof DeliveryDefaults, value: number) => {
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            {isRTL ? 'إعدادات التوصيل' : 'Delivery Settings'}
          </CardTitle>
          <CardDescription>
            {isRTL
              ? 'الإعدادات الافتراضية للتوصيل للتجار الجدد'
              : 'Default delivery settings for new providers'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Delivery Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Default Delivery Fee */}
            <div className="space-y-2">
              <Label htmlFor="delivery_fee" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-500" />
                {isRTL ? 'رسوم التوصيل الافتراضية' : 'Default Delivery Fee'}
              </Label>
              <div className="relative">
                <Input
                  id="delivery_fee"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.default_delivery_fee}
                  onChange={(e) =>
                    handleChange('default_delivery_fee', parseFloat(e.target.value) || 0)
                  }
                  className="pe-12"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  EGP
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {isRTL
                  ? 'رسوم التوصيل الافتراضية للتجار الجدد'
                  : 'Default delivery fee for new providers'}
              </p>
            </div>

            {/* Default Delivery Time */}
            <div className="space-y-2">
              <Label htmlFor="delivery_time" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                {isRTL ? 'وقت التوصيل المتوقع' : 'Estimated Delivery Time'}
              </Label>
              <div className="relative">
                <Input
                  id="delivery_time"
                  type="number"
                  min="0"
                  value={formData.default_delivery_time_min}
                  onChange={(e) =>
                    handleChange('default_delivery_time_min', parseInt(e.target.value) || 0)
                  }
                  className="pe-16"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  {isRTL ? 'دقيقة' : 'min'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {isRTL
                  ? 'الوقت المتوقع للتوصيل بالدقائق'
                  : 'Expected delivery time in minutes'}
              </p>
            </div>

            {/* Default Delivery Radius */}
            <div className="space-y-2">
              <Label htmlFor="delivery_radius" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                {isRTL ? 'نطاق التوصيل الافتراضي' : 'Default Delivery Radius'}
              </Label>
              <div className="relative">
                <Input
                  id="delivery_radius"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.default_delivery_radius_km}
                  onChange={(e) =>
                    handleChange('default_delivery_radius_km', parseFloat(e.target.value) || 0)
                  }
                  className="pe-12"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  km
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {isRTL
                  ? 'نطاق التوصيل الافتراضي بالكيلومترات'
                  : 'Default delivery radius in kilometers'}
              </p>
            </div>

            {/* Max Delivery Radius */}
            <div className="space-y-2">
              <Label htmlFor="max_radius" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                {isRTL ? 'الحد الأقصى للنطاق' : 'Maximum Delivery Radius'}
              </Label>
              <div className="relative">
                <Input
                  id="max_radius"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.max_delivery_radius_km}
                  onChange={(e) =>
                    handleChange('max_delivery_radius_km', parseFloat(e.target.value) || 0)
                  }
                  className="pe-12"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  km
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {isRTL
                  ? 'أقصى نطاق يمكن للتاجر تعيينه'
                  : 'Maximum radius a provider can set'}
              </p>
            </div>
          </div>

          {/* Free Delivery Threshold */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-green-100">
                <Gift className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="free_delivery" className="font-medium text-green-900">
                  {isRTL ? 'حد التوصيل المجاني' : 'Free Delivery Threshold'}
                </Label>
                <p className="text-sm text-green-700">
                  {isRTL
                    ? 'قيمة الطلب التي يتم عندها إعفاء العميل من رسوم التوصيل'
                    : 'Order value at which delivery fee is waived'}
                </p>
                <div className="relative max-w-xs">
                  <Input
                    id="free_delivery"
                    type="number"
                    min="0"
                    value={formData.free_delivery_threshold}
                    onChange={(e) =>
                      handleChange('free_delivery_threshold', parseFloat(e.target.value) || 0)
                    }
                    className="pe-12 bg-white"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    EGP
                  </span>
                </div>
                <p className="text-xs text-green-600">
                  {isRTL
                    ? `الطلبات بقيمة ${formData.free_delivery_threshold} جنيه أو أكثر ستكون التوصيل مجاناً`
                    : `Orders of ${formData.free_delivery_threshold} EGP or more will have free delivery`}
                </p>
              </div>
            </div>
          </div>

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
        title={isRTL ? 'سجل تغييرات التوصيل' : 'Delivery Change History'}
      />
    </div>
  );
}
