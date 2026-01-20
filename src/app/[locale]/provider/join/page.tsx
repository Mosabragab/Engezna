'use client';

import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import Link from 'next/link';
import {
  CheckCircle,
  XCircle,
  Clock,
  Store,
  Shield,
  ShoppingBag,
  Package,
  Users,
  BarChart3,
  Tag,
  Loader2,
  LogIn,
  AlertTriangle,
  Lock,
  Mail,
  Eye,
  EyeOff,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface InvitationDetails {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  invitation_token: string;
  can_manage_orders: boolean;
  can_manage_menu: boolean;
  can_manage_customers: boolean;
  can_view_analytics: boolean;
  can_manage_offers: boolean;
  provider: {
    id: string;
    name_ar: string;
    name_en: string;
    logo_url: string | null;
  };
}

type PageState =
  | 'loading'
  | 'register' // New: Show registration form for unauthenticated users
  | 'invalid'
  | 'expired'
  | 'email_mismatch'
  | 'ready'
  | 'accepting'
  | 'registering' // New: Processing registration
  | 'success'
  | 'error';

// ============================================================================
// Permission Display Component
// ============================================================================

function PermissionItem({
  enabled,
  icon: Icon,
  label,
}: {
  enabled: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  if (!enabled) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-slate-700">
      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <span>{label}</span>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function JoinProviderPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Registration form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');

  // Load invitation and check auth status
  useEffect(() => {
    async function loadInvitation() {
      if (!token) {
        setPageState('invalid');
        return;
      }

      const supabase = createClient();

      // First, fetch invitation details (regardless of auth status)
      const { data: inviteData, error: inviteError } = await supabase
        .from('provider_invitations')
        .select(
          `
          id,
          email,
          status,
          expires_at,
          invitation_token,
          can_manage_orders,
          can_manage_menu,
          can_manage_customers,
          can_view_analytics,
          can_manage_offers,
          providers (
            id,
            name_ar,
            name_en,
            logo_url
          )
        `
        )
        .eq('invitation_token', token)
        .single();

      if (inviteError || !inviteData) {
        setPageState('invalid');
        return;
      }

      // Transform provider data
      const invitationWithProvider: InvitationDetails = {
        ...inviteData,
        provider: inviteData.providers as unknown as InvitationDetails['provider'],
      };

      setInvitation(invitationWithProvider);

      // Check invitation status
      if (inviteData.status !== 'pending') {
        setPageState('invalid');
        return;
      }

      // Check if expired
      if (new Date(inviteData.expires_at) < new Date()) {
        setPageState('expired');
        return;
      }

      // Now check if user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Not authenticated - show registration form
        setIsAuthenticated(false);
        setPageState('register');
        return;
      }

      // User is authenticated
      setIsAuthenticated(true);

      // Get user email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      setUserEmail(profile?.email || user.email || null);

      // Check email match
      const inviteEmail = inviteData.email.toLowerCase();
      const currentEmail = (profile?.email || user.email || '').toLowerCase();

      if (inviteEmail !== currentEmail) {
        setPageState('email_mismatch');
        return;
      }

      setPageState('ready');
    }

    loadInvitation();
  }, [token]);

  // Handle registration form submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validate passwords
    if (password.length < 6) {
      setFormError(
        locale === 'ar'
          ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
          : 'Password must be at least 6 characters'
      );
      return;
    }

    if (password !== confirmPassword) {
      setFormError(locale === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    if (!invitation || !token) return;

    setPageState('registering');

    try {
      const supabase = createClient();

      // Call API to register and accept invitation
      const response = await fetch('/api/auth/staff-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invitation.email,
          password,
          invitationToken: token,
          locale,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setFormError(
          result.error || (locale === 'ar' ? 'حدث خطأ أثناء التسجيل' : 'Registration failed')
        );
        setPageState('register');
        return;
      }

      // Sign in the user to establish a session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password,
      });

      if (signInError) {
        console.error('Sign in error after registration:', signInError);
        // Still show success - user can login manually
      }

      // Success
      setPageState('success');

      // Redirect to provider dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = `/${locale}/provider`;
      }, 2000);
    } catch (err) {
      console.error('Registration error:', err);
      setFormError(locale === 'ar' ? 'حدث خطأ أثناء التسجيل' : 'Registration failed');
      setPageState('register');
    }
  };

  // Accept invitation (for authenticated users)
  const handleAccept = async () => {
    if (!token) return;

    setPageState('accepting');
    const supabase = createClient();

    try {
      const { data, error: rpcError } = await supabase.rpc('accept_provider_invitation', {
        invitation_token: token,
      });

      if (rpcError) throw rpcError;

      if (!data?.success) {
        setError(data?.error || (locale === 'ar' ? 'حدث خطأ' : 'An error occurred'));
        setPageState('error');
        return;
      }

      setPageState('success');

      // Redirect to provider dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = `/${locale}/provider`;
      }, 2000);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError(locale === 'ar' ? 'حدث خطأ أثناء قبول الدعوة' : 'Error accepting invitation');
      setPageState('error');
    }
  };

  // Get provider name based on locale
  const providerName = invitation?.provider
    ? locale === 'ar'
      ? invitation.provider.name_ar
      : invitation.provider.name_en
    : '';

  // Permission labels
  const permissionLabels = {
    orders: locale === 'ar' ? 'إدارة الطلبات والمرتجعات' : 'Manage Orders & Refunds',
    menu: locale === 'ar' ? 'إدارة المنتجات' : 'Manage Products',
    customers: locale === 'ar' ? 'عرض بيانات العملاء' : 'View Customer Data',
    analytics: locale === 'ar' ? 'عرض التحليلات' : 'View Analytics',
    offers: locale === 'ar' ? 'إدارة العروض والبانرات' : 'Manage Offers & Banners',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href={`/${locale}`} className="inline-block">
            <EngeznaLogo size="lg" static showPen={false} />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-elegant overflow-hidden">
          {/* Loading State */}
          {pageState === 'loading' && (
            <div className="p-8 text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-slate-600">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
            </div>
          )}

          {/* Registration Form (for unauthenticated users) */}
          {pageState === 'register' && invitation && (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5 text-white text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-xl flex items-center justify-center">
                  <Store className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold mb-1">
                  {locale === 'ar' ? 'انضم إلى الفريق' : 'Join the Team'}
                </h2>
                <p className="text-white/80 text-sm">{providerName}</p>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleRegister} className="p-6 space-y-5">
                {/* Error Message */}
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{formError}</span>
                  </div>
                )}

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email">{locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}</Label>
                  <div className="relative">
                    <Mail
                      className={`absolute ${locale === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`}
                    />
                    <Input
                      id="email"
                      type="email"
                      value={invitation.email}
                      readOnly
                      className={`${locale === 'ar' ? 'pr-10' : 'pl-10'} bg-slate-50 text-slate-600`}
                      dir="ltr"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {locale === 'ar'
                      ? 'هذا هو البريد الإلكتروني المرتبط بالدعوة'
                      : 'This is the email associated with the invitation'}
                  </p>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">{locale === 'ar' ? 'كلمة المرور' : 'Password'}</Label>
                  <div className="relative">
                    <Lock
                      className={`absolute ${locale === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`}
                    />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={locale === 'ar' ? 'أدخل كلمة المرور' : 'Enter password'}
                      className={`${locale === 'ar' ? 'pr-10 pl-10' : 'pl-10 pr-10'}`}
                      dir="ltr"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute ${locale === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600`}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    {locale === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                  </Label>
                  <div className="relative">
                    <Lock
                      className={`absolute ${locale === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`}
                    />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={locale === 'ar' ? 'أعد إدخال كلمة المرور' : 'Re-enter password'}
                      className={`${locale === 'ar' ? 'pr-10 pl-10' : 'pl-10 pr-10'}`}
                      dir="ltr"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute ${locale === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600`}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Permissions Preview */}
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-slate-700">
                      {locale === 'ar' ? 'الصلاحيات الممنوحة:' : 'Granted Permissions:'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <PermissionItem
                      enabled={invitation.can_manage_orders}
                      icon={ShoppingBag}
                      label={permissionLabels.orders}
                    />
                    <PermissionItem
                      enabled={invitation.can_manage_menu}
                      icon={Package}
                      label={permissionLabels.menu}
                    />
                    <PermissionItem
                      enabled={invitation.can_manage_customers}
                      icon={Users}
                      label={permissionLabels.customers}
                    />
                    <PermissionItem
                      enabled={invitation.can_view_analytics}
                      icon={BarChart3}
                      label={permissionLabels.analytics}
                    />
                    <PermissionItem
                      enabled={invitation.can_manage_offers}
                      icon={Tag}
                      label={permissionLabels.offers}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button type="submit" className="w-full" size="lg">
                  <CheckCircle className="w-5 h-5 me-2" />
                  {locale === 'ar' ? 'إنشاء الحساب والانضمام' : 'Create Account & Join'}
                </Button>

                {/* Login Link */}
                <p className="text-center text-sm text-slate-500">
                  {locale === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
                  <Link
                    href={`/${locale}/provider/login?redirect=${encodeURIComponent(`/${locale}/provider/join?token=${token}`)}`}
                    className="text-primary hover:underline font-medium"
                  >
                    <LogIn className="w-4 h-4 inline me-1" />
                    {locale === 'ar' ? 'سجل دخول' : 'Login'}
                  </Link>
                </p>
              </form>
            </>
          )}

          {/* Registering State */}
          {pageState === 'registering' && (
            <div className="p-8 text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-slate-600">
                {locale === 'ar' ? 'جاري إنشاء الحساب...' : 'Creating account...'}
              </p>
            </div>
          )}

          {/* Invalid Invitation */}
          {pageState === 'invalid' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                {locale === 'ar' ? 'دعوة غير صالحة' : 'Invalid Invitation'}
              </h2>
              <p className="text-slate-500 mb-6">
                {locale === 'ar'
                  ? 'هذه الدعوة غير صالحة أو تم استخدامها مسبقاً'
                  : 'This invitation is invalid or has already been used'}
              </p>
              <Button asChild variant="outline">
                <Link href={`/${locale}`}>{locale === 'ar' ? 'العودة للرئيسية' : 'Go Home'}</Link>
              </Button>
            </div>
          )}

          {/* Expired Invitation */}
          {pageState === 'expired' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                {locale === 'ar' ? 'انتهت صلاحية الدعوة' : 'Invitation Expired'}
              </h2>
              <p className="text-slate-500 mb-6">
                {locale === 'ar'
                  ? 'انتهت صلاحية هذه الدعوة. يرجى التواصل مع صاحب المتجر لإرسال دعوة جديدة.'
                  : 'This invitation has expired. Please contact the store owner to send a new invitation.'}
              </p>
              <Button asChild variant="outline">
                <Link href={`/${locale}`}>{locale === 'ar' ? 'العودة للرئيسية' : 'Go Home'}</Link>
              </Button>
            </div>
          )}

          {/* Email Mismatch */}
          {pageState === 'email_mismatch' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                {locale === 'ar' ? 'البريد الإلكتروني غير متطابق' : 'Email Mismatch'}
              </h2>
              <p className="text-slate-500 mb-4">
                {locale === 'ar'
                  ? 'هذه الدعوة مرسلة لبريد إلكتروني مختلف عن حسابك الحالي.'
                  : 'This invitation was sent to a different email address than your current account.'}
              </p>
              <div className="p-3 bg-slate-50 rounded-lg mb-6 text-sm">
                <p className="text-slate-600">
                  {locale === 'ar' ? 'الدعوة مرسلة إلى:' : 'Invitation sent to:'}{' '}
                  <span className="font-medium text-slate-800">{invitation?.email}</span>
                </p>
                <p className="text-slate-600 mt-1">
                  {locale === 'ar' ? 'حسابك الحالي:' : 'Your account:'}{' '}
                  <span className="font-medium text-slate-800">{userEmail}</span>
                </p>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                {locale === 'ar'
                  ? 'يرجى تسجيل الدخول بالحساب الصحيح أو التواصل مع صاحب المتجر.'
                  : 'Please login with the correct account or contact the store owner.'}
              </p>
              <Button asChild variant="outline">
                <Link
                  href={`/${locale}/provider/login?redirect=${encodeURIComponent(`/${locale}/provider/join?token=${token}`)}`}
                >
                  {locale === 'ar' ? 'تسجيل الدخول بحساب آخر' : 'Login with Different Account'}
                </Link>
              </Button>
            </div>
          )}

          {/* Ready to Accept (for authenticated users) */}
          {pageState === 'ready' && invitation && (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5 text-white text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-xl flex items-center justify-center">
                  <Store className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold mb-1">
                  {locale === 'ar' ? 'دعوة للانضمام' : 'Invitation to Join'}
                </h2>
                <p className="text-white/80 text-sm">
                  {locale === 'ar'
                    ? `تمت دعوتك للانضمام إلى فريق ${providerName}`
                    : `You've been invited to join ${providerName}`}
                </p>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Store Name */}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-slate-800">{providerName}</h3>
                </div>

                {/* Permissions */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="font-medium text-slate-800">
                      {locale === 'ar' ? 'الصلاحيات الممنوحة:' : 'Granted Permissions:'}
                    </span>
                  </div>
                  <div className="space-y-2 bg-slate-50 rounded-xl p-4">
                    <PermissionItem
                      enabled={invitation.can_manage_orders}
                      icon={ShoppingBag}
                      label={permissionLabels.orders}
                    />
                    <PermissionItem
                      enabled={invitation.can_manage_menu}
                      icon={Package}
                      label={permissionLabels.menu}
                    />
                    <PermissionItem
                      enabled={invitation.can_manage_customers}
                      icon={Users}
                      label={permissionLabels.customers}
                    />
                    <PermissionItem
                      enabled={invitation.can_view_analytics}
                      icon={BarChart3}
                      label={permissionLabels.analytics}
                    />
                    <PermissionItem
                      enabled={invitation.can_manage_offers}
                      icon={Tag}
                      label={permissionLabels.offers}
                    />
                  </div>
                </div>

                {/* Accept Button */}
                <Button onClick={handleAccept} className="w-full" size="lg">
                  <CheckCircle className="w-5 h-5 me-2" />
                  {locale === 'ar' ? 'قبول الدعوة' : 'Accept Invitation'}
                </Button>

                {/* Decline Link */}
                <p className="text-center mt-4">
                  <Link href={`/${locale}`} className="text-sm text-slate-500 hover:text-slate-700">
                    {locale === 'ar' ? 'رفض الدعوة' : 'Decline Invitation'}
                  </Link>
                </p>
              </div>
            </>
          )}

          {/* Accepting */}
          {pageState === 'accepting' && (
            <div className="p-8 text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-slate-600">
                {locale === 'ar' ? 'جاري قبول الدعوة...' : 'Accepting invitation...'}
              </p>
            </div>
          )}

          {/* Success */}
          {pageState === 'success' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                {locale === 'ar' ? 'تم بنجاح!' : 'Success!'}
              </h2>
              <p className="text-slate-500 mb-4">
                {locale === 'ar'
                  ? `تمت إضافتك كمشرف في ${providerName}`
                  : `You've been added as a staff member to ${providerName}`}
              </p>
              <p className="text-sm text-slate-400">
                {locale === 'ar' ? 'جاري التحويل للوحة التحكم...' : 'Redirecting to dashboard...'}
              </p>
            </div>
          )}

          {/* Error */}
          {pageState === 'error' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                {locale === 'ar' ? 'حدث خطأ' : 'Error'}
              </h2>
              <p className="text-slate-500 mb-6">{error}</p>
              <Button onClick={() => setPageState('ready')} variant="outline">
                {locale === 'ar' ? 'حاول مرة أخرى' : 'Try Again'}
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-sm text-slate-400">
          {locale === 'ar'
            ? 'إنجزنا - منصة لتلبية احتياجات البيت اليومية'
            : 'Engezna - Daily Home Needs Platform'}
        </p>
      </div>
    </div>
  );
}
