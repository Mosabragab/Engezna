'use client'

import { ReactNode } from 'react'
import { Check } from 'lucide-react'

interface FilterChipProps {
  label: string
  icon?: ReactNode
  isActive?: boolean
  onClick?: () => void
  className?: string
}

export function FilterChip({
  label,
  icon,
  isActive = false,
  onClick,
  className = '',
}: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
        isActive
          ? 'bg-primary/10 text-primary border border-primary'
          : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
      } ${className}`}
    >
      {isActive && <Check className="w-3.5 h-3.5" />}
      {!isActive && icon && <span className="text-base">{icon}</span>}
      {label}
    </button>
  )
}
