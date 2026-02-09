'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, Bell, ShoppingBag, Tag, Package } from 'lucide-react';
import { getAudioManager } from '@/lib/audio/audio-manager';
import type { SoundType } from '@/lib/audio/audio-manager';

/**
 * Debug component for testing sound notifications
 * Only visible in development environment
 */
export function SoundTestDebug() {
  const [lastPlayed, setLastPlayed] = useState<string | null>(null);

  // Only render in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const playSound = (type: SoundType, label: string) => {
    const audioManager = getAudioManager();
    audioManager.init();
    audioManager.play(type);
    setLastPlayed(label);
  };

  const audioManager = getAudioManager();

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 shadow-lg max-w-xs">
      <div className="flex items-center gap-2 mb-3 text-yellow-800">
        <Volume2 className="w-5 h-5" />
        <span className="font-bold text-sm">Sound Test (Dev Only)</span>
      </div>

      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 border-green-300 hover:bg-green-50"
          onClick={() => playSound('new-order', 'New Order')}
        >
          <ShoppingBag className="w-4 h-4 text-green-600" />
          <span>Test New Order</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 border-blue-300 hover:bg-blue-50"
          onClick={() => playSound('notification', 'General Alert')}
        >
          <Bell className="w-4 h-4 text-blue-600" />
          <span>Test General Alert</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 border-orange-300 hover:bg-orange-50"
          onClick={() => playSound('order-update', 'Order Status Update')}
        >
          <Package className="w-4 h-4 text-orange-600" />
          <span>Test Order Update</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 border-purple-300 hover:bg-purple-50"
          onClick={() => playSound('custom-order', 'Custom Pricing')}
        >
          <Tag className="w-4 h-4 text-purple-600" />
          <span>Test Custom Pricing</span>
        </Button>
      </div>

      {lastPlayed && (
        <div className="mt-3 text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
          Last played: <span className="font-medium">{lastPlayed}</span>
        </div>
      )}

      <div className="mt-2 text-[10px] text-yellow-600 opacity-70">
        Unlocked: {audioManager.isUnlocked() ? 'Yes' : 'No'} | Enabled:{' '}
        {audioManager.isEnabled() ? 'Yes' : 'No'}
      </div>
    </div>
  );
}
