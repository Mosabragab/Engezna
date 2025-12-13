/**
 * QuickActionsBar - Quick action buttons for common tasks
 */

'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { QuickAction } from '@/types/chat'

interface QuickActionsBarProps {
  actions: QuickAction[]
  onActionClick: (action: string) => void
  disabled?: boolean
  className?: string
}

export const QuickActionsBar = memo(function QuickActionsBar({
  actions,
  onActionClick,
  disabled = false,
  className,
}: QuickActionsBarProps) {
  return (
    <div className={cn('px-3 py-2 border-b bg-white overflow-x-auto', className)}>
      <div className="flex gap-2 min-w-max">
        {actions.map((action, index) => (
          <motion.button
            key={action.id}
            onClick={() => onActionClick(action.action)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
              'text-xs font-medium whitespace-nowrap',
              'bg-gray-100 text-gray-700',
              'hover:bg-primary/10 hover:text-primary',
              'transition-colors duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-primary/20'
            )}
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <span>{action.icon}</span>
            <span>{action.label_ar}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
})

export default QuickActionsBar
