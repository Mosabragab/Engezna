'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import { Plus, X, Trash2, GripVertical, Sparkles, ListOrdered } from 'lucide-react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Button } from '@/components/ui/button'

export interface OrderItem {
  id: string
  text: string
}

interface NotepadOrderInputProps {
  items: OrderItem[]
  onItemsChange: (items: OrderItem[]) => void
  disabled?: boolean
  className?: string
  maxItems?: number
}

const EXAMPLE_ITEMS_AR = [
  'كيلو طماطم',
  '2 كيلو بطاطس',
  'زجاجة زيت كبيرة',
  'عبوة حليب',
  '6 بيض',
]

const EXAMPLE_ITEMS_EN = [
  '1 kg tomatoes',
  '2 kg potatoes',
  'Large cooking oil bottle',
  'Milk carton',
  '6 eggs',
]

export function NotepadOrderInput({
  items,
  onItemsChange,
  disabled = false,
  className,
  maxItems = 50,
}: NotepadOrderInputProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const [showExamples, setShowExamples] = useState(false)
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null)

  const examples = isRTL ? EXAMPLE_ITEMS_AR : EXAMPLE_ITEMS_EN

  // Generate unique ID
  const generateId = () => crypto.randomUUID()

  // Add new item
  const addItem = useCallback((text: string = '') => {
    if (items.length >= maxItems) return

    const newItem: OrderItem = {
      id: generateId(),
      text,
    }
    onItemsChange([...items, newItem])

    // Focus the new item after render
    setTimeout(() => {
      inputRefs.current.get(newItem.id)?.focus()
    }, 50)
  }, [items, maxItems, onItemsChange])

  // Update item text
  const updateItem = useCallback((id: string, text: string) => {
    onItemsChange(items.map(item =>
      item.id === id ? { ...item, text } : item
    ))
  }, [items, onItemsChange])

  // Remove item
  const removeItem = useCallback((id: string) => {
    if (items.length <= 1) {
      // Don't remove the last item, just clear it
      onItemsChange([{ id: items[0].id, text: '' }])
      return
    }
    onItemsChange(items.filter(item => item.id !== id))
  }, [items, onItemsChange])

  // Handle Enter key - add new item
  const handleKeyDown = useCallback((e: React.KeyboardEvent, id: string, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Add new item after current
      if (items.length < maxItems) {
        const newItem: OrderItem = { id: generateId(), text: '' }
        const newItems = [...items]
        newItems.splice(index + 1, 0, newItem)
        onItemsChange(newItems)
        setTimeout(() => {
          inputRefs.current.get(newItem.id)?.focus()
        }, 50)
      }
    } else if (e.key === 'Backspace' && items[index].text === '' && items.length > 1) {
      e.preventDefault()
      removeItem(id)
      // Focus previous item
      if (index > 0) {
        const prevItem = items[index - 1]
        setTimeout(() => {
          inputRefs.current.get(prevItem.id)?.focus()
        }, 50)
      }
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault()
      const prevItem = items[index - 1]
      inputRefs.current.get(prevItem.id)?.focus()
    } else if (e.key === 'ArrowDown' && index < items.length - 1) {
      e.preventDefault()
      const nextItem = items[index + 1]
      inputRefs.current.get(nextItem.id)?.focus()
    }
  }, [items, maxItems, onItemsChange, removeItem])

  // Add example item
  const handleExampleClick = (example: string) => {
    // Find first empty item or add new one
    const emptyItem = items.find(item => !item.text.trim())
    if (emptyItem) {
      updateItem(emptyItem.id, example)
    } else if (items.length < maxItems) {
      addItem(example)
    }
    setShowExamples(false)
  }

  // Set ref for input
  const setInputRef = (id: string, el: HTMLInputElement | null) => {
    if (el) {
      inputRefs.current.set(id, el)
    } else {
      inputRefs.current.delete(id)
    }
  }

  // Count non-empty items
  const filledItemsCount = items.filter(item => item.text.trim()).length

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-5 h-5 text-primary" />
          <span className="font-medium text-slate-700">
            {isRTL ? 'قائمة المشتريات' : 'Shopping List'}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {filledItemsCount} / {maxItems} {isRTL ? 'صنف' : 'items'}
        </span>
      </div>

      {/* Tips Banner - show only when empty */}
      {filledItemsCount === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border border-primary/20 rounded-xl p-3"
        >
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-700">
                {isRTL ? 'كيفية إضافة الأصناف:' : 'How to add items:'}
              </p>
              <ul className="mt-1 space-y-0.5 text-xs">
                <li>
                  {isRTL
                    ? '• اكتب كل صنف في خانة منفصلة'
                    : '• Write each item in a separate field'}
                </li>
                <li>
                  {isRTL
                    ? '• اضغط Enter لإضافة صنف جديد'
                    : '• Press Enter to add a new item'}
                </li>
                <li>
                  {isRTL
                    ? '• حدد الكمية والحجم (كيلو، علبة، عدد)'
                    : '• Specify quantity and size (kg, pack, pieces)'}
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Items List */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={onItemsChange}
          className="divide-y divide-slate-100"
        >
          <AnimatePresence initial={false}>
            {items.map((item, index) => (
              <Reorder.Item
                key={item.id}
                value={item}
                className={cn(
                  'relative group',
                  focusedItemId === item.id && 'bg-primary/5'
                )}
              >
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center"
                >
                  {/* Drag Handle */}
                  <div className="px-2 py-3 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400 touch-none">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Item Number */}
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-500 shrink-0">
                    {index + 1}
                  </div>

                  {/* Input Field */}
                  <input
                    ref={(el) => setInputRef(item.id, el)}
                    type="text"
                    value={item.text}
                    onChange={(e) => updateItem(item.id, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, item.id, index)}
                    onFocus={() => setFocusedItemId(item.id)}
                    onBlur={() => setFocusedItemId(null)}
                    placeholder={
                      isRTL
                        ? `الصنف ${index + 1} (مثال: كيلو طماطم)`
                        : `Item ${index + 1} (e.g., 1 kg tomatoes)`
                    }
                    disabled={disabled}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    className={cn(
                      'flex-1 px-3 py-3.5 bg-transparent',
                      'text-slate-800 placeholder:text-slate-400',
                      'focus:outline-none',
                      'disabled:cursor-not-allowed disabled:opacity-50'
                    )}
                  />

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={disabled || (items.length === 1 && !item.text)}
                    className={cn(
                      'p-2 me-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all',
                      'opacity-0 group-hover:opacity-100 focus:opacity-100',
                      'disabled:opacity-0 disabled:cursor-not-allowed'
                    )}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>

        {/* Add Item Button */}
        <button
          type="button"
          onClick={() => addItem()}
          disabled={disabled || items.length >= maxItems}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 px-4',
            'bg-slate-50 hover:bg-primary/5 text-slate-500 hover:text-primary',
            'border-t border-slate-100 transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-50 disabled:hover:text-slate-500'
          )}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">
            {isRTL ? 'إضافة صنف' : 'Add item'}
          </span>
        </button>
      </div>

      {/* Quick Examples */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowExamples(!showExamples)}
          disabled={disabled}
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

      {/* Clear All Button */}
      {filledItemsCount > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-end"
        >
          <button
            type="button"
            onClick={() => onItemsChange([{ id: generateId(), text: '' }])}
            disabled={disabled}
            className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isRTL ? 'مسح الكل' : 'Clear all'}
          </button>
        </motion.div>
      )}
    </div>
  )
}

// Helper function to convert items to text format for submission
export function itemsToText(items: OrderItem[]): string {
  return items
    .filter(item => item.text.trim())
    .map(item => item.text.trim())
    .join('\n')
}

// Helper function to convert text to items format
export function textToItems(text: string): OrderItem[] {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length === 0) {
    return [{ id: crypto.randomUUID(), text: '' }]
  }
  return lines.map(line => ({
    id: crypto.randomUUID(),
    text: line.replace(/^[-•]\s*/, '').trim(), // Remove bullet points
  }))
}
