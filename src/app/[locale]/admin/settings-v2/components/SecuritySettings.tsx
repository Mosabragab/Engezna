/**
 * Security & System Settings Tab
 *
 * Manages maintenance mode and admin password change.
 */

'use client';

import { useState } from 'react';
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
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Mail,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface SecuritySettingsTabProps {
  isRTL: boolean;
  user: User;
}

export function SecuritySettingsTab({ isRTL, user }: SecuritySettingsTabProps) {
  // Maintenance mode state
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
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

  // Handle maintenance mode toggle
  const handleMaintenanceToggle = async (enabled: boolean) => {
    setMaintenanceLoading(true);
    setMaintenanceError(null);
    setMaintenanceSuccess(false);

    const supabase = createClient();

    // Update platform_settings or app_settings
    const { error } = await supabase
      .from('platform_settings')
      .update({ maintenance_mode: enabled, updated_at: new Date().toISOString() })
      .eq('id', 1); // Assuming single row

    if (error) {
      // Try inserting if no row exists
      const { error: insertError } = await supabase
        .from('platform_settings')
        .upsert({ id: 1, maintenance_mode: enabled, updated_at: new Date().toISOString() });

      if (insertError) {
        setMaintenanceError(
          isRTL ? 'فشل في تحديث وضع الصيانة' : 'Failed to update maintenance mode'
        );
        setMaintenanceLoading(false);
        return;
      }
    }

    setMaintenanceMode(enabled);
    setMaintenanceSuccess(true);
    setTimeout(() => setMaintenanceSuccess(false), 3000);
    setMaintenanceLoading(false);
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
    <div className="space-y-6">
      {/* Maintenance Mode Card */}
      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <Wrench className="w-5 h-5" />
            {isRTL ? 'وضع الصيانة' : 'Maintenance Mode'}
          </CardTitle>
          <CardDescription>
            {isRTL
              ? 'عند تفعيل وضع الصيانة، لن يتمكن العملاء والتجار من الوصول للمنصة'
              : 'When maintenance mode is enabled, customers and providers cannot access the platform'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">
                  {isRTL ? 'تحذير: هذا سيؤثر على جميع المستخدمين' : 'Warning: This affects all users'}
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  {isRTL
                    ? 'سيظهر للمستخدمين رسالة "المنصة تحت الصيانة - نعود قريباً"'
                    : 'Users will see "Platform under maintenance - Coming soon" message'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {maintenanceLoading && <Loader2 className="w-4 h-4 animate-spin text-amber-600" />}
              <Switch
                checked={maintenanceMode}
                onCheckedChange={handleMaintenanceToggle}
                disabled={maintenanceLoading}
                className="data-[state=checked]:bg-amber-600"
              />
            </div>
          </div>

          {maintenanceSuccess && (
            <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm">
                {isRTL
                  ? maintenanceMode
                    ? 'تم تفعيل وضع الصيانة'
                    : 'تم إلغاء وضع الصيانة'
                  : maintenanceMode
                    ? 'Maintenance mode enabled'
                    : 'Maintenance mode disabled'}
              </span>
            </div>
          )}

          {maintenanceError && (
            <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{maintenanceError}</span>
            </div>
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
