'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { isNativePlatform, isAndroid } from '@/lib/platform';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';

interface VersionInfo {
  latestVersion: string;
  minimumVersion: string;
  updateUrl: {
    android: string;
    ios: string;
  };
}

function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  return 0;
}

const APP_VERSION = '1.0.0';

export function AppUpdateDialog() {
  const locale = useLocale();
  const [updateType, setUpdateType] = useState<'force' | 'optional' | null>(null);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const checkVersion = useCallback(async () => {
    if (!isNativePlatform()) return;

    try {
      const res = await fetch('/api/app/version');
      if (!res.ok) return;
      const data: VersionInfo = await res.json();
      setVersionInfo(data);

      if (compareVersions(APP_VERSION, data.minimumVersion) < 0) {
        setUpdateType('force');
      } else if (compareVersions(APP_VERSION, data.latestVersion) < 0) {
        setUpdateType('optional');
      }
    } catch {
      // Silently fail - don't block the app
    }
  }, []);

  useEffect(() => {
    checkVersion();
  }, [checkVersion]);

  const handleUpdate = () => {
    if (!versionInfo) return;
    const url = isAndroid() ? versionInfo.updateUrl.android : versionInfo.updateUrl.ios;
    window.open(url, '_blank');
  };

  const handleDismiss = () => {
    if (updateType === 'optional') {
      setDismissed(true);
    }
  };

  if (!updateType || dismissed) return null;

  const isForce = updateType === 'force';

  return (
    <Dialog open={true} onOpenChange={isForce ? undefined : handleDismiss}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={isForce ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={isForce ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <DialogTitle className="text-center">
            {locale === 'ar'
              ? isForce
                ? 'تحديث إلزامي'
                : 'تحديث متاح'
              : isForce
                ? 'Update Required'
                : 'Update Available'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {locale === 'ar'
              ? isForce
                ? 'يجب تحديث التطبيق للاستمرار في استخدامه. الإصدار الحالي لم يعد مدعوماً.'
                : 'يتوفر إصدار جديد من التطبيق مع تحسينات وميزات جديدة.'
              : isForce
                ? 'You must update the app to continue. Your current version is no longer supported.'
                : 'A new version is available with improvements and new features.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={handleUpdate} className="w-full gap-2">
            <Download className="w-4 h-4" />
            {locale === 'ar' ? 'تحديث الآن' : 'Update Now'}
          </Button>
          {!isForce && (
            <Button variant="ghost" onClick={handleDismiss} className="w-full gap-2">
              <RefreshCw className="w-4 h-4" />
              {locale === 'ar' ? 'لاحقاً' : 'Later'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
