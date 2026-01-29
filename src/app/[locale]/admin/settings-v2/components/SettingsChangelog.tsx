/**
 * Settings Changelog Component
 *
 * Displays audit trail for settings changes.
 * Used in all settings tabs.
 */

'use client';

import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { History, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { SettingsChangelog } from '@/lib/settings';

interface SettingsChangelogProps {
  changelog: SettingsChangelog[];
  isLoading: boolean;
  isRTL: boolean;
  title?: string;
}

export function SettingsChangelogDisplay({
  changelog,
  isLoading,
  isRTL,
  title,
}: SettingsChangelogProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!changelog || changelog.length === 0) {
    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center text-gray-500">
        <History className="w-5 h-5 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{isRTL ? 'لا توجد تغييرات سابقة' : 'No previous changes'}</p>
      </div>
    );
  }

  const displayedChanges = isExpanded ? changelog : changelog.slice(0, 3);

  return (
    <div className="mt-6">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-t-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2 text-gray-700">
          <History className="w-4 h-4" />
          <span className="font-medium text-sm">
            {title || (isRTL ? 'سجل التغييرات' : 'Change History')}
          </span>
          <span className="text-xs text-gray-500">
            ({changelog.length} {isRTL ? 'تغيير' : 'changes'})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {/* Changelog List */}
      <div className="border border-t-0 rounded-b-lg divide-y bg-white">
        {displayedChanges.map((change) => (
          <div key={change.id} className="p-3 hover:bg-gray-50">
            <div className="flex items-start justify-between gap-4">
              {/* User & Time */}
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-3 h-3 text-primary" />
                </div>
                <div>
                  <span className="font-medium text-gray-900">
                    {change.changed_by_email || (isRTL ? 'النظام' : 'System')}
                  </span>
                  <span className="text-gray-400 mx-2">•</span>
                  <span className="text-gray-500">
                    {formatDistanceToNow(new Date(change.changed_at), {
                      addSuffix: true,
                      locale: isRTL ? ar : enUS,
                    })}
                  </span>
                </div>
              </div>

              {/* Setting Key (if available) */}
              {change.setting_key && (
                <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                  {change.setting_key}
                </span>
              )}
            </div>

            {/* Change Reason */}
            {change.change_reason && (
              <p className="mt-2 text-sm text-gray-600 ps-8">
                {isRTL ? 'السبب: ' : 'Reason: '}
                {change.change_reason}
              </p>
            )}
          </div>
        ))}

        {/* Show More Button */}
        {changelog.length > 3 && !isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full p-2 text-sm text-primary hover:bg-primary/5 transition-colors"
          >
            {isRTL
              ? `عرض ${changelog.length - 3} تغييرات أخرى`
              : `Show ${changelog.length - 3} more changes`}
          </button>
        )}
      </div>
    </div>
  );
}
