'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Globe, Menu, X, User as UserIcon, LogOut, ShoppingBag } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

export function CustomerNavbar() {
  const locale = useLocale();
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const isRTL = locale === 'ar';
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  const fetchActiveOrdersCount = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', userId)
      .not('status', 'in', '("delivered","cancelled","rejected")');

    if (!error && count !== null) {
      setActiveOrdersCount(count);
    }
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setAuthLoading(false);

      if (user) {
        fetchActiveOrdersCount(user.id);
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchActiveOrdersCount(session.user.id);
        } else {
          setActiveOrdersCount(0);
        }
      });

      return () => subscription.unsubscribe();
    }

    checkAuth();
  }, [fetchActiveOrdersCount]);

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
    { href: `/${locale}`, label: t('home') },
    { href: `/${locale}#services`, label: t('services') },
    { href: `/${locale}#about`, label: t('about') },
    { href: `/${locale}#contact`, label: t('contact') },
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
                className="text-sm font-medium text-gray-700 hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions - Left side in RTL */}
          <div className="flex items-center gap-3">
            {/* Auth Section - Desktop */}
            <div className="hidden md:flex items-center gap-3">
              {authLoading ? (
                <div className="w-24 h-9 bg-gray-100 animate-pulse rounded-lg" />
              ) : user ? (
                <>
                  {/* My Orders */}
                  <Link href={`/${locale}/orders`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative flex items-center gap-2 text-gray-700 hover:text-primary hover:bg-gray-100"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>{locale === 'ar' ? 'طلباتي' : 'My Orders'}</span>
                      {activeOrdersCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">
                          {activeOrdersCount}
                        </span>
                      )}
                    </Button>
                  </Link>

                  {/* Profile */}
                  <Link href={`/${locale}/profile`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 text-gray-700 hover:text-primary hover:bg-gray-100"
                    >
                      <UserIcon className="w-4 h-4" />
                      <span className="max-w-[100px] truncate">{user.email?.split('@')[0]}</span>
                    </Button>
                  </Link>

                  {/* Logout - Always shows text to match brand identity */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-xs">{locale === 'ar' ? 'خروج' : 'Logout'}</span>
                  </Button>
                </>
              ) : (
                <Link href={`/${locale}/auth/login`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary text-primary hover:bg-primary hover:text-white"
                  >
                    {t('login')}
                  </Button>
                </Link>
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
                  className="px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-primary rounded-lg transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Auth Section - Mobile */}
            <div className="border-t pt-4 px-4">
              {authLoading ? (
                <div className="w-full h-10 bg-gray-100 animate-pulse rounded-lg" />
              ) : user ? (
                <div className="space-y-2">
                  <Link
                    href={`/${locale}/orders`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <ShoppingBag className="w-5 h-5 text-primary" />
                    <span className="font-medium">{locale === 'ar' ? 'طلباتي' : 'My Orders'}</span>
                    {activeOrdersCount > 0 && (
                      <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                        {activeOrdersCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href={`/${locale}/profile`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <UserIcon className="w-5 h-5 text-primary" />
                    <span className="font-medium">{user.email?.split('@')[0]}</span>
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
                </div>
              ) : (
                <Link href={`/${locale}/auth/login`}>
                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('login')}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
