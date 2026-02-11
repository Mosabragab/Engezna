/**
 * General/Platform Settings Tab
 *
 * Manages platform info, contact details, and general configuration.
 * Uses usePlatformInfo hook.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Building,
  Mail,
  Phone,
  Globe,
  Clock,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
  Landmark,
  CreditCard,
  Smartphone,
} from 'lucide-react';
import { usePlatformInfo, useUpdateAppSetting, useAppSettingsChangelog } from '@/hooks/useSettings';
import { SETTING_KEYS, type PlatformInfo } from '@/lib/settings';
import { SettingsChangelogDisplay } from './SettingsChangelog';

interface GeneralSettingsTabProps {
  isRTL: boolean;
}

export function GeneralSettingsTab({ isRTL }: GeneralSettingsTabProps) {
  // Fetch platform info
  const { data: settings, isLoading, error } = usePlatformInfo();
  const updateMutation = useUpdateAppSetting();
  const { data: changelog, isLoading: changelogLoading } = useAppSettingsChangelog(
    SETTING_KEYS.PLATFORM_INFO,
    10
  );

  // Local form state
  const [formData, setFormData] = useState<PlatformInfo>({
    app_name_ar: '',
    app_name_en: '',
    support_email: '',
    support_phone: '',
    support_whatsapp: '',
    default_currency: 'EGP',
    default_language: 'ar',
    timezone: 'Africa/Cairo',
    platform_bank_name: '',
    platform_account_holder: '',
    platform_account_number: '',
    platform_iban: '',
    platform_instapay: '',
    platform_vodafone_cash: '',
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
      key: SETTING_KEYS.PLATFORM_INFO,
      value: formData,
      reason: 'Updated platform info from admin settings',
    });
  };

  // Handle input change
  const handleChange = (field: keyof PlatformInfo, value: string) => {
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
            <Building className="w-5 h-5 text-primary" />
            {isRTL ? 'معلومات المنصة' : 'Platform Information'}
          </CardTitle>
          <CardDescription>
            {isRTL
              ? 'معلومات المنصة الأساسية وبيانات الاتصال'
              : 'Basic platform information and contact details'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Platform Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="app_name_ar" className="flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-500" />
                {isRTL ? 'اسم المنصة (عربي)' : 'Platform Name (Arabic)'}
              </Label>
              <Input
                id="app_name_ar"
                value={formData.app_name_ar}
                onChange={(e) => handleChange('app_name_ar', e.target.value)}
                dir="rtl"
                placeholder="إنجزنا"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="app_name_en" className="flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-500" />
                {isRTL ? 'اسم المنصة (إنجليزي)' : 'Platform Name (English)'}
              </Label>
              <Input
                id="app_name_en"
                value={formData.app_name_en}
                onChange={(e) => handleChange('app_name_en', e.target.value)}
                dir="ltr"
                placeholder="Engezna"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="support_email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                {isRTL ? 'بريد الدعم' : 'Support Email'}
              </Label>
              <Input
                id="support_email"
                type="email"
                value={formData.support_email}
                onChange={(e) => handleChange('support_email', e.target.value)}
                dir="ltr"
                placeholder="support@engezna.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="support_phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                {isRTL ? 'هاتف الدعم' : 'Support Phone'}
              </Label>
              <Input
                id="support_phone"
                type="tel"
                value={formData.support_phone}
                onChange={(e) => handleChange('support_phone', e.target.value)}
                dir="ltr"
                placeholder="+201000000000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="support_whatsapp" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-gray-500" />
                {isRTL ? 'واتساب الدعم' : 'Support WhatsApp'}
              </Label>
              <Input
                id="support_whatsapp"
                type="tel"
                value={formData.support_whatsapp || ''}
                onChange={(e) => handleChange('support_whatsapp', e.target.value)}
                dir="ltr"
                placeholder="+201000000000"
              />
            </div>
          </div>

          {/* Regional Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="default_currency" className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-500" />
                {isRTL ? 'العملة الافتراضية' : 'Default Currency'}
              </Label>
              <select
                id="default_currency"
                value={formData.default_currency}
                onChange={(e) => handleChange('default_currency', e.target.value as 'EGP' | 'USD')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="EGP">EGP - {isRTL ? 'جنيه مصري' : 'Egyptian Pound'}</option>
                <option value="USD">USD - {isRTL ? 'دولار أمريكي' : 'US Dollar'}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_language" className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-500" />
                {isRTL ? 'اللغة الافتراضية' : 'Default Language'}
              </Label>
              <select
                id="default_language"
                value={formData.default_language}
                onChange={(e) => handleChange('default_language', e.target.value as 'ar' | 'en')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="ar">{isRTL ? 'العربية' : 'Arabic'}</option>
                <option value="en">{isRTL ? 'الإنجليزية' : 'English'}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                {isRTL ? 'المنطقة الزمنية' : 'Timezone'}
              </Label>
              <select
                id="timezone"
                value={formData.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="Africa/Cairo">Africa/Cairo (GMT+2)</option>
                <option value="Asia/Riyadh">Asia/Riyadh (GMT+3)</option>
                <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                <option value="Europe/London">Europe/London (GMT+0)</option>
              </select>
            </div>
          </div>

          {/* Platform Bank Details */}
          <div className="pt-4 border-t">
            <h3
              className={`text-base font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Landmark className="w-5 h-5 text-primary" />
              {isRTL ? 'البيانات البنكية للمنصة' : 'Platform Bank Details'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {isRTL
                ? 'بيانات الحساب البنكي للمنصة التي سيحول عليها التجار عمولة طلبات الكاش'
                : 'Platform bank account where providers transfer COD commission payments'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="platform_bank_name" className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-gray-500" />
                  {isRTL ? 'اسم البنك' : 'Bank Name'}
                </Label>
                <Input
                  id="platform_bank_name"
                  value={formData.platform_bank_name || ''}
                  onChange={(e) => handleChange('platform_bank_name', e.target.value)}
                  placeholder={isRTL ? 'مثال: البنك الأهلي المصري' : 'e.g. National Bank of Egypt'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform_account_holder" className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-gray-500" />
                  {isRTL ? 'اسم صاحب الحساب' : 'Account Holder Name'}
                </Label>
                <Input
                  id="platform_account_holder"
                  value={formData.platform_account_holder || ''}
                  onChange={(e) => handleChange('platform_account_holder', e.target.value)}
                  placeholder={
                    isRTL ? 'اسم الشركة أو صاحب الحساب' : 'Company or account holder name'
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform_account_number" className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  {isRTL ? 'رقم الحساب' : 'Account Number'}
                </Label>
                <Input
                  id="platform_account_number"
                  value={formData.platform_account_number || ''}
                  onChange={(e) => handleChange('platform_account_number', e.target.value)}
                  dir="ltr"
                  placeholder="1234567890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform_iban" className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  IBAN
                </Label>
                <Input
                  id="platform_iban"
                  value={formData.platform_iban || ''}
                  onChange={(e) => handleChange('platform_iban', e.target.value)}
                  dir="ltr"
                  placeholder="EG380019000500000002631180002"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform_instapay" className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-gray-500" />
                  InstaPay
                </Label>
                <Input
                  id="platform_instapay"
                  value={formData.platform_instapay || ''}
                  onChange={(e) => handleChange('platform_instapay', e.target.value)}
                  dir="ltr"
                  placeholder={isRTL ? 'اسم المستخدم أو رقم الهاتف' : 'Username or phone number'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform_vodafone_cash" className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-gray-500" />
                  {isRTL ? 'فودافون كاش' : 'Vodafone Cash'}
                </Label>
                <Input
                  id="platform_vodafone_cash"
                  value={formData.platform_vodafone_cash || ''}
                  onChange={(e) => handleChange('platform_vodafone_cash', e.target.value)}
                  dir="ltr"
                  placeholder="01XXXXXXXXX"
                />
              </div>
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
        title={isRTL ? 'سجل تغييرات المنصة' : 'Platform Change History'}
      />
    </div>
  );
}
