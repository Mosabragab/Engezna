'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const locale = useLocale();
  const t = useTranslations('pwa');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently (within 7 days)
    const dismissedAt = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissedAt) {
      const dismissedDate = new Date(parseInt(dismissedAt));
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show prompt after 30 seconds of browsing
      setTimeout(() => {
        setShowPrompt(true);
      }, 30000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
    } catch (error) {
      console.error('Error installing PWA:', error);
    }

    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt || isInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm animate-in slide-in-from-bottom-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 relative">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 end-3 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-4">
          {/* App Icon - Blue background version */}
          <img
            src="/icons/icon-blue-512.png"
            alt="إنجزنا"
            className="w-14 h-14 rounded-xl flex-shrink-0"
          />

          {/* Text */}
          <div className="flex-1 min-w-0 pe-6">
            <h3 className="font-bold text-slate-900 mb-1">{t('installTitle')}</h3>
            <p className="text-sm text-slate-500 line-clamp-2">{t('installDescription')}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-4">
          <Button
            onClick={handleInstall}
            className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl h-11 font-medium"
          >
            <Download className="w-4 h-4 me-2" />
            {t('installButton')}
          </Button>
          <Button
            onClick={handleDismiss}
            variant="outline"
            className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-xl h-11 font-medium"
          >
            {t('later')}
          </Button>
        </div>
      </div>
    </div>
  );
}
