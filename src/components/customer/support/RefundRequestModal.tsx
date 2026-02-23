'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  AlertTriangle,
  Package,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  Camera,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';

interface Order {
  id: string;
  order_number: string;
  total: number;
  status: string;
  provider_id: string;
  customer_id: string;
  created_at: string;
  items?: Array<{
    id: string;
    item_name_ar: string;
    item_name_en: string;
    quantity: number;
    total_price: number;
  }>;
}

interface RefundRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  locale: string;
  onSuccess?: () => void;
}

const ISSUE_TYPES = [
  {
    id: 'missing_items',
    label_ar: 'أصناف ناقصة',
    label_en: 'Missing items',
    icon: Package,
    color: 'bg-orange-100 text-orange-600',
  },
  {
    id: 'wrong_items',
    label_ar: 'أصناف خاطئة',
    label_en: 'Wrong items',
    icon: RefreshCw,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'quality_issue',
    label_ar: 'مشكلة في الجودة',
    label_en: 'Quality issue',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-600',
  },
  {
    id: 'never_received',
    label_ar: 'لم أستلم الطلب',
    label_en: 'Never received',
    icon: Package,
    color: 'bg-purple-100 text-purple-600',
  },
  {
    id: 'other',
    label_ar: 'مشكلة أخرى',
    label_en: 'Other issue',
    icon: HelpCircle,
    color: 'bg-slate-100 text-slate-600',
  },
];

export function RefundRequestModal({
  isOpen,
  onClose,
  order,
  locale,
  onSuccess,
}: RefundRequestModalProps) {
  const isArabic = locale === 'ar';
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedIssue, setSelectedIssue] = useState<string>('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Partial refund state
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedIssue('');
      setDescription('');
      setImages([]);
      setImagePreviews([]);
      setError('');
      setRefundType('full');
      setPartialAmount('');
      setSelectedItems([]);
    }
  }, [isOpen]);

  // Calculate refund amount based on selected type
  const calculateRefundAmount = () => {
    if (refundType === 'full') {
      return order.total;
    }
    // If items are selected, calculate their total
    if (selectedItems.length > 0 && order.items) {
      return order.items
        .filter((item) => selectedItems.includes(item.id))
        .reduce((sum, item) => sum + item.total_price, 0);
    }
    // Otherwise use manual amount
    return parseFloat(partialAmount) || 0;
  };

  const refundAmount = calculateRefundAmount();

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleIssueSelect = (issueId: string) => {
    setSelectedIssue(issueId);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      setError(isArabic ? 'الحد الأقصى 5 صور' : 'Maximum 5 images allowed');
      return;
    }
    setImages((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError(isArabic ? 'يرجى وصف المشكلة' : 'Please describe the issue');
      return;
    }

    // Validate partial refund amount
    if (refundType === 'partial') {
      if (refundAmount <= 0) {
        setError(isArabic ? 'يرجى تحديد مبلغ الاسترداد' : 'Please specify the refund amount');
        return;
      }
      if (refundAmount > order.total) {
        setError(
          isArabic
            ? 'مبلغ الاسترداد لا يمكن أن يتجاوز إجمالي الطلب'
            : 'Refund amount cannot exceed order total'
        );
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      // Check for existing pending refund on this order
      const { data: existingRefund } = await supabase
        .from('refunds')
        .select('id, status')
        .eq('order_id', order.id)
        .in('status', ['pending', 'approved'])
        .limit(1)
        .maybeSingle();

      if (existingRefund) {
        setError(
          isArabic
            ? 'يوجد طلب استرداد معلق لهذا الطلب بالفعل. يرجى انتظار مراجعته.'
            : 'A pending refund request already exists for this order. Please wait for it to be reviewed.'
        );
        setLoading(false);
        return;
      }

      // Upload images if any (skip if bucket doesn't exist)
      const imageUrls: string[] = [];
      for (const image of images) {
        try {
          const fileName = `${order.id}/${Date.now()}-${image.name}`;
          const { data, error: uploadError } = await supabase.storage
            .from('refund-evidence')
            .upload(fileName, image);

          if (data && !uploadError) {
            const { data: urlData } = supabase.storage
              .from('refund-evidence')
              .getPublicUrl(fileName);
            imageUrls.push(urlData.publicUrl);
          }
        } catch {
          // Continue without images if storage fails
        }
      }

      // Use the RPC function which bypasses RLS
      const { data: refundId, error: rpcError } = await supabase.rpc(
        'create_customer_refund_request',
        {
          p_order_id: order.id,
          p_amount: refundAmount,
          p_reason: description,
          p_issue_type: selectedIssue,
          p_evidence_images: imageUrls.length > 0 ? imageUrls : null,
        }
      );

      if (rpcError) {
        console.error('RPC error:', rpcError);
        // Fallback to direct insert if RPC doesn't exist
        const { error: insertError } = await supabase.from('refunds').insert({
          order_id: order.id,
          customer_id: order.customer_id,
          provider_id: order.provider_id,
          amount: refundAmount,
          refund_type: refundType,
          reason: selectedIssue,
          reason_ar: description,
          issue_type: selectedIssue,
          evidence_images: imageUrls.length > 0 ? imageUrls : null,
          status: 'pending',
          request_source: 'customer',
          provider_action: 'pending',
          confirmation_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          metadata:
            refundType === 'partial' && selectedItems.length > 0
              ? {
                  selected_items: order.items
                    ?.filter((item) => selectedItems.includes(item.id))
                    .map((item) => ({
                      id: item.id,
                      name_ar: item.item_name_ar,
                      name_en: item.item_name_en,
                      quantity: item.quantity,
                      price: item.total_price,
                    })),
                }
              : {},
        });

        if (insertError) throw insertError;
      }

      // Create support ticket
      try {
        await supabase.from('support_tickets').insert({
          user_id: order.customer_id,
          provider_id: order.provider_id,
          order_id: order.id,
          type: 'refund',
          subject: `طلب استرداد ${refundType === 'partial' ? 'جزئي' : 'كامل'} - ${order.order_number}`,
          description: description,
          priority: 'high',
          status: 'open',
        });
      } catch {
        // Support ticket is optional, continue if fails
      }

      // Create provider notification
      try {
        await supabase.from('provider_notifications').insert({
          provider_id: order.provider_id,
          type: 'new_refund_request',
          title_ar: 'طلب استرداد جديد',
          title_en: 'New Refund Request',
          body_ar: `لديك طلب استرداد ${refundType === 'partial' ? 'جزئي' : 'كامل'} للطلب #${order.order_number} بقيمة ${refundAmount.toFixed(2)} ج.م`,
          body_en: `You have a new ${refundType} refund request for order #${order.order_number} worth ${refundAmount.toFixed(2)} EGP`,
          related_order_id: order.id,
          related_customer_id: order.customer_id,
        });
      } catch {
        // Notification is optional
      }

      // Show success screen - set loading false BEFORE step change to ensure render
      setLoading(false);

      // Use a small delay to ensure React renders the success state before any parent re-renders
      await new Promise((resolve) => setTimeout(resolve, 50));
      setStep(3);

      // Auto-close after 7 seconds to give user time to see the message
      // Call onSuccess and onClose together after delay
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 7000);
    } catch (err) {
      console.error('Error submitting refund:', err);
      setError(isArabic ? 'حدث خطأ، يرجى المحاولة مرة أخرى' : 'Error occurred, please try again');
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999]" style={{ isolation: 'isolate' }}>
      {/* Dark Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Orange Header */}
          <div className="text-white p-4 flex-shrink-0" style={{ backgroundColor: '#f97316' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">{isArabic ? 'طلب مساعدة' : 'Get Help'}</h2>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {isArabic ? `طلب #${order.order_number}` : `Order #${order.order_number}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Steps Indicator */}
          {step < 3 && (
            <div
              className="px-4 py-3 border-b flex-shrink-0"
              style={{ backgroundColor: '#f8fafc' }}
            >
              <div className="flex items-center justify-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    backgroundColor: step >= 1 ? '#f97316' : '#e2e8f0',
                    color: step >= 1 ? '#ffffff' : '#64748b',
                  }}
                >
                  1
                </div>
                <div
                  className="w-8 h-1 rounded"
                  style={{ backgroundColor: step >= 2 ? '#f97316' : '#e2e8f0' }}
                />
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    backgroundColor: step >= 2 ? '#f97316' : '#e2e8f0',
                    color: step >= 2 ? '#ffffff' : '#64748b',
                  }}
                >
                  2
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs px-2" style={{ color: '#64748b' }}>
                <span>{isArabic ? 'نوع المشكلة' : 'Issue Type'}</span>
                <span>{isArabic ? 'التفاصيل' : 'Details'}</span>
              </div>
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* STEP 1: Issue Selection */}
            {step === 1 && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-4 text-center">
                  {isArabic ? 'ما هي المشكلة؟' : 'What is the issue?'}
                </h3>

                <div className="space-y-3">
                  {ISSUE_TYPES.map((issue) => {
                    const Icon = issue.icon;
                    const isSelected = selectedIssue === issue.id;

                    return (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => handleIssueSelect(issue.id)}
                        className="w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all"
                        style={{
                          borderColor: isSelected ? '#f97316' : '#e2e8f0',
                          backgroundColor: isSelected ? '#fff7ed' : '#ffffff',
                        }}
                      >
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${issue.color}`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <span
                          className="flex-1 text-right font-medium"
                          style={{ color: '#0f172a' }}
                        >
                          {isArabic ? issue.label_ar : issue.label_en}
                        </span>
                        <div
                          className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                          style={{
                            borderColor: isSelected ? '#f97316' : '#cbd5e1',
                            backgroundColor: isSelected ? '#f97316' : 'transparent',
                          }}
                        >
                          {isSelected && (
                            <svg className="w-4 h-4" fill="white" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Details */}
            {step === 2 && (
              <div className="space-y-4">
                {/* Refund Type Selection */}
                <div>
                  <label className="block font-semibold text-slate-900 mb-2">
                    {isArabic ? 'نوع الاسترداد *' : 'Refund Type *'}
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setRefundType('full');
                        setSelectedItems([]);
                        setPartialAmount('');
                      }}
                      className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                        refundType === 'full'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-medium">{isArabic ? 'استرداد كامل' : 'Full Refund'}</div>
                      <div className="text-sm text-slate-500">
                        {order.total.toFixed(2)} {isArabic ? 'ج.م' : 'EGP'}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefundType('partial')}
                      className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                        refundType === 'partial'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-medium">
                        {isArabic ? 'استرداد جزئي' : 'Partial Refund'}
                      </div>
                      <div className="text-sm text-slate-500">
                        {isArabic ? 'اختر الأصناف' : 'Select items'}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Item Selection for Partial Refund */}
                {refundType === 'partial' && order.items && order.items.length > 0 && (
                  <div>
                    <label className="block font-semibold text-slate-900 mb-2">
                      {isArabic ? 'اختر الأصناف المتضررة' : 'Select affected items'}
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {order.items.map((item) => (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedItems.includes(item.id)
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => toggleItemSelection(item.id)}
                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-slate-700">
                              {isArabic ? item.item_name_ar : item.item_name_en}
                            </span>
                            <span className="text-xs text-slate-500 mx-2">x{item.quantity}</span>
                          </div>
                          <span className="text-sm font-medium text-slate-900">
                            {item.total_price.toFixed(2)} {isArabic ? 'ج.م' : 'EGP'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual Amount Input for Partial Refund (if no items or want different amount) */}
                {refundType === 'partial' && (
                  <div>
                    <label className="block font-semibold text-slate-900 mb-2">
                      {isArabic ? 'أو أدخل المبلغ يدوياً' : 'Or enter amount manually'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max={order.total}
                        step="0.01"
                        value={partialAmount}
                        onChange={(e) => {
                          setPartialAmount(e.target.value);
                          setSelectedItems([]); // Clear item selection when manual amount is entered
                        }}
                        placeholder={isArabic ? 'المبلغ' : 'Amount'}
                        aria-label={isArabic ? 'مبلغ الاسترجاع' : 'Refund amount'}
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        dir="ltr"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                        {isArabic ? 'ج.م' : 'EGP'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {isArabic
                        ? `الحد الأقصى: ${order.total.toFixed(2)} ج.م`
                        : `Maximum: ${order.total.toFixed(2)} EGP`}
                    </p>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block font-semibold text-slate-900 mb-2">
                    {isArabic ? 'وصف المشكلة *' : 'Describe the issue *'}
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      isArabic ? 'اشرح المشكلة بالتفصيل...' : 'Explain the issue in detail...'
                    }
                    className="min-h-[100px] resize-none"
                    dir={isArabic ? 'rtl' : 'ltr'}
                  />
                </div>

                {/* Evidence Photos */}
                <div>
                  <label className="block font-semibold text-slate-900 mb-2">
                    {isArabic ? 'صور للإثبات (اختياري)' : 'Evidence photos (optional)'}
                  </label>

                  <div className="flex flex-wrap gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div
                        key={index}
                        className="relative w-20 h-20 rounded-lg overflow-hidden border"
                      >
                        <img
                          src={preview}
                          alt={`صورة إثبات ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          aria-label={`حذف الصورة ${index + 1}`}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {images.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-orange-400 hover:text-orange-500"
                      >
                        <Camera className="w-6 h-6" />
                        <span className="text-xs mt-1">{isArabic ? 'إضافة' : 'Add'}</span>
                      </button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>

                {/* Refund Summary */}
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm text-green-700">
                        {isArabic ? 'مبلغ الاسترداد' : 'Refund Amount'}
                      </span>
                      <span className="text-xs text-green-600 mx-2">
                        (
                        {refundType === 'full'
                          ? isArabic
                            ? 'كامل'
                            : 'Full'
                          : isArabic
                            ? 'جزئي'
                            : 'Partial'}
                        )
                      </span>
                    </div>
                    <span className="text-xl font-bold text-green-700">
                      {refundAmount.toFixed(2)} {isArabic ? 'ج.م' : 'EGP'}
                    </span>
                  </div>
                  {refundType === 'partial' && (
                    <div className="flex justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-green-200">
                      <span>{isArabic ? 'من أصل' : 'Out of'}</span>
                      <span>
                        {order.total.toFixed(2)} {isArabic ? 'ج.م' : 'EGP'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Success */}
            {step === 3 && (
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-700 mb-2">
                  {isArabic ? 'تم إرسال طلبك بنجاح!' : 'Request Submitted Successfully!'}
                </h3>
                <p className="text-slate-600 mb-2">
                  {isArabic
                    ? 'سيتم مراجعة طلبك خلال 24 ساعة'
                    : 'Your request will be reviewed within 24 hours'}
                </p>
                <p className="text-sm text-slate-400">
                  {isArabic
                    ? 'ستغلق النافذة تلقائياً...'
                    : 'This window will close automatically...'}
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t bg-white flex-shrink-0">
            {step === 1 && (
              <button
                type="button"
                onClick={() => {
                  if (selectedIssue) {
                    setStep(2);
                  } else {
                    setError(isArabic ? 'يرجى اختيار نوع المشكلة' : 'Please select an issue type');
                  }
                }}
                disabled={!selectedIssue}
                className="w-full py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#f97316' }}
              >
                {isArabic ? 'التالي' : 'Next'}
              </button>
            )}

            {step === 2 && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl font-semibold border border-slate-300"
                >
                  {isArabic ? 'السابق' : 'Back'}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !description.trim()}
                  className="flex-1 py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#f97316' }}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isArabic ? (
                    'إرسال'
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl font-semibold text-white"
                style={{ backgroundColor: '#22c55e' }}
              >
                {isArabic ? 'تم' : 'Done'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Use Portal to render outside the current DOM hierarchy
  return createPortal(modalContent, document.body);
}

export default RefundRequestModal;
