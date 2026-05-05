/**
 * Order status transitions — single source of truth for the merged status
 * flow used by the customer tracker and the provider order page.
 *
 * The DB enum still carries the original 8 values (pending, accepted,
 * preparing, ready, out_for_delivery, delivered, cancelled, rejected).
 * The merged flow lives in the UI/transition layer:
 *
 *   - Provider's "accept order" button skips 'accepted' and moves directly
 *     to 'preparing', writing both accepted_at and preparing_at so legacy
 *     reports keep working.
 *   - Pickup orders skip 'out_for_delivery' and go ready → delivered.
 *   - Cash-on-delivery orders set payment_status='completed' atomically
 *     when the provider marks the order delivered.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type OrderType = 'delivery' | 'pickup';

export type ProviderActionKind = 'start_preparing' | 'mark_ready' | 'dispatch' | 'complete';

export type ProviderOrderAction = {
  kind: ProviderActionKind;
  nextStatus: 'preparing' | 'ready' | 'out_for_delivery' | 'delivered';
  collectsCash: boolean;
  buttonLabelKey: 'startPreparing' | 'markReady' | 'dispatch' | 'completeAndCollect' | 'complete';
};

const ACTION_LABELS: Record<ProviderOrderAction['buttonLabelKey'], { ar: string; en: string }> = {
  startPreparing: { ar: 'قبول الطلب وبدء التحضير', en: 'Accept & Start Preparing' },
  markReady: { ar: 'الطلب جاهز', en: 'Mark as Ready' },
  dispatch: { ar: 'إرسال للتوصيل', en: 'Send Out for Delivery' },
  completeAndCollect: { ar: 'تم التوصيل واستلام المبلغ', en: 'Delivered & Cash Received' },
  complete: { ar: 'تم التوصيل', en: 'Mark as Delivered' },
};

export function getProviderActionLabel(action: ProviderOrderAction, locale: string): string {
  const labels = ACTION_LABELS[action.buttonLabelKey];
  return locale === 'ar' ? labels.ar : labels.en;
}

/**
 * Decide the next provider action for an order. Returns null when no further
 * action is possible (delivered, cancelled, rejected).
 */
export function getNextProviderAction(
  currentStatus: string,
  orderType: OrderType,
  paymentMethod: string,
  paymentStatus: string
): ProviderOrderAction | null {
  const cashPending = paymentMethod === 'cash' && paymentStatus !== 'completed';

  switch (currentStatus) {
    case 'pending':
    case 'accepted':
      return {
        kind: 'start_preparing',
        nextStatus: 'preparing',
        collectsCash: false,
        buttonLabelKey: 'startPreparing',
      };
    case 'preparing':
      return {
        kind: 'mark_ready',
        nextStatus: 'ready',
        collectsCash: false,
        buttonLabelKey: 'markReady',
      };
    case 'ready':
      if (orderType === 'pickup') {
        return {
          kind: 'complete',
          nextStatus: 'delivered',
          collectsCash: cashPending,
          buttonLabelKey: cashPending ? 'completeAndCollect' : 'complete',
        };
      }
      return {
        kind: 'dispatch',
        nextStatus: 'out_for_delivery',
        collectsCash: false,
        buttonLabelKey: 'dispatch',
      };
    case 'out_for_delivery':
      return {
        kind: 'complete',
        nextStatus: 'delivered',
        collectsCash: cashPending,
        buttonLabelKey: cashPending ? 'completeAndCollect' : 'complete',
      };
    default:
      return null;
  }
}

/**
 * Apply the provider action to the database. Writes the next status, the
 * matching timestamp, and (when relevant) flips payment_status to 'completed'
 * in the same atomic UPDATE so the order-completion hook can pick the order
 * up on its next cron run.
 *
 * `currentStatus` is required so we can avoid overwriting `accepted_at` when
 * advancing a legacy order that's already in 'accepted' — its original
 * acceptance timestamp must be preserved for historical reporting.
 */
export async function applyProviderAction(
  supabase: SupabaseClient,
  orderId: string,
  currentStatus: string,
  action: ProviderOrderAction
): Promise<{ error: Error | null }> {
  const now = new Date().toISOString();
  const update: Record<string, string> = {
    status: action.nextStatus,
    updated_at: now,
  };

  if (action.kind === 'start_preparing') {
    if (currentStatus === 'pending') {
      update.accepted_at = now;
    }
    update.preparing_at = now;
  } else if (action.kind === 'mark_ready') {
    update.ready_at = now;
  } else if (action.kind === 'dispatch') {
    update.out_for_delivery_at = now;
  } else if (action.kind === 'complete') {
    update.delivered_at = now;
    if (action.collectsCash) {
      update.payment_status = 'completed';
    }
  }

  const { error } = await supabase.from('orders').update(update).eq('id', orderId);
  return { error };
}

/**
 * A single visual step in the customer tracker. `matches` lists every DB
 * status value that should mark this step as complete — the 'preparing'
 * step matches both 'accepted' (legacy) and 'preparing' so old orders
 * still render correctly.
 */
export type CustomerTrackerStep = {
  key: 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered';
  matches: readonly string[];
  label_ar: string;
  label_en: string;
  timestamp_fields: readonly string[];
};

const PENDING_STEP: CustomerTrackerStep = {
  key: 'pending',
  matches: ['pending'],
  label_ar: 'في الانتظار',
  label_en: 'Pending',
  timestamp_fields: ['created_at'],
};

const PREPARING_STEP: CustomerTrackerStep = {
  key: 'preparing',
  matches: ['accepted', 'preparing'],
  label_ar: 'تم القبول وجارٍ التحضير',
  label_en: 'Accepted & Preparing',
  timestamp_fields: ['preparing_at', 'accepted_at'],
};

const READY_DELIVERY_STEP: CustomerTrackerStep = {
  key: 'ready',
  matches: ['ready'],
  label_ar: 'جاهز للتوصيل',
  label_en: 'Ready',
  timestamp_fields: ['ready_at'],
};

const READY_PICKUP_STEP: CustomerTrackerStep = {
  key: 'ready',
  // 'out_for_delivery' is included as a legacy fallback: pre-refactor pickup
  // orders could be progressed through it because the old NEXT_STATUS map
  // forced everyone through that status. Mapping it to "ready" keeps the
  // tracker rendering for those orders — the customer hasn't actually
  // picked up yet, so "Ready for Pickup" is still the truthful current step.
  matches: ['ready', 'out_for_delivery'],
  label_ar: 'جاهز للاستلام',
  label_en: 'Ready for Pickup',
  timestamp_fields: ['ready_at'],
};

const OUT_FOR_DELIVERY_STEP: CustomerTrackerStep = {
  key: 'out_for_delivery',
  matches: ['out_for_delivery'],
  label_ar: 'في الطريق',
  label_en: 'Out for Delivery',
  timestamp_fields: ['out_for_delivery_at'],
};

const DELIVERED_STEP: CustomerTrackerStep = {
  key: 'delivered',
  matches: ['delivered'],
  label_ar: 'تم التوصيل',
  label_en: 'Delivered',
  timestamp_fields: ['delivered_at'],
};

const PICKED_UP_STEP: CustomerTrackerStep = {
  key: 'delivered',
  matches: ['delivered'],
  label_ar: 'تم الاستلام',
  label_en: 'Picked Up',
  timestamp_fields: ['delivered_at'],
};

export function getCustomerTrackerSteps(orderType: OrderType): CustomerTrackerStep[] {
  if (orderType === 'pickup') {
    return [PENDING_STEP, PREPARING_STEP, READY_PICKUP_STEP, PICKED_UP_STEP];
  }
  return [PENDING_STEP, PREPARING_STEP, READY_DELIVERY_STEP, OUT_FOR_DELIVERY_STEP, DELIVERED_STEP];
}

/**
 * Statuses that should never appear in the linear tracker — either because
 * the order is finished off the happy path (cancelled, rejected, refunded)
 * or because it hasn't truly entered the flow yet (pending_payment, while
 * an online payment is still being authorized).
 */
const NON_TRACKABLE_STATUSES: readonly string[] = [
  'cancelled',
  'rejected',
  'refunded',
  'pending_payment',
];

/**
 * Index of the current step in the tracker. Returns -1 for non-trackable
 * statuses (cancelled/rejected/refunded/pending_payment) so the page can
 * render its dedicated state, and also for any unknown status we don't
 * recognize — callers should treat -1 as "don't highlight any step".
 */
export function getCustomerStepIndex(
  status: string,
  steps: readonly CustomerTrackerStep[]
): number {
  if (NON_TRACKABLE_STATUSES.includes(status)) return -1;
  const idx = steps.findIndex((step) => step.matches.includes(status));
  return idx >= 0 ? idx : -1;
}
