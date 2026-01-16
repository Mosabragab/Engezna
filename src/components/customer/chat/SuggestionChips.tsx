/**
 * SuggestionChips - Quick reply suggestions
 */

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect?: (suggestion: string) => void;
  className?: string;
}

export const SuggestionChips = memo(function SuggestionChips({
  suggestions,
  onSelect,
  className,
}: SuggestionChipsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={index}
          onClick={() => onSelect?.(suggestion)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium',
            'bg-white border border-gray-200',
            'text-gray-700 hover:text-primary hover:border-primary',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary/20'
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
        >
          {suggestion}
        </motion.button>
      ))}
    </motion.div>
  );
});

export default SuggestionChips;
