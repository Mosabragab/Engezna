'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Globe,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  Headphones,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';

export function MerchantNavbar() {
  const locale = useLocale();
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const isRTL = locale === 'ar';
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setAuthLoading(false);

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    }

    checkAuth();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = `/${locale}`;
  }

  const switchLanguage = useCallback(() => {
    const newLocale = locale === 'ar' ? 'en' : 'ar';
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`);

    document.documentElement.classList.add('no-transition');
    document.documentElement.lang = newLocale;
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';

    router.push(newPathname);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('no-transition');
      });
    });
  }, [locale, pathname, router]);

  const navLinks = [
    { href: `/${locale}#services`, label: t('services') },
    { href: `/${locale}#about`, label: t('about') },
    { href: `/${locale}#contact`, label: t('contact') },
    {
      href: `/${locale}/support`,
      label: locale === 'ar' ? 'الدعم الفني' : 'Support',
      icon: Headphones,
    },
  ];

  return (
    <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Right side in RTL */}
          <Link href={`/${locale}`} className="flex items-center">
            <span className="text-2xl font-bold text-primary font-arabic">
              {locale === 'ar' ? 'إنجزنا' : 'Engezna'}
            </span>
          </Link>

          {/* Desktop Navigation - Center */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-primary transition-colors"
              >
                {link.icon && <link.icon className="w-4 h-4" />}
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions - Left side in RTL */}
          <div className="flex items-center gap-3">
            {/* Auth Section - Desktop */}
            <div className="hidden md:flex items-center gap-3">
              {authLoading ? (
                <div className="w-32 h-9 bg-gray-100 animate-pulse rounded-lg" />
              ) : user ? (
                <>
                  {/* Dashboard Button - Primary CTA */}
                  <Link href={`/${locale}/provider`}>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      {locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                    </Button>
                  </Link>

                  {/* Profile - Links to provider settings for merchants */}
                  <Link href={`/${locale}/provider/settings`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 text-gray-700 hover:text-primary hover:bg-gray-100"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span className="max-w-[100px] truncate">
                        {locale === 'ar' ? 'حسابي' : 'My Account'}
                      </span>
                    </Button>
                  </Link>

                  {/* Logout */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  {/* Dashboard Button for logged out users */}
                  <Link href={`/${locale}/auth/login`}>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      {locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                    </Button>
                  </Link>

                  <Link href={`/${locale}/auth/login`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-700 hover:text-primary hover:bg-gray-100"
                    >
                      {locale === 'ar' ? 'حسابي' : 'My Account'}
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Separator */}
            <div className="hidden md:block w-px h-6 bg-gray-200" />

            {/* Language Switcher */}
            <Button
              variant="ghost"
              size="sm"
              onClick={switchLanguage}
              className="flex items-center gap-1.5 text-gray-700 hover:text-primary hover:bg-gray-100"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">{locale === 'ar' ? 'EN' : 'AR'}</span>
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={
                mobileMenuOpen
                  ? locale === 'ar'
                    ? 'إغلاق القائمة'
                    : 'Close menu'
                  : locale === 'ar'
                    ? 'فتح القائمة'
                    : 'Open menu'
              }
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4 space-y-4">
            {/* Navigation Links */}
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-primary rounded-lg transition-colors"
                >
                  {link.icon && <link.icon className="w-4 h-4" />}
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Auth Section - Mobile */}
            <div className="border-t pt-4 px-4 space-y-3">
              {authLoading ? (
                <div className="w-full h-10 bg-gray-100 animate-pulse rounded-lg" />
              ) : user ? (
                <>
                  {/* Dashboard Button */}
                  <Link href={`/${locale}/provider`}>
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center gap-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <LayoutDashboard className="w-5 h-5" />
                      {locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                    </Button>
                  </Link>

                  <Link
                    href={`/${locale}/provider/settings`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <UserIcon className="w-5 h-5 text-primary" />
                    <div>
                      <span className="font-medium block">
                        {locale === 'ar' ? 'حسابي' : 'My Account'}
                      </span>
                      <span className="text-sm text-gray-500">{user.email?.split('@')[0]}</span>
                    </div>
                  </Link>

                  <Button
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('logout')}
                  </Button>
                </>
              ) : (
                <>
                  <Link href={`/${locale}/auth/login`}>
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center gap-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <LayoutDashboard className="w-5 h-5" />
                      {locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                    </Button>
                  </Link>

                  <Link href={`/${locale}/auth/login`}>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {locale === 'ar' ? 'حسابي' : 'My Account'}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
