'use client'

import { useState, useCallback, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  Check,
  X,
  RefreshCw,
  Trash2,
  Copy,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type {
  CustomOrderItem,
  ItemAvailabilityStatus,
  PriceHistoryItem,
  UnitType,
} from '@/types/custom-order'
import { UNIT_TYPES } from '@/types/custom-order'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface PricingItemRowProps {
  index: number
  item: Partial<CustomOrderItem>
  originalText?: string
  priceHistory?: PriceHistoryItem | null
  onUpdate: (updates: Partial<CustomOrderItem>) => void
  onRemove: () => void
  disabled?: boolean
  className?: string
  autoFocus?: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export function PricingItemRow({
  index,
  item,
  originalText,
  priceHistory,
  onUpdate,
  onRemove,
  disabled = false,
  className,
  autoFocus = false,
}: PricingItemRowProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [isExpanded, setIsExpanded] = useState(false)
  const [showSubstitute, setShowSubstitute] = useState(
    item.availability_status === 'substituted'
  )

  // Calculate total price
  const calculateTotal = useCallback(
    (qty: number, price: number) => {
      return qty * price
    },
    []
  )

  // Update total when quantity or price changes
  useEffect(() => {
    const qty = item.quantity || 0
    const price = item.unit_price || 0
    const total = calculateTotal(qty, price)
    if (item.total_price !== total) {
      onUpdate({ total_price: total })
    }
  }, [item.quantity, item.unit_price, calculateTotal, onUpdate, item.total_price])

  // Update substitute total
  useEffect(() => {
    if (showSubstitute) {
      const qty = item.substitute_quantity || 0
      const price = item.substitute_unit_price || 0
      const total = calculateTotal(qty, price)
      if (item.substitute_total_price !== total) {
        onUpdate({ substitute_total_price: total })
      }
    }
  }, [
    item.substitute_quantity,
    item.substitute_unit_price,
    showSubstitute,
    calculateTotal,
    onUpdate,
    item.substitute_total_price,
  ])

  // Handle status change
  const handleStatusChange = (status: ItemAvailabilityStatus) => {
    onUpdate({ availability_status: status })
    if (status === 'substituted') {
      setShowSubstitute(true)
    } else {
      setShowSubstitute(false)
    }
  }

  // Copy customer text to item name
  const handleCopyCustomerText = () => {
    if (originalText) {
      onUpdate({ item_name_ar: originalText, original_customer_text: originalText })
    }
  }

  // Use previous price from history
  const handleUsePreviousPrice = () => {
    if (priceHistory) {
      onUpdate({
        item_name_ar: priceHistory.item_name_ar,
        item_name_en: priceHistory.item_name_en,
        unit_type: priceHistory.unit_type,
        unit_price: priceHistory.unit_price,
      })
    }
  }

  // Status colors
  const getStatusColor = (status: ItemAvailabilityStatus) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-100 text-emerald-700'
      case 'unavailable':
        return 'bg-red-100 text-red-700'
      case 'substituted':
        return 'bg-amber-100 text-amber-700'
      case 'partial':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: isRTL ? 50 : -50 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'bg-white rounded-xl border border-slate-200 overflow-hidden',
        item.availability_status === 'unavailable' && 'opacity-60',
        className
      )}
    >
      {/* Main Row */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Index Badge */}
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">{index + 1}</span>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Item Name Row */}
            <div className="flex items-center gap-2">
              <Input
                value={item.item_name_ar || ''}
                onChange={(e) => onUpdate({ item_name_ar: e.target.value })}
                placeholder={isRTL ? 'اسم الصنف...' : 'Item name...'}
                disabled={disabled}
                autoFocus={autoFocus}
                className="flex-1 font-medium"
                dir="auto"
              />

              {/* Copy Customer Text Button */}
              {originalText && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyCustomerText}
                        disabled={disabled}
                        className="shrink-0"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isRTL ? 'نسخ نص العميل' : 'Copy customer text'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Price History Button */}
              {priceHistory && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleUsePreviousPrice}
                        disabled={disabled}
                        className="shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        <Clock className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="text-center">
                        <p className="font-medium">
                          {isRTL ? 'تم شراؤه مسبقاً' : 'Previously purchased'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {priceHistory.unit_price} {isRTL ? 'ج.م' : 'EGP'} /{' '}
                          {priceHistory.unit_type}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Pricing Row */}
            <div className="grid grid-cols-12 gap-2">
              {/* Quantity */}
              <div className="col-span-3">
                <label className="text-xs text-slate-500 mb-1 block">
                  {isRTL ? 'الكمية' : 'Qty'}
                </label>
                <Input
                  type="number"
                  value={item.quantity || ''}
                  onChange={(e) =>
                    onUpdate({ quantity: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0"
                  min="0"
                  step="0.5"
                  disabled={disabled || item.availability_status === 'unavailable'}
                  className="text-center font-semibold tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Unit */}
              <div className="col-span-3">
                <label className="text-xs text-slate-500 mb-1 block">
                  {isRTL ? 'الوحدة' : 'Unit'}
                </label>
                <Select
                  value={item.unit_type || ''}
                  onValueChange={(value) => onUpdate({ unit_type: value as UnitType })}
                  disabled={disabled || item.availability_status === 'unavailable'}
                >
                  <SelectTrigger className="focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    <SelectValue
                      placeholder={isRTL ? 'اختر' : 'Select'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPES.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {isRTL ? unit.labelAr : unit.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Unit Price */}
              <div className="col-span-3">
                <label className="text-xs text-slate-500 mb-1 block">
                  {isRTL ? 'السعر' : 'Price'}
                </label>
                <Input
                  type="number"
                  value={item.unit_price || ''}
                  onChange={(e) =>
                    onUpdate({ unit_price: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  min="0"
                  step="0.5"
                  disabled={disabled || item.availability_status === 'unavailable'}
                  className="text-center font-semibold tabular-nums focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Total */}
              <div className="col-span-3">
                <label className="text-xs text-slate-500 mb-1 block">
                  {isRTL ? 'الإجمالي' : 'Total'}
                </label>
                <div className="h-10 bg-slate-100 rounded-md flex items-center justify-center font-semibold text-primary">
                  {(item.total_price || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Status Selection - Using inline styles to guarantee colors */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">
                {isRTL ? 'الحالة:' : 'Status:'}
              </span>
              <div className="flex gap-1">
                {/* Available Button */}
                <button
                  type="button"
                  onClick={() => handleStatusChange('available')}
                  disabled={disabled}
                  style={{
                    backgroundColor: item.availability_status === 'available' ? '#10b981' : '#f1f5f9',
                    color: item.availability_status === 'available' ? '#ffffff' : '#334155',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 500,
                    border: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: item.availability_status === 'available' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled) {
                      e.currentTarget.style.backgroundColor = item.availability_status === 'available' ? '#059669' : '#e2e8f0'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!disabled) {
                      e.currentTarget.style.backgroundColor = item.availability_status === 'available' ? '#10b981' : '#f1f5f9'
                    }
                  }}
                >
                  <Check className="w-3 h-3" />
                  {isRTL ? 'متوفر' : 'Available'}
                </button>

                {/* Unavailable Button */}
                <button
                  type="button"
                  onClick={() => handleStatusChange('unavailable')}
                  disabled={disabled}
                  style={{
                    backgroundColor: item.availability_status === 'unavailable' ? '#ef4444' : '#f1f5f9',
                    color: item.availability_status === 'unavailable' ? '#ffffff' : '#334155',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 500,
                    border: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: item.availability_status === 'unavailable' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled) {
                      e.currentTarget.style.backgroundColor = item.availability_status === 'unavailable' ? '#dc2626' : '#e2e8f0'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!disabled) {
                      e.currentTarget.style.backgroundColor = item.availability_status === 'unavailable' ? '#ef4444' : '#f1f5f9'
                    }
                  }}
                >
                  <X className="w-3 h-3" />
                  {isRTL ? 'غير متوفر' : 'Unavailable'}
                </button>

                {/* Substitute Button */}
                <button
                  type="button"
                  onClick={() => handleStatusChange('substituted')}
                  disabled={disabled}
                  style={{
                    backgroundColor: item.availability_status === 'substituted' ? '#f59e0b' : '#f1f5f9',
                    color: item.availability_status === 'substituted' ? '#ffffff' : '#334155',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 500,
                    border: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: item.availability_status === 'substituted' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled) {
                      e.currentTarget.style.backgroundColor = item.availability_status === 'substituted' ? '#d97706' : '#e2e8f0'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!disabled) {
                      e.currentTarget.style.backgroundColor = item.availability_status === 'substituted' ? '#f59e0b' : '#f1f5f9'
                    }
                  }}
                >
                  <RefreshCw className="w-3 h-3" />
                  {isRTL ? 'بديل' : 'Substitute'}
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              disabled={disabled}
              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Substitute Section */}
      <AnimatePresence>
        {showSubstitute && item.availability_status === 'substituted' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-amber-200 bg-amber-50"
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">
                  {isRTL ? 'البديل المقترح' : 'Suggested Substitute'}
                </span>
              </div>

              <div className="space-y-3">
                {/* Substitute Name */}
                <Input
                  value={item.substitute_name_ar || ''}
                  onChange={(e) => onUpdate({ substitute_name_ar: e.target.value })}
                  placeholder={isRTL ? 'اسم البديل...' : 'Substitute name...'}
                  disabled={disabled}
                  className="bg-white"
                  dir="auto"
                />

                {/* Substitute Pricing */}
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-4">
                    <Input
                      type="number"
                      value={item.substitute_quantity || ''}
                      onChange={(e) =>
                        onUpdate({ substitute_quantity: parseFloat(e.target.value) || 0 })
                      }
                      placeholder={isRTL ? 'الكمية' : 'Qty'}
                      min="0"
                      step="0.5"
                      disabled={disabled}
                      className="bg-white"
                    />
                  </div>
                  <div className="col-span-4">
                    <Select
                      value={item.substitute_unit_type || ''}
                      onValueChange={(value) =>
                        onUpdate({ substitute_unit_type: value })
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder={isRTL ? 'الوحدة' : 'Unit'} />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_TYPES.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {isRTL ? unit.labelAr : unit.labelEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Input
                      type="number"
                      value={item.substitute_unit_price || ''}
                      onChange={(e) =>
                        onUpdate({
                          substitute_unit_price: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder={isRTL ? 'السعر' : 'Price'}
                      min="0"
                      step="0.5"
                      disabled={disabled}
                      className="bg-white"
                    />
                  </div>
                </div>

                {/* Substitute Total */}
                <div className="flex justify-end">
                  <div className="text-sm">
                    <span className="text-slate-500">
                      {isRTL ? 'إجمالي البديل: ' : 'Substitute total: '}
                    </span>
                    <span className="font-semibold text-amber-700">
                      {(item.substitute_total_price || 0).toFixed(2)}{' '}
                      {isRTL ? 'ج.م' : 'EGP'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200"
          >
            <div className="p-4 space-y-3">
              {/* Original Customer Text */}
              {originalText && (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">
                    {isRTL ? 'نص العميل الأصلي' : 'Original customer text'}
                  </label>
                  <div className="p-2 bg-slate-50 rounded-lg text-sm text-slate-600">
                    {originalText}
                  </div>
                </div>
              )}

              {/* English Name */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  {isRTL ? 'الاسم بالإنجليزية (اختياري)' : 'English name (optional)'}
                </label>
                <Input
                  value={item.item_name_en || ''}
                  onChange={(e) => onUpdate({ item_name_en: e.target.value })}
                  placeholder="Item name in English..."
                  disabled={disabled}
                />
              </div>

              {/* Merchant Notes */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  {isRTL ? 'ملاحظات للعميل' : 'Notes for customer'}
                </label>
                <Input
                  value={item.merchant_notes || ''}
                  onChange={(e) => onUpdate({ merchant_notes: e.target.value })}
                  placeholder={
                    isRTL
                      ? 'مثال: السعر شامل الضريبة...'
                      : 'e.g., Price includes tax...'
                  }
                  disabled={disabled}
                />
              </div>

              {/* Price History Info */}
              {priceHistory && (
                <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-700">
                    {isRTL ? 'آخر سعر: ' : 'Last price: '}
                    <strong>
                      {priceHistory.unit_price} {isRTL ? 'ج.م' : 'EGP'}
                    </strong>
                    {' - '}
                    {new Date(priceHistory.last_ordered_at).toLocaleDateString(
                      locale
                    )}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default PricingItemRow
