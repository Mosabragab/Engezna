'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  Plus,
  Send,
  X,
  FileText,
  Image as ImageIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Copy,
  ChevronRight,
  RotateCcw,
  ArrowDownToLine,
  ZoomIn,
  ZoomOut,
  Move,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { PricingItemRow } from './PricingItemRow';
import { PricingSummary } from './PricingSummary';
import type {
  CustomOrderItem,
  CustomOrderRequestWithItems,
  PriceHistoryItem,
  ItemAvailabilityStatus,
} from '@/types/custom-order';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface PricingNotepadProps {
  request: CustomOrderRequestWithItems;
  priceHistory?: PriceHistoryItem[];
  onSubmitPricing: (
    items: Omit<CustomOrderItem, 'id' | 'request_id' | 'order_id' | 'created_at' | 'updated_at'>[],
    deliveryFee: number
  ) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  className?: string;
  fixedDeliveryFee?: number; // رسوم التوصيل الثابتة من بيانات التاجر
}

type ItemFormData = Partial<CustomOrderItem> & {
  tempId: string;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createEmptyItem(): ItemFormData {
  return {
    tempId: generateTempId(),
    item_name_ar: '',
    item_name_en: null,
    quantity: 1,
    unit_type: 'piece',
    unit_price: 0,
    total_price: 0,
    availability_status: 'available',
    display_order: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Customer Order Panel
// ═══════════════════════════════════════════════════════════════════════════════

interface CustomerOrderPanelProps {
  request: CustomOrderRequestWithItems;
  onCopyText: (text: string) => void;
  copiedTexts: Set<string>; // تتبع النصوص التي تم نقلها
}

function CustomerOrderPanel({ request, onCopyText, copiedTexts }: CustomerOrderPanelProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageZoom, setImageZoom] = useState(1);

  // Get display text - check both request and broadcast for data
  const displayText =
    request.original_text ||
    request.broadcast?.original_text ||
    request.transcribed_text ||
    request.broadcast?.transcribed_text ||
    '';
  // Get image URLs from request or fall back to broadcast
  const imageUrls =
    request.image_urls && request.image_urls.length > 0
      ? request.image_urls
      : request.broadcast?.image_urls || null;
  const hasImages = imageUrls && imageUrls.length > 0;

  // Parse text into items (split by newlines or common separators)
  const textItems = displayText
    .split(/[\n,،]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Handle image zoom
  const handleZoomIn = () => setImageZoom((prev) => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setImageZoom((prev) => Math.max(prev - 0.5, 1));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden h-full flex flex-col shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-gray-800">
              {isRTL ? 'طلب العميل' : 'Customer Order'}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {request.input_type === 'text' && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {isRTL ? 'نص' : 'Text'}
              </span>
            )}
            {request.input_type === 'image' && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                {isRTL ? 'صور' : 'Images'}
              </span>
            )}
          </div>
        </div>

        {/* Customer Info */}
        <div className="mt-2 text-sm text-gray-600">
          <span className="font-medium">{request.broadcast?.customer?.full_name}</span>
          {request.broadcast?.customer?.phone && (
            <span className="ms-2">({request.broadcast.customer.phone})</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {/* Images - Enhanced with Zoom Controls */}
        {hasImages && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {isRTL ? 'الصور المرفقة' : 'Attached Images'}
                </span>
              </div>
              {/* Zoom Controls - Touch-friendly (48x48 minimum) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={imageZoom <= 1}
                  className="p-3 min-w-[48px] min-h-[48px] rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center justify-center"
                >
                  <ZoomOut className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-sm text-gray-500 px-2 font-medium">
                  {Math.round(imageZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={imageZoom >= 3}
                  className="p-3 min-w-[48px] min-h-[48px] rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center justify-center"
                >
                  <ZoomIn className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {imageUrls?.map((url, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setCurrentImageIndex(index);
                    setImageZoom(1);
                  }}
                  className={cn(
                    'aspect-square rounded-lg overflow-hidden border-2 transition-all',
                    currentImageIndex === index
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <img
                    src={url}
                    alt={`${isRTL ? 'صورة' : 'Image'} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
            {/* Larger preview with zoom */}
            {imageUrls?.[currentImageIndex] && (
              <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                <div
                  className="absolute inset-0 overflow-auto cursor-move"
                  style={{ touchAction: 'pan-x pan-y' }}
                >
                  <img
                    src={imageUrls[currentImageIndex]}
                    alt={`${isRTL ? 'معاينة' : 'Preview'}`}
                    className="transition-transform duration-200"
                    style={{
                      transform: `scale(${imageZoom})`,
                      transformOrigin: 'center center',
                      minWidth: '100%',
                      minHeight: '100%',
                      objectFit: 'contain',
                    }}
                  />
                </div>
                {imageZoom > 1 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Move className="w-3 h-3" />
                    {isRTL ? 'اسحب للتحريك' : 'Drag to pan'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Text Items - Enhanced with Prominent Quick Copy */}
        {displayText && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-800">
                {isRTL ? 'قائمة الطلب' : 'Order List'}
              </span>
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                {textItems.length} {isRTL ? 'صنف' : 'items'}
              </span>
            </div>

            <div className="space-y-2">
              {textItems.map((item, index) => {
                const isCopied = copiedTexts.has(item);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-xl transition-colors border',
                      isCopied
                        ? 'bg-emerald-50 border-emerald-200 opacity-60'
                        : 'bg-gray-50 border-gray-100 hover:bg-blue-50 hover:border-blue-200'
                    )}
                  >
                    <span
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold shrink-0',
                        isCopied ? 'bg-emerald-100 text-emerald-600' : 'bg-primary/10 text-primary'
                      )}
                    >
                      {isCopied ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                    </span>
                    <span
                      className={cn(
                        'flex-1 font-medium',
                        isCopied ? 'text-gray-500 line-through' : 'text-gray-800'
                      )}
                    >
                      {item}
                    </span>
                    {/* Prominent Quick Copy Button - Disabled if already copied */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onCopyText(item)}
                      disabled={isCopied}
                      className={cn(
                        'h-8 gap-1.5 shrink-0',
                        isCopied
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800'
                      )}
                    >
                      {isCopied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {isRTL ? 'تم' : 'Done'}
                        </>
                      ) : (
                        <>
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                          {isRTL ? 'نقل' : 'Copy'}
                        </>
                      )}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Customer Notes */}
        {request.customer_notes && (
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">
                {isRTL ? 'ملاحظات العميل' : 'Customer Notes'}
              </span>
            </div>
            <p className="text-sm text-amber-800">{request.customer_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export function PricingNotepad({
  request,
  priceHistory = [],
  onSubmitPricing,
  onCancel,
  loading = false,
  className,
  fixedDeliveryFee,
}: PricingNotepadProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  // State
  const [items, setItems] = useState<ItemFormData[]>(() => {
    // Initialize with existing items or empty
    if (request.items && request.items.length > 0) {
      return request.items.map((item) => ({
        ...item,
        tempId: generateTempId(),
      }));
    }
    return [createEmptyItem()];
  });
  // Use fixed delivery fee from provider settings, not editable
  const deliveryFee = fixedDeliveryFee ?? request.delivery_fee ?? 0;
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Double-tap protection - ref-based lock to prevent duplicate submissions
  const isSubmittingRef = useRef(false);
  // Track copied customer texts to prevent duplicates
  const [copiedTexts, setCopiedTexts] = useState<Set<string>>(new Set());

  // Price history lookup
  const getPriceHistoryForItem = useCallback(
    (itemName: string): PriceHistoryItem | null => {
      if (!itemName) return null;
      const normalized = itemName.toLowerCase().trim();
      return (
        priceHistory.find(
          (h) =>
            h.item_name_ar.toLowerCase().includes(normalized) ||
            normalized.includes(h.item_name_ar.toLowerCase())
        ) || null
      );
    },
    [priceHistory]
  );

  // Item management
  const addItem = useCallback(() => {
    setItems((prev) => [...prev, createEmptyItem()]);
  }, []);

  const updateItem = useCallback((index: number, updates: Partial<ItemFormData>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Copy customer text to first empty item (only once per text)
  const handleCopyCustomerText = useCallback((text: string) => {
    // Check if already copied to prevent duplicates
    setCopiedTexts((prev) => {
      if (prev.has(text)) return prev;
      const newSet = new Set(prev);
      newSet.add(text);
      return newSet;
    });

    // Find the first empty item (no name) and fill it, otherwise add new item
    setItems((prev) => {
      const emptyIndex = prev.findIndex(
        (item) => !item.item_name_ar || item.item_name_ar.trim() === ''
      );

      if (emptyIndex !== -1) {
        // Fill the first empty item
        return prev.map((item, index) =>
          index === emptyIndex
            ? { ...item, item_name_ar: text, original_customer_text: text }
            : item
        );
      } else {
        // No empty item found, add a new one
        const newItem = createEmptyItem();
        newItem.item_name_ar = text;
        newItem.original_customer_text = text;
        return [...prev, newItem];
      }
    });
  }, []);

  // Calculate totals
  const validItems = items.filter(
    (item) => item.item_name_ar && item.availability_status !== 'unavailable'
  );
  const subtotal = validItems.reduce((sum, item) => {
    if (item.availability_status === 'substituted' && item.substitute_total_price) {
      return sum + item.substitute_total_price;
    }
    return sum + (item.total_price || 0);
  }, 0);
  const total = subtotal + deliveryFee;

  // Calculate commission and net profit (للشفافية مع التاجر)
  const getCommissionRate = (amount: number): number => {
    if (amount <= 100) return 0.07;
    if (amount <= 300) return 0.06;
    return 0.05;
  };
  const commissionRate = getCommissionRate(subtotal);
  const commission = subtotal * commissionRate;
  const netProfit = total - commission;

  // Check if deadline has expired
  const isDeadlineExpired = request.pricing_expires_at
    ? new Date(request.pricing_expires_at) < new Date()
    : false;

  // Validation - also check deadline
  const isValid =
    items.some((item) => item.item_name_ar && item.quantity && item.unit_price) &&
    !isDeadlineExpired;

  // Submit handling
  const handleSubmit = async () => {
    // Double-tap protection - prevent multiple submissions
    if (isSubmittingRef.current) {
      console.warn('Submission already in progress');
      return;
    }
    isSubmittingRef.current = true;

    // Clear previous errors
    setSubmitError(null);

    // Double-check deadline before submission
    if (isDeadlineExpired) {
      setSubmitError(
        isRTL
          ? 'انتهت مهلة التسعير - لا يمكن الإرسال'
          : 'Pricing deadline has expired - cannot submit'
      );
      setShowConfirmDialog(false);
      isSubmittingRef.current = false;
      return;
    }

    // Validate items
    const validItems = items.filter((item) => item.item_name_ar);
    if (validItems.length === 0) {
      setSubmitError(isRTL ? 'يرجى إضافة صنف واحد على الأقل' : 'Please add at least one item');
      setShowConfirmDialog(false);
      isSubmittingRef.current = false;
      return;
    }

    const hasValidPricing = validItems.some((item) => item.quantity && item.unit_price);
    if (!hasValidPricing) {
      setSubmitError(
        isRTL
          ? 'يرجى إدخال الكمية والسعر لصنف واحد على الأقل'
          : 'Please enter quantity and price for at least one item'
      );
      setShowConfirmDialog(false);
      isSubmittingRef.current = false;
      return;
    }

    setSubmitting(true);
    try {
      const submitItems = validItems.map((item, index) => ({
        original_customer_text: item.original_customer_text || null,
        item_name_ar: item.item_name_ar!,
        item_name_en: item.item_name_en || null,
        description_ar: item.description_ar || null,
        description_en: item.description_en || null,
        unit_type: item.unit_type || null,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        total_price: item.total_price || 0,
        availability_status: item.availability_status || 'available',
        substitute_name_ar: item.substitute_name_ar || null,
        substitute_name_en: item.substitute_name_en || null,
        substitute_description: item.substitute_description || null,
        substitute_quantity: item.substitute_quantity || null,
        substitute_unit_type: item.substitute_unit_type || null,
        substitute_unit_price: item.substitute_unit_price || null,
        substitute_total_price: item.substitute_total_price || null,
        merchant_notes: item.merchant_notes || null,
        display_order: index,
      }));

      await onSubmitPricing(submitItems, deliveryFee);
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Failed to submit pricing:', error);
      setSubmitError(
        isRTL
          ? 'حدث خطأ أثناء إرسال التسعيرة. يرجى المحاولة مرة أخرى.'
          : 'An error occurred while submitting the quote. Please try again.'
      );
      setShowConfirmDialog(false);
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Reset form
  const handleReset = () => {
    setItems([createEmptyItem()]);
  };

  return (
    <div className={cn('flex flex-col lg:flex-row gap-4 min-h-[700px] pb-28 sm:pb-4', className)}>
      {/* Left Panel - Customer Order */}
      <div className="lg:w-2/5 xl:w-1/3 h-[300px] lg:h-auto lg:min-h-[600px]">
        <CustomerOrderPanel
          request={request}
          onCopyText={handleCopyCustomerText}
          copiedTexts={copiedTexts}
        />
      </div>

      {/* Right Panel - Pricing Form (Clean Invoice Style) */}
      <div className="lg:w-3/5 xl:w-2/3 flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm overflow-visible min-h-[600px] lg:min-h-0">
        {/* Invoice Header - Paper Style */}
        <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {isRTL ? 'فاتورة التسعير' : 'Pricing Invoice'}
                </h2>
                <p className="text-sm text-gray-500">
                  {items.length} {isRTL ? 'صنف' : 'items'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={loading || submitting}
              className="gap-1.5 text-gray-500 hover:text-gray-700"
            >
              <RotateCcw className="w-4 h-4" />
              {isRTL ? 'إعادة' : 'Reset'}
            </Button>
          </div>

          {/* Deadline Badge */}
          {request.pricing_expires_at && (
            <div
              className={cn(
                'mt-3 flex items-center gap-2 text-sm p-2 rounded-lg',
                isDeadlineExpired ? 'bg-red-100 border border-red-200' : ''
              )}
            >
              {isDeadlineExpired ? (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              ) : (
                <Clock className="w-4 h-4 text-amber-600" />
              )}
              <span className={isDeadlineExpired ? 'text-red-700 font-medium' : 'text-gray-600'}>
                {isDeadlineExpired
                  ? isRTL
                    ? 'انتهت المهلة!'
                    : 'Deadline Expired!'
                  : isRTL
                    ? 'المهلة:'
                    : 'Deadline:'}
              </span>
              <span
                className={cn(
                  'font-semibold px-2 py-0.5 rounded-md',
                  isDeadlineExpired ? 'text-red-700 bg-red-200' : 'text-amber-700 bg-amber-50'
                )}
              >
                {new Date(request.pricing_expires_at).toLocaleTimeString(locale)}
              </span>
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 space-y-3 bg-white">
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => (
              <PricingItemRow
                key={item.tempId}
                index={index}
                item={item}
                priceHistory={getPriceHistoryForItem(item.item_name_ar || '')}
                onUpdate={(updates) => updateItem(index, updates)}
                onRemove={() => removeItem(index)}
                disabled={loading || submitting}
                autoFocus={index === items.length - 1 && items.length > 1}
              />
            ))}
          </AnimatePresence>

          {/* Add Item Button */}
          <motion.button
            type="button"
            onClick={addItem}
            disabled={loading || submitting}
            className={cn(
              'w-full p-4 rounded-xl border-2 border-dashed border-gray-200 transition-all',
              'flex items-center justify-center gap-2',
              'text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">{isRTL ? 'إضافة صنف جديد' : 'Add New Item'}</span>
          </motion.button>
        </div>

        {/* Invoice Summary - Clean Paper Style */}
        <div className="border-t border-gray-200 bg-gray-50/50 px-4 sm:px-6 py-3 sm:py-4">
          {/* Subtotal */}
          <div className="flex justify-between items-center py-2 text-gray-600">
            <span>{isRTL ? 'مجموع المنتجات' : 'Subtotal'}</span>
            <span className="font-medium text-gray-800">
              {subtotal.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
            </span>
          </div>

          {/* Delivery Fee (Fixed - Read Only) */}
          <div className="flex justify-between items-center py-2 text-gray-600">
            <div className="flex items-center gap-2">
              <span>{isRTL ? 'رسوم التوصيل' : 'Delivery Fee'}</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                {isRTL ? 'ثابت' : 'Fixed'}
              </span>
            </div>
            <span className="font-medium text-gray-800">
              {deliveryFee.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
            </span>
          </div>

          {/* Total for Customer */}
          <div className="flex justify-between items-center py-3 border-t border-dashed border-gray-200 mt-2">
            <span className="text-xl font-bold text-gray-800">
              {isRTL ? 'الإجمالي للعميل' : 'Customer Total'}
            </span>
            <span className="text-3xl font-bold text-gray-900">
              {total.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
            </span>
          </div>
        </div>

        {/* Footer - Net Profit + Action Buttons */}
        <div className="border-t border-gray-200 bg-white px-4 sm:px-6 py-4">
          {/* Net Profit Display - Transparent Financials */}
          <div className="flex items-center justify-between mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-emerald-600">
                  {isRTL ? 'صافي ربحك بعد العمولة' : 'Your net profit after commission'}
                </p>
                <p className="text-xs text-emerald-500">
                  ({Math.round(commissionRate * 100)}% {isRTL ? 'عمولة' : 'commission'})
                </p>
              </div>
            </div>
            <div className="text-end">
              <p className="text-2xl font-bold text-emerald-700">
                {netProfit.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
              </p>
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {submitError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <p className="text-sm text-red-700 flex-1">{submitError}</p>
                <button
                  type="button"
                  onClick={() => setSubmitError(null)}
                  className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Cancel Button */}
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading || submitting}
              className="flex-1 gap-2 h-14 border-gray-300 text-gray-700 hover:bg-gray-100 text-base"
            >
              <X className="w-5 h-5" />
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>

            {/* Submit Button - Large Green */}
            <Button
              type="button"
              variant="default"
              onClick={() => {
                setSubmitError(null);
                setShowConfirmDialog(true);
              }}
              disabled={!isValid || loading || submitting}
              className="flex-[2] gap-2 h-14 !bg-emerald-500 hover:!bg-emerald-600 !text-white shadow-xl shadow-emerald-500/30 text-lg font-bold transition-all hover:scale-[1.02] disabled:!bg-gray-300 disabled:!text-gray-500"
            >
              {submitting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Send className="w-6 h-6" />
              )}
              {isRTL ? 'إرسال التسعيرة' : 'Send Quote'}
              <ChevronRight className="w-6 h-6 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog - Clean Light Theme */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              {isRTL ? 'تأكيد إرسال التسعيرة' : 'Confirm Quote Submission'}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {isRTL
                ? 'هل أنت متأكد من إرسال هذه التسعيرة للعميل؟ لا يمكن التراجع بعد الإرسال.'
                : 'Are you sure you want to send this quote to the customer? This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
            <div className="flex justify-between">
              <span className="text-gray-600">{isRTL ? 'عدد الأصناف' : 'Items'}</span>
              <span className="font-medium text-gray-800">{validItems.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{isRTL ? 'المجموع' : 'Subtotal'}</span>
              <span className="font-medium text-gray-800">
                {subtotal.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{isRTL ? 'التوصيل' : 'Delivery'}</span>
              <span className="font-medium text-gray-800">
                {deliveryFee.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
              </span>
            </div>
            <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between">
              <span className="font-semibold text-gray-800">
                {isRTL ? 'إجمالي العميل' : 'Customer Total'}
              </span>
              <span className="font-bold text-gray-900 text-xl">
                {total.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
              </span>
            </div>
          </div>

          {/* Net Profit in Dialog */}
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">
                {isRTL ? 'صافي ربحك' : 'Your profit'}
              </span>
            </div>
            <span className="font-bold text-emerald-700 text-lg">
              {netProfit.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
            </span>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={submitting}
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              {isRTL ? 'مراجعة' : 'Review'}
            </Button>
            {/* Send Button - Using inline styles to guarantee emerald colors */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                backgroundColor: submitting ? '#d1d5db' : '#10b981',
                color: submitting ? '#6b7280' : '#ffffff',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!submitting) {
                  e.currentTarget.style.backgroundColor = '#059669';
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting) {
                  e.currentTarget.style.backgroundColor = '#10b981';
                }
              }}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isRTL ? 'تأكيد الإرسال' : 'Confirm & Send'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PricingNotepad;
