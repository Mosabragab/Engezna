'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type HandleType = 'order' | 'provider' | 'track' | 'unknown';

interface ParsedProtocol {
  type: HandleType;
  id?: string;
  action?: string;
}

function parseProtocolUrl(url: string): ParsedProtocol {
  // Handle various protocol formats:
  // web+engezna://track-order/123
  // web+engezna://provider/restaurant-slug
  // web+engezna://order/123

  const cleanUrl = url.replace(/^web\+engezna:\/\//, '');
  const parts = cleanUrl.split('/').filter(Boolean);

  if (parts.length === 0) {
    return { type: 'unknown' };
  }

  const action = parts[0].toLowerCase();
  const id = parts[1];

  switch (action) {
    case 'track-order':
    case 'order':
      return { type: 'order', id, action };
    case 'provider':
    case 'store':
    case 'restaurant':
      return { type: 'provider', id, action };
    default:
      return { type: 'unknown', action };
  }
}

export default function HandlePage() {
  const t = useTranslations('protocolHandler');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const typeParam = searchParams.get('type');

    if (!typeParam) {
      setError(t('noProtocol'));
      setIsProcessing(false);
      return;
    }

    const parsed = parseProtocolUrl(typeParam);

    // Redirect based on parsed protocol
    const redirectUrl = getRedirectUrl(parsed, locale);

    if (redirectUrl) {
      router.replace(redirectUrl);
    } else {
      setError(t('invalidProtocol'));
      setIsProcessing(false);
    }
  }, [searchParams, router, locale, t]);

  function getRedirectUrl(parsed: ParsedProtocol, locale: string): string | null {
    switch (parsed.type) {
      case 'order':
        if (parsed.id) {
          return `/${locale}/orders/${parsed.id}`;
        }
        return `/${locale}/orders`;
      case 'provider':
        if (parsed.id) {
          return `/${locale}/providers/${parsed.id}`;
        }
        return `/${locale}/providers`;
      default:
        return null;
    }
  }

  const handleGoHome = () => {
    router.push(`/${locale}`);
  };

  const handleGoToProviders = () => {
    router.push(`/${locale}/providers`);
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-[#009DE0] animate-spin mb-4" />
        <p className="text-white text-lg">{t('processing')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex flex-col items-center justify-center p-6 text-white"
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold mb-2">{t('errorTitle')}</h1>
        <p className="text-gray-400 text-center mb-8 max-w-sm">{error}</p>

        <div className="w-full max-w-sm space-y-3">
          <Button
            onClick={handleGoToProviders}
            className="w-full bg-[#009DE0] hover:bg-[#0077B6] text-white py-4 rounded-xl flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-5 h-5" />
            {t('browseStores')}
          </Button>

          <Button
            onClick={handleGoHome}
            variant="outline"
            className="w-full border-gray-600 text-white hover:bg-gray-800 py-4 rounded-xl"
          >
            {t('goHome')}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
