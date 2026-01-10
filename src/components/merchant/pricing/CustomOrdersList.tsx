'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  Clock,
  FileText,
  Mic,
  Image as ImageIcon,
  ChevronRight,
  AlertTriangle,
  Bell,
  Package,
  User,
  Calendar,
  Timer,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  SortAsc,
  SortDesc,
  RefreshCw,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  CustomOrderRequest,
  CustomRequestStatus,
  CustomOrderInputType,
} from '@/types/custom-order'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface CustomOrderWithCustomer extends CustomOrderRequest {
  customer?: {
    id: string
    full_name: string
    phone: string | null
  }
}

interface CustomOrdersListProps {
  orders: CustomOrderWithCustomer[]
  onSelectOrder: (orderId: string) => void
  onRefresh?: () => Promise<void>
  loading?: boolean
  className?: string
}

type SortOption = 'deadline' | 'created' | 'status'
type FilterOption = 'all' | 'pending' | 'priced' | 'expired'

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Components
// ═══════════════════════════════════════════════════════════════════════════════

function CountdownTimer({
  deadline,
  className,
}: {
  deadline: string
  className?: string
}) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [timeLeft, setTimeLeft] = useState<{
    hours: number
    minutes: number
    seconds: number
    isExpired: boolean
    isUrgent: boolean
  }>({ hours: 0, minutes: 0, seconds: 0, isExpired: false, isUrgent: false })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const deadlineTime = new Date(deadline).getTime()
      const difference = deadlineTime - now

      if (difference <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, isExpired: true, isUrgent: true }
      }

      const hours = Math.floor(difference / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      // Urgent if less than 30 minutes
      const isUrgent = difference < 30 * 60 * 1000

      return { hours, minutes, seconds, isExpired: false, isUrgent }
    }

    setTimeLeft(calculateTimeLeft())

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [deadline])

  if (timeLeft.isExpired) {
    return (
      <span
        className={cn(
          'flex items-center gap-1 text-red-600 dark:text-red-400 font-medium',
          className
        )}
      >
        <XCircle className="w-4 h-4" />
        {isRTL ? 'انتهت المهلة' : 'Expired'}
      </span>
    )
  }

  const formatTime = (value: number) => value.toString().padStart(2, '0')

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 font-mono',
        timeLeft.isUrgent
          ? 'text-red-600 dark:text-red-400 animate-pulse'
          : 'text-slate-700 dark:text-slate-300',
        className
      )}
    >
      <Timer className="w-4 h-4" />
      <span>
        {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:
        {formatTime(timeLeft.seconds)}
      </span>
    </div>
  )
}

function InputTypeBadge({ type }: { type: CustomOrderInputType }) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const config = {
    text: {
      icon: FileText,
      label: isRTL ? 'نص' : 'Text',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    voice: {
      icon: Mic,
      label: isRTL ? 'صوت' : 'Voice',
      className:
        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    },
    image: {
      icon: ImageIcon,
      label: isRTL ? 'صور' : 'Images',
      className:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    mixed: {
      icon: Package,
      label: isRTL ? 'متعدد' : 'Mixed',
      className:
        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
  }

  const { icon: Icon, label, className } = config[type]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

function StatusBadge({ status }: { status: CustomRequestStatus }) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const config: Record<
    CustomRequestStatus,
    { label: string; className: string; icon: React.ElementType }
  > = {
    pending: {
      label: isRTL ? 'بانتظار التسعير' : 'Awaiting Pricing',
      className:
        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      icon: Clock,
    },
    pricing_in_progress: {
      label: isRTL ? 'قيد التسعير' : 'Pricing...',
      className:
        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      icon: Clock,
    },
    priced: {
      label: isRTL ? 'تم التسعير' : 'Priced',
      className:
        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      icon: CheckCircle2,
    },
    customer_approved: {
      label: isRTL ? 'تمت الموافقة' : 'Approved',
      className:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      icon: CheckCircle2,
    },
    customer_rejected: {
      label: isRTL ? 'مرفوض' : 'Rejected',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      icon: XCircle,
    },
    expired: {
      label: isRTL ? 'منتهي' : 'Expired',
      className:
        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
      icon: XCircle,
    },
    cancelled: {
      label: isRTL ? 'ملغي' : 'Cancelled',
      className:
        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
      icon: XCircle,
    },
  }

  const { label, className, icon: Icon } = config[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Card Component
// ═══════════════════════════════════════════════════════════════════════════════

interface OrderCardProps {
  order: CustomOrderWithCustomer
  onSelect: () => void
  isUrgent?: boolean
}

function OrderCard({ order, onSelect, isUrgent }: OrderCardProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const previewText =
    order.original_text?.substring(0, 100) ||
    order.transcribed_text?.substring(0, 100) ||
    ''

  const isPending = order.status === 'pending'

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        'w-full text-start p-4 rounded-2xl border-2 transition-all',
        'bg-white dark:bg-slate-800',
        isPending && isUrgent
          ? 'border-red-300 dark:border-red-800 shadow-red-100 dark:shadow-red-900/20'
          : isPending
          ? 'border-amber-200 dark:border-amber-800 shadow-amber-50'
          : 'border-slate-200 dark:border-slate-700',
        'hover:shadow-lg hover:border-primary/30'
      )}
    >
      {/* Urgent Banner */}
      {isPending && isUrgent && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-3 pb-3 border-b border-red-200 dark:border-red-800">
          <AlertTriangle className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-medium">
            {isRTL ? 'عاجل! المهلة على وشك الانتهاء' : 'Urgent! Deadline approaching'}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <InputTypeBadge type={order.input_type} />
            <StatusBadge status={order.status} />
          </div>

          {/* Customer Info */}
          <div className="flex items-center gap-2 mt-2">
            <User className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
              {order.customer?.full_name || (isRTL ? 'عميل' : 'Customer')}
            </span>
          </div>
        </div>

        {/* Countdown */}
        {isPending && order.pricing_expires_at && (
          <CountdownTimer deadline={order.pricing_expires_at} />
        )}
      </div>

      {/* Preview Text */}
      {previewText && (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
          {previewText}
          {previewText.length >= 100 && '...'}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(order.created_at).toLocaleDateString(locale, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>

        <div className="flex items-center gap-1 text-primary font-medium text-sm">
          {isPending
            ? isRTL
              ? 'تسعير الآن'
              : 'Price Now'
            : isRTL
            ? 'عرض التفاصيل'
            : 'View Details'}
          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
        </div>
      </div>
    </motion.button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export function CustomOrdersList({
  orders,
  onSelectOrder,
  onRefresh,
  loading = false,
  className,
}: CustomOrdersListProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [sortBy, setSortBy] = useState<SortOption>('deadline')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [sortDesc, setSortDesc] = useState(false)

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let result = [...orders]

    // Apply filter
    if (filterBy !== 'all') {
      result = result.filter((order) => {
        if (filterBy === 'pending') return order.status === 'pending'
        if (filterBy === 'priced') return order.status === 'priced'
        if (filterBy === 'expired') return order.status === 'expired'
        return true
      })
    }

    // Apply sort
    result.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'deadline') {
        const aTime = a.pricing_expires_at
          ? new Date(a.pricing_expires_at).getTime()
          : Infinity
        const bTime = b.pricing_expires_at
          ? new Date(b.pricing_expires_at).getTime()
          : Infinity
        comparison = aTime - bTime
      } else if (sortBy === 'created') {
        comparison =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (sortBy === 'status') {
        const statusOrder: Record<string, number> = {
          pending: 0,
          pricing_in_progress: 0,
          priced: 1,
          customer_approved: 2,
          customer_rejected: 3,
          expired: 4,
          cancelled: 5,
        }
        comparison = (statusOrder[a.status] ?? 6) - (statusOrder[b.status] ?? 6)
      }
      return sortDesc ? -comparison : comparison
    })

    return result
  }, [orders, sortBy, filterBy, sortDesc])

  // Check if order is urgent (less than 30 minutes)
  const isOrderUrgent = (order: CustomOrderWithCustomer): boolean => {
    if (order.status !== 'pending' || !order.pricing_expires_at) return false
    const now = new Date().getTime()
    const deadline = new Date(order.pricing_expires_at).getTime()
    return deadline - now < 30 * 60 * 1000
  }

  // Count by status
  const pendingCount = orders.filter((o) => o.status === 'pending').length
  const urgentCount = orders.filter(isOrderUrgent).length

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {isRTL ? 'الطلبات الخاصة' : 'Custom Orders'}
          </h2>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              <Bell className="w-3 h-3 me-1" />
              {pendingCount} {isRTL ? 'جديد' : 'new'}
            </Badge>
          )}
          {urgentCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertTriangle className="w-3 h-3 me-1" />
              {urgentCount} {isRTL ? 'عاجل' : 'urgent'}
            </Badge>
          )}
        </div>

        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="gap-1"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-slate-400" />
          <Select
            value={filterBy}
            onValueChange={(v) => setFilterBy(v as FilterOption)}
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
              <SelectItem value="pending">
                {isRTL ? 'بانتظار التسعير' : 'Pending'}
              </SelectItem>
              <SelectItem value="priced">{isRTL ? 'تم التسعير' : 'Priced'}</SelectItem>
              <SelectItem value="expired">{isRTL ? 'منتهي' : 'Expired'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortOption)}
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deadline">
                {isRTL ? 'المهلة' : 'Deadline'}
              </SelectItem>
              <SelectItem value="created">
                {isRTL ? 'تاريخ الإنشاء' : 'Created'}
              </SelectItem>
              <SelectItem value="status">{isRTL ? 'الحالة' : 'Status'}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSortDesc(!sortDesc)}
          >
            {sortDesc ? (
              <SortDesc className="w-4 h-4" />
            ) : (
              <SortAsc className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {loading && filteredOrders.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">
              {filterBy !== 'all'
                ? isRTL
                  ? 'لا توجد طلبات تطابق الفلتر'
                  : 'No orders match the filter'
                : isRTL
                ? 'لا توجد طلبات خاصة حالياً'
                : 'No custom orders yet'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onSelect={() => onSelectOrder(order.id)}
                isUrgent={isOrderUrgent(order)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Summary */}
      {filteredOrders.length > 0 && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 text-center">
          {isRTL
            ? `${filteredOrders.length} طلب معروض`
            : `Showing ${filteredOrders.length} orders`}
        </div>
      )}
    </div>
  )
}

export default CustomOrdersList
