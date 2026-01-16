'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Loader2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface Refund {
  id: string;
  order_id: string;
  amount: number;
  provider_action: string;
  customer_confirmed: boolean;
  confirmation_deadline: string;
  provider_notes?: string;
  order?: {
    order_number: string;
  };
  provider?: {
    name_ar: string;
    name_en: string;
  };
}

interface RefundConfirmationCardProps {
  refund: Refund;
  locale: string;
  onConfirm?: () => void;
  className?: string;
}

export function RefundConfirmationCard({
  refund,
  locale,
  onConfirm,
  className,
}: RefundConfirmationCardProps) {
  const isArabic = locale === 'ar';
  const [loading, setLoading] = useState(false);
  const [showNotReceivedForm, setShowNotReceivedForm] = useState(false);
  const [notReceivedNotes, setNotReceivedNotes] = useState('');
  const [confirmed, setConfirmed] = useState(refund.customer_confirmed);
  const [hoursRemaining, setHoursRemaining] = useState(0);

  // Calculate remaining time
  useEffect(() => {
    const calculateRemaining = () => {
      if (!refund.confirmation_deadline) return 0;
      const deadline = new Date(refund.confirmation_deadline);
      const remaining = Math.max(
        0,
        Math.floor((deadline.getTime() - Date.now()) / (1000 * 60 * 60))
      );
      setHoursRemaining(remaining);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [refund.confirmation_deadline]);

  const handleConfirm = async (received: boolean, notes?: string) => {
    setLoading(true);

    try {
      const supabase = createClient();

      // Use the helper function if available
      const { error: rpcError } = await supabase.rpc('customer_confirm_refund', {
        p_refund_id: refund.id,
        p_received: received,
        p_notes: notes || null,
      });

      if (rpcError) {
        // Fallback to direct update
        if (received) {
          await supabase
            .from('refunds')
            .update({
              customer_confirmed: true,
              customer_confirmed_at: new Date().toISOString(),
              status: 'processed',
            })
            .eq('id', refund.id);
        } else {
          await supabase
            .from('refunds')
            .update({
              escalated_to_admin: true,
              escalation_reason: `customer_denied_receipt: ${notes || 'No notes'}`,
            })
            .eq('id', refund.id);
        }

        // Create confirmation record
        await supabase.from('refund_confirmations').insert({
          refund_id: refund.id,
          confirmation_type: received ? 'received' : 'not_received',
          customer_notes: notes,
        });
      }

      setConfirmed(true);
      onConfirm?.();
    } catch (err) {
      console.error('Error confirming refund:', err);
    } finally {
      setLoading(false);
    }
  };

  // Already confirmed
  if (confirmed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('bg-green-50 border border-green-200 rounded-xl p-4', className)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h4 className="font-semibold text-green-900">
              {isArabic ? 'تم تأكيد الاستلام' : 'Receipt Confirmed'}
            </h4>
            <p className="text-sm text-green-700">
              {isArabic
                ? 'شكراً لتأكيدك. تم إغلاق طلب الاسترداد بنجاح.'
                : 'Thank you for confirming. Refund request closed successfully.'}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Not received form
  if (showNotReceivedForm) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('bg-red-50 border border-red-200 rounded-xl p-4', className)}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h4 className="font-semibold text-red-900">
              {isArabic ? 'لم تستلم المبلغ؟' : "Didn't receive the refund?"}
            </h4>
            <p className="text-sm text-red-700">
              {isArabic
                ? 'سيتم تصعيد طلبك للإدارة للتحقق'
                : 'Your request will be escalated to admin for review'}
            </p>
          </div>
        </div>

        <Textarea
          value={notReceivedNotes}
          onChange={(e) => setNotReceivedNotes(e.target.value)}
          placeholder={
            isArabic ? 'اشرح ما حدث (اختياري)...' : 'Explain what happened (optional)...'
          }
          className="mb-4 bg-white"
          rows={3}
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowNotReceivedForm(false)}
            className="flex-1"
            disabled={loading}
          >
            {isArabic ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            onClick={() => handleConfirm(false, notReceivedNotes)}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isArabic ? (
              'تأكيد وتصعيد'
            ) : (
              'Confirm & Escalate'
            )}
          </Button>
        </div>
      </motion.div>
    );
  }

  // Main confirmation card
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <DollarSign className="w-6 h-6 text-green-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-green-900">
            {isArabic ? 'تأكيد استلام المبلغ' : 'Confirm Refund Receipt'}
          </h4>

          <p className="text-sm text-green-700 mt-1">
            {isArabic
              ? `أكد التاجر ${refund.provider?.name_ar || ''} أنه قام برد المبلغ (${refund.amount.toFixed(2)} ج.م) كاش مع المندوب.`
              : `${refund.provider?.name_en || 'The merchant'} confirmed refunding (${refund.amount.toFixed(2)} EGP) via delivery.`}
          </p>

          {refund.provider_notes && (
            <div className="mt-2 bg-white/50 rounded-lg p-2 text-sm text-green-800">
              <span className="font-medium">
                {isArabic ? 'ملاحظات التاجر:' : 'Merchant notes:'}
              </span>{' '}
              {refund.provider_notes}
            </div>
          )}

          {/* Countdown Timer */}
          <div className="flex items-center gap-2 mt-3 text-sm">
            <Clock className="w-4 h-4 text-green-600" />
            <span
              className={cn(hoursRemaining <= 6 ? 'text-orange-600 font-medium' : 'text-green-600')}
            >
              {isArabic
                ? `سيتم التأكيد تلقائياً خلال ${hoursRemaining} ساعة`
                : `Auto-confirms in ${hoursRemaining} hours`}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => handleConfirm(true)}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {isArabic ? 'نعم، استلمت' : 'Yes, received'}
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowNotReceivedForm(true)}
              disabled={loading}
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {isArabic ? 'لم أستلم' : 'Not received'}
            </Button>
          </div>

          {/* Warning */}
          <div className="mt-3 flex items-start gap-2 text-xs text-green-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              {isArabic
                ? 'بالضغط على "نعم، استلمت" فإنك تؤكد استلامك للمبلغ المسترد. إذا لم تستلم، اضغط "لم أستلم" وسيتم التحقق من الأمر.'
                : 'By clicking "Yes, received" you confirm receiving the refund. If you did not receive it, click "Not received" and it will be investigated.'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default RefundConfirmationCard;
