/**
 * ChatFAB - Floating Action Button for opening AI Chat
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatFABProps {
  onClick: () => void
  isOpen: boolean
  hasUnread?: boolean
  className?: string
}

export function ChatFAB({ onClick, isOpen, hasUnread = false, className }: ChatFABProps) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'fixed z-50 flex items-center justify-center',
        'w-14 h-14 rounded-full shadow-lg',
        'bg-primary hover:bg-primary/90',
        'text-white transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
        // Position: bottom-left for RTL, above bottom nav on mobile
        'bottom-20 left-4 md:bottom-6 md:left-6',
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
    >
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <X className="w-6 h-6" />
          </motion.div>
        ) : (
          <motion.div
            key="open"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            <Sparkles className="w-6 h-6" />

            {/* Unread indicator */}
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip */}
      {!isOpen && (
        <motion.span
          className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 pointer-events-none"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 0, x: -10 }}
          whileHover={{ opacity: 1, x: 0 }}
        >
          مساعد إنجزنا الذكي
        </motion.span>
      )}
    </motion.button>
  )
}

export default ChatFAB
