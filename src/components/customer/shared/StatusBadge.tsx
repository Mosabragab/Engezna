'use client'

import { useLocale } from 'next-intl'

type StatusType = 'open' | 'closed' | 'busy' | 'paused' | 'pending'

interface StatusBadgeProps {
  status: StatusType
  size?: 'sm' | 'md' | 'lg'
  showDot?: boolean
  className?: string
}

export function StatusBadge({
  status,
  size = 'md',
  showDot = true,
  className = '',
}: StatusBadgeProps) {
  const locale = useLocale()

  const statusConfig = {
    open: {
      label: locale === 'ar' ? 'مفتوح' : 'Open',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      dotColor: 'bg-green-500',
    },
    closed: {
      label: locale === 'ar' ? 'مغلق' : 'Closed',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      dotColor: 'bg-red-500',
    },
    busy: {
      label: locale === 'ar' ? 'مشغول' : 'Busy',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-700',
      dotColor: 'bg-orange-500',
    },
    paused: {
      label: locale === 'ar' ? 'متوقف' : 'Paused',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      dotColor: 'bg-yellow-500',
    },
    pending: {
      label: locale === 'ar' ? 'قيد المراجعة' : 'Pending',
      bgColor: 'bg-slate-100',
      textColor: 'text-slate-700',
      dotColor: 'bg-slate-500',
    },
  }

  const config = statusConfig[status] || statusConfig.closed

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bgColor} ${config.textColor} ${sizeClasses[size]} ${className}`}
    >
      {showDot && (
        <span className={`${dotSizes[size]} rounded-full ${config.dotColor} animate-pulse`} />
      )}
      {config.label}
    </span>
  )
}
