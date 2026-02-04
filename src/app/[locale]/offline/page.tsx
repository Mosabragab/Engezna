'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { WifiOff, RefreshCw, Phone, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Customer support contact info
const SUPPORT_PHONE = '+201234567890'; // Replace with actual number

interface CachedRestaurant {
  id: string;
  name: string;
  logo?: string;
}

export default function OfflinePage() {
  const t = useTranslations('offline');
  const [isOnline, setIsOnline] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [cachedRestaurants, setCachedRestaurants] = useState<CachedRestaurant[]>([]);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      // Redirect to home when back online
      window.location.href = '/ar';
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load cached restaurants from localStorage
    try {
      const cached = localStorage.getItem('recently-visited-restaurants');
      if (cached) {
        setCachedRestaurants(JSON.parse(cached).slice(0, 5));
      }
    } catch (e) {
      console.error('Failed to load cached restaurants:', e);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);

    // Check if we're back online
    if (navigator.onLine) {
      window.location.href = '/ar';
      return;
    }

    // Wait a moment and check again
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (navigator.onLine) {
      window.location.href = '/ar';
    } else {
      setIsRetrying(false);
    }
  };

  const handleCallSupport = () => {
    window.location.href = `tel:${SUPPORT_PHONE}`;
  };

  // If we're back online, redirect
  if (isOnline) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <RefreshCw className="w-12 h-12 mx-auto animate-spin text-[#009DE0]" />
          <p className="mt-4 text-lg">{t('redirecting') || 'جاري إعادة التوجيه...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex flex-col items-center justify-center p-6 text-white"
      dir="rtl"
    >
      {/* Logo and Icon */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-gray-700">
          <WifiOff className="w-12 h-12 text-gray-400" />
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-aref-ruqaa), 'Aref Ruqaa', serif" }}>
          إنجزنا
        </h1>
      </div>

      {/* Offline Message */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold mb-3 text-gray-200">
          {t('title') || 'أنت غير متصل بالإنترنت'}
        </h2>
        <p className="text-gray-400 max-w-sm">
          {t('description') || 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى'}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-sm space-y-4">
        {/* Retry Button */}
        <Button
          onClick={handleRetry}
          disabled={isRetrying}
          className="w-full bg-[#009DE0] hover:bg-[#0077B6] text-white py-4 text-lg rounded-xl flex items-center justify-center gap-3"
        >
          <RefreshCw className={`w-5 h-5 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? t('retrying') || 'جاري المحاولة...' : t('retry') || 'إعادة المحاولة'}
        </Button>

        {/* Call Support Button */}
        <Button
          onClick={handleCallSupport}
          variant="outline"
          className="w-full border-gray-600 text-white hover:bg-gray-800 py-4 text-lg rounded-xl flex items-center justify-center gap-3"
        >
          <Phone className="w-5 h-5" />
          {t('callSupport') || 'اتصل بخدمة العملاء'}
        </Button>
      </div>

      {/* Cached Restaurants */}
      {cachedRestaurants.length > 0 && (
        <div className="w-full max-w-sm mt-10">
          <div className="flex items-center gap-2 mb-4 text-gray-400">
            <Store className="w-5 h-5" />
            <span className="text-sm">{t('recentlyVisited') || 'آخر المتاجر التي زرتها'}</span>
          </div>
          <div className="space-y-2">
            {cachedRestaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                className="bg-gray-800/50 rounded-lg p-3 flex items-center gap-3 border border-gray-700"
              >
                <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                  {restaurant.logo ? (
                    <img
                      src={restaurant.logo}
                      alt={restaurant.name}
                      className="w-8 h-8 rounded object-cover"
                    />
                  ) : (
                    <Store className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                <span className="text-gray-300">{restaurant.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-gray-600 text-sm mt-10">
        {t('footer') || 'سيتم إعادة توجيهك تلقائياً عند عودة الاتصال'}
      </p>
    </div>
  );
}
