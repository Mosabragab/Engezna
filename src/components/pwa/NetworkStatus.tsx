'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showOnlineMessage, setShowOnlineMessage] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineMessage(true);
      // Hide the "back online" message after 2 seconds
      setTimeout(() => setShowOnlineMessage(false), 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOnlineMessage(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't render anything if online and no message to show
  if (isOnline && !showOnlineMessage) {
    return null;
  }

  return (
    <div
      className={`network-status-bar ${isOnline ? 'online' : 'offline'}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>تم استعادة الاتصال</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>أنت غير متصل بالإنترنت</span>
          </>
        )}
      </div>
    </div>
  );
}

export default NetworkStatus;
