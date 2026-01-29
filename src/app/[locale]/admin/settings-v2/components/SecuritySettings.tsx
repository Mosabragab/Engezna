/**
 * Security & System Settings Tab
 *
 * Manages maintenance mode (providers/customers) and admin password change.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Mail,
  Store,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface SecuritySettingsTabProps {
  isRTL: boolean;
  user: User;
}

interface MaintenanceSettings {
  providers_maintenance: boolean;
  customers_maintenance: boolean;
  maintenance_message_ar: string;
  maintenance_message_en: string;
}

const DEFAULT_MAINTENANCE: MaintenanceSettings = {
  providers_maintenance: false,
  customers_maintenance: true, // Customers disabled by default for launch
  maintenance_message_ar: 'المنصة تحت الصيانة - نعود قريباً',
  maintenance_message_en: 'Platform under maintenance - Coming soon',
};

const MAINTENANCE_KEY = 'maintenance_settings';

export function SecuritySettingsTab({ isRTL, user }: SecuritySettingsTabProps) {
  // Maintenance mode state
  const [maintenance, setMaintenance] = useState<MaintenanceSettings>(DEFAULT_MAINTENANCE);
  const [loadingMaintenance, setLoadingMaintenance] = useState(true);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [maintenanceSuccess, setMaintenanceSuccess] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Load maintenance settings on mount
  useEffect(() => {
    loadMaintenanceSettings();
  }, []);

  const loadMaintenanceSettings = async () => {
    setLoadingMaintenance(true);
    setMaintenanceError(null);
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', MAINTENANCE_KEY)
        .single();

      if (error) {
        // PGRST116 = row not found, which is OK
        // 42P01 = table doesn't exist
        if (error.code === '42P01') {
          console.error('app_settings table does not exist. Please run migration.');
          setMaintenanceError(
            isRTL
              ? 'جدول الإعدادات غير موجود. يرجى تشغيل التحديثات.'
              : 'Settings table not found. Please run database migrations.'
          );
        } else if (error.code !== 'PGRST116') {
          console.error('Error loading maintenance settings:', error);
          setMaintenanceError(
            isRTL
              ? `خطأ في تحميل الإعدادات: ${error.message}`
              : `Error loading settings: ${error.message}`
          );
        }
        // PGRST116 is OK - just means no data yet
      }

      if (data?.setting_value) {
        setMaintenance({ ...DEFAULT_MAINTENANCE, ...data.setting_value });
      }
    } catch (err) {
      console.error('Error loading maintenance settings:', err);
      setMaintenanceError(
        isRTL ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'
      );
    }

    setLoadingMaintenance(false);
  };

  // Handle maintenance mode save
  const handleSaveMaintenance = async () => {
    setSavingMaintenance(true);
    setMaintenanceError(null);
    setMaintenanceSuccess(false);

    const supabase = createClient();

    try {
      // Try to update first
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('setting_key', MAINTENANCE_KEY)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('app_settings')
          .update({
            setting_value: maintenance,
            updated_at: new Date().toISOString(),
          })
          .eq('setting_key', MAINTENANCE_KEY);

        if (error) throw error;
      } else {
        // Insert new (using correct column names and valid enum value)
        const { error } = await supabase.from('app_settings').insert({
          setting_key: MAINTENANCE_KEY,
          setting_value: maintenance,
          category: 'security', // Valid enum: security, general, payment, delivery, notifications
          description: 'Maintenance mode settings',
          description_ar: 'إعدادات وضع الصيانة',
          is_sensitive: false,
          is_readonly: false,
        });

        if (error) throw error;
      }

      setMaintenanceSuccess(true);
      setTimeout(() => setMaintenanceSuccess(false), 3000);
    } catch (err: unknown) {
      console.error('Error saving maintenance settings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      // Check for common errors
      if (errorMessage.includes('42P01') || errorMessage.includes('does not exist')) {
        setMaintenanceError(
          isRTL
            ? 'جدول الإعدادات غير موجود. يرجى تشغيل التحديثات.'
            : 'Settings table not found. Please run database migrations.'
        );
      } else if (errorMessage.includes('permission') || errorMessage.includes('policy')) {
        setMaintenanceError(
          isRTL
            ? 'لا تملك صلاحية تعديل الإعدادات'
            : 'You do not have permission to modify settings'
        );
      } else {
        setMaintenanceError(
          isRTL
            ? `فشل في حفظ الإعدادات: ${errorMessage}`
            : `Failed to save settings: ${errorMessage}`
        );
      }
    }

    setSavingMaintenance(false);
  };

  // Handle password change
  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(isRTL ? 'جميع الحقول مطلوبة' : 'All fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(
        isRTL
          ? 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'
          : 'New password must be at least 6 characters'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        isRTL ? 'كلمة المرور الجديدة غير متطابقة' : 'New passwords do not match'
      );
      return;
    }

    setChangingPassword(true);

    const supabase = createClient();

    // First verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || '',
      password: currentPassword,
    });

    if (signInError) {
      setPasswordError(
        isRTL ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect'
      );
      setChangingPassword(false);
      return;
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setPasswordError(
        isRTL ? 'فشل في تغيير كلمة المرور' : 'Failed to change password'
      );
      setChangingPassword(false);
      return;
    }

    // Success
    setPasswordSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(false), 3000);
    setChangingPassword(false);
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Maintenance Mode Card */}
      <Card className="border-amber-200">
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle className={`flex items-center gap-2 text-amber-700 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
            <Wrench className="w-5 h-5" />
            {isRTL ? 'وضع الصيانة' : 'Maintenance Mode'}
          </CardTitle>
          <CardDescription>
            {isRTL
              ? 'تحكم في وصول التجار والعملاء للمنصة بشكل منفصل'
              : 'Control provider and customer access to the platform separately'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {loadingMaintenance ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            </div>
          ) : (
            <>
              {/* Provider Maintenance */}
              <div className={`flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                  <Store className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-slate-800">
                      {isRTL ? 'صيانة التجار' : 'Provider Maintenance'}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {isRTL
                        ? 'عند التفعيل، لن يتمكن التجار من الوصول للوحة التحكم'
                        : 'When enabled, providers cannot access the dashboard'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={maintenance.providers_maintenance}
                  onClick={() =>
                    setMaintenance((prev) => ({
                      ...prev,
                      providers_maintenance: !prev.providers_maintenance,
                    }))
                  }
                  className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                    maintenance.providers_maintenance ? 'bg-red-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      maintenance.providers_maintenance
                        ? 'ltr:translate-x-8 rtl:translate-x-1'
                        : 'ltr:translate-x-1 rtl:translate-x-8'
                    }`}
                  />
                </button>
              </div>

              {/* Customer Maintenance */}
              <div className={`flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                  <Users className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-slate-800">
                      {isRTL ? 'صيانة العملاء' : 'Customer Maintenance'}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {isRTL
                        ? 'عند التفعيل، لن يتمكن العملاء من تصفح المتاجر أو إنشاء طلبات'
                        : 'When enabled, customers cannot browse stores or create orders'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={maintenance.customers_maintenance}
                  onClick={() =>
                    setMaintenance((prev) => ({
                      ...prev,
                      customers_maintenance: !prev.customers_maintenance,
                    }))
                  }
                  className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                    maintenance.customers_maintenance ? 'bg-red-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      maintenance.customers_maintenance
                        ? 'ltr:translate-x-8 rtl:translate-x-1'
                        : 'ltr:translate-x-1 rtl:translate-x-8'
                    }`}
                  />
                </button>
              </div>

              {/* Save Button - Below toggles */}
              <div className={`flex items-center justify-between p-4 bg-red-50 rounded-lg border-2 border-red-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="flex items-center gap-2">
                  {maintenanceSuccess && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">
                        {isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully'}
                      </span>
                    </div>
                  )}
                  {maintenanceError && (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">{maintenanceError}</span>
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleSaveMaintenance}
                  disabled={savingMaintenance}
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 shadow-md"
                >
                  {savingMaintenance ? (
                    <Loader2 className="w-5 h-5 animate-spin me-2" />
                  ) : (
                    <Wrench className="w-5 h-5 me-2" />
                  )}
                  {isRTL ? 'حفظ الإعدادات' : 'Save Settings'}
                </Button>
              </div>

              {/* Launch Info */}
              <div className={`flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <AlertTriangle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-800">
                    {isRTL ? 'نصيحة للإطلاق' : 'Launch Tip'}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    {isRTL
                      ? 'للمرحلة الأولى: أغلق وصول العملاء واسمح للتجار بالتسجيل والإعداد'
                      : 'For Phase 1: Disable customer access and allow providers to register and setup'}
                  </p>
                </div>
              </div>

              {/* Maintenance Messages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="msg_ar">
                    {isRTL ? 'رسالة الصيانة (عربي)' : 'Maintenance Message (Arabic)'}
                  </Label>
                  <Input
                    id="msg_ar"
                    value={maintenance.maintenance_message_ar}
                    onChange={(e) =>
                      setMaintenance((prev) => ({
                        ...prev,
                        maintenance_message_ar: e.target.value,
                      }))
                    }
                    dir="rtl"
                    placeholder="المنصة تحت الصيانة..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="msg_en">
                    {isRTL ? 'رسالة الصيانة (إنجليزي)' : 'Maintenance Message (English)'}
                  </Label>
                  <Input
                    id="msg_en"
                    value={maintenance.maintenance_message_en}
                    onChange={(e) =>
                      setMaintenance((prev) => ({
                        ...prev,
                        maintenance_message_en: e.target.value,
                      }))
                    }
                    dir="ltr"
                    placeholder="Platform under maintenance..."
                  />
                </div>
              </div>

            </>
          )}
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
          </CardTitle>
          <CardDescription>
            {isRTL
              ? 'قم بتحديث كلمة مرور حسابك الإداري'
              : 'Update your admin account password'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Admin Email Display */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">
                  {isRTL ? 'البريد الإلكتروني' : 'Email'}
                </p>
                <p className="font-medium text-gray-900">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Password Fields */}
          <div className="space-y-4 max-w-md">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="current_password">
                {isRTL ? 'كلمة المرور الحالية' : 'Current Password'}
              </Label>
              <div className="relative">
                <Input
                  id="current_password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={
                    isRTL ? 'أدخل كلمة المرور الحالية' : 'Enter current password'
                  }
                  className="pe-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new_password">
                {isRTL ? 'كلمة المرور الجديدة' : 'New Password'}
              </Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={
                    isRTL ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'
                  }
                  className="pe-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm_password">
                {isRTL ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
              </Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={
                    isRTL ? 'أعد إدخال كلمة المرور الجديدة' : 'Re-enter new password'
                  }
                  className="pe-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {passwordError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{passwordError}</span>
              </div>
            )}

            {/* Success Message */}
            {passwordSuccess && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">
                  {isRTL
                    ? 'تم تغيير كلمة المرور بنجاح'
                    : 'Password changed successfully'}
                </span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="w-full flex items-center justify-center gap-2"
            >
              {changingPassword ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">
                {isRTL ? 'نصائح أمنية' : 'Security Tips'}
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>
                  {isRTL
                    ? 'استخدم كلمة مرور قوية تحتوي على أحرف وأرقام ورموز'
                    : 'Use a strong password with letters, numbers, and symbols'}
                </li>
                <li>
                  {isRTL
                    ? 'لا تشارك كلمة المرور مع أي شخص'
                    : "Don't share your password with anyone"}
                </li>
                <li>
                  {isRTL
                    ? 'قم بتغيير كلمة المرور بشكل دوري'
                    : 'Change your password regularly'}
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
