'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { FileText, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TextOrderInputProps } from '@/types/custom-order';

interface ExtendedTextOrderInputProps extends TextOrderInputProps {
  className?: string;
  showTips?: boolean;
}

const EXAMPLE_ITEMS_AR = ['كيلو طماطم', '2 كيلو بطاطس', 'زجاجة زيت كبيرة', 'عبوة حليب', '6 بيض'];

const EXAMPLE_ITEMS_EN = [
  '1 kg tomatoes',
  '2 kg potatoes',
  'Large cooking oil bottle',
  'Milk carton',
  '6 eggs',
];

export function TextOrderInput({
  value,
  onChange,
  placeholder,
  maxLength = 2000,
  disabled = false,
  className,
  showTips = true,
}: ExtendedTextOrderInputProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  const examples = isRTL ? EXAMPLE_ITEMS_AR : EXAMPLE_ITEMS_EN;
  const defaultPlaceholder = isRTL
    ? 'اكتب قائمة مشترياتك هنا...\nمثال:\n- كيلو طماطم\n- 2 لتر حليب\n- علبة جبنة'
    : 'Write your shopping list here...\nExample:\n- 1 kg tomatoes\n- 2 liters milk\n- Cheese pack';

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(150, textarea.scrollHeight)}px`;
    }
  }, [value]);

  const handleExampleClick = (example: string) => {
    const newValue = value ? `${value}\n- ${example}` : `- ${example}`;
    onChange(newValue);
    textareaRef.current?.focus();
  };

  const handleClear = () => {
    onChange('');
    textareaRef.current?.focus();
  };

  const characterCount = value.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isAtLimit = characterCount >= maxLength;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Tips Banner */}
      {showTips && !value && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-primary/5 border border-primary/20 rounded-xl p-3"
        >
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-700">
                {isRTL ? 'نصيحة للطلب الأفضل:' : 'Tips for better orders:'}
              </p>
              <ul className="mt-1 space-y-0.5 text-xs">
                <li>
                  {isRTL ? '• اكتب كل صنف في سطر منفصل' : '• Write each item on a separate line'}
                </li>
                <li>
                  {isRTL
                    ? '• حدد الكمية والحجم (كيلو، علبة، عدد)'
                    : '• Specify quantity and size (kg, pack, pieces)'}
                </li>
                <li>
                  {isRTL
                    ? '• أضف أي ملاحظات خاصة (طازج، نوع معين)'
                    : '• Add any special notes (fresh, specific brand)'}
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Input */}
      <div
        className={cn(
          'relative bg-white rounded-2xl border-2 transition-all duration-200',
          isFocused
            ? 'border-primary shadow-lg shadow-primary/10'
            : 'border-slate-200 hover:border-slate-300',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Icon */}
        <div className="absolute top-4 start-4 text-slate-400">
          <FileText className="w-5 h-5" />
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || defaultPlaceholder}
          disabled={disabled}
          dir={isRTL ? 'rtl' : 'ltr'}
          className={cn(
            'w-full min-h-[150px] p-4 ps-12 pe-10 bg-transparent resize-none',
            'text-slate-800 placeholder:text-slate-400',
            'focus:outline-none',
            'disabled:cursor-not-allowed'
          )}
        />

        {/* Clear Button */}
        <AnimatePresence>
          {value && !disabled && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              type="button"
              onClick={handleClear}
              className="absolute top-4 end-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Character Count */}
        <div
          className={cn(
            'absolute bottom-3 end-4 text-xs',
            isAtLimit
              ? 'text-red-500 font-medium'
              : isNearLimit
                ? 'text-amber-500'
                : 'text-slate-400'
          )}
        >
          {characterCount.toLocaleString(locale)} / {maxLength.toLocaleString(locale)}
        </div>
      </div>

      {/* Quick Examples */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowExamples(!showExamples)}
          className="self-start text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isRTL ? 'أمثلة سريعة' : 'Quick examples'}
        </button>

        <AnimatePresence>
          {showExamples && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 overflow-hidden"
            >
              {examples.map((example, index) => (
                <motion.button
                  key={example}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  type="button"
                  onClick={() => handleExampleClick(example)}
                  disabled={disabled}
                  className={cn(
                    'px-3 py-1.5 text-sm bg-slate-100 hover:bg-primary hover:text-white',
                    'rounded-full transition-all duration-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  + {example}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
