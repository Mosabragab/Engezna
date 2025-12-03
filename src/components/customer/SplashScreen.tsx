'use client';

import { useEffect, useState } from 'react';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export function SplashScreen({ onComplete, duration = 2500 }: SplashScreenProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      onComplete?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <EngeznaLogo size="2xl" showPen={true} />
    </div>
  );
}

export default SplashScreen;
