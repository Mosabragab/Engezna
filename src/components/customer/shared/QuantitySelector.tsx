'use client'

import { Minus, Plus } from 'lucide-react'

interface QuantitySelectorProps {
  quantity: number
  onIncrease: () => void
  onDecrease: () => void
  min?: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function QuantitySelector({
  quantity,
  onIncrease,
  onDecrease,
  min = 0,
  max = 99,
  size = 'md',
  className = '',
}: QuantitySelectorProps) {
  const canDecrease = quantity > min
  const canIncrease = quantity < max

  const sizeClasses = {
    sm: {
      button: 'w-6 h-6',
      icon: 'w-3 h-3',
      text: 'w-6 text-sm',
    },
    md: {
      button: 'w-8 h-8',
      icon: 'w-4 h-4',
      text: 'w-8 text-base',
    },
    lg: {
      button: 'w-10 h-10',
      icon: 'w-5 h-5',
      text: 'w-10 text-lg',
    },
  }

  const classes = sizeClasses[size]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={onDecrease}
        disabled={!canDecrease}
        className={`${classes.button} flex items-center justify-center rounded-full border transition-all ${
          canDecrease
            ? 'border-primary text-primary hover:bg-primary hover:text-white'
            : 'border-slate-200 text-slate-300 cursor-not-allowed'
        }`}
      >
        <Minus className={classes.icon} />
      </button>

      <span className={`${classes.text} text-center font-semibold tabular-nums`}>
        {quantity}
      </span>

      <button
        onClick={onIncrease}
        disabled={!canIncrease}
        className={`${classes.button} flex items-center justify-center rounded-full border transition-all ${
          canIncrease
            ? 'border-primary bg-primary text-white hover:bg-primary/90'
            : 'border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed'
        }`}
      >
        <Plus className={classes.icon} />
      </button>
    </div>
  )
}
