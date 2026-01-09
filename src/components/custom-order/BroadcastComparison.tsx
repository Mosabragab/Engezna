'use client'

import { useState, useMemo } from 'react'
import { useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  Star,
  Truck,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  Trophy,
  Loader2,
  XCircle,
  AlertCircle,
  Package,
  ShoppingBag,
  Sparkles,
  TrendingDown,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useBroadcastRealtime } from '@/hooks/useBroadcastRealtime'
import { usePriceComparison, formatCurrency } from '@/hooks/useCustomOrderFinancials'
import type {
  BroadcastComparisonProps,
  BroadcastWithRequests,
  CustomOrderRequestWithProvider,
} from '@/types/custom-order'

interface ExtendedBroadcastComparisonProps extends BroadcastComparisonProps {
  className?: string
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const statusConfig: Record<string, { label: string; labelAr: string; className: string }> = {
    pending: {
      label: 'Waiting for pricing',
      labelAr: 'بانتظار التسعير',
      className: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    priced: {
      label: 'Price received',
      labelAr: 'تم التسعير',
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    customer_approved: {
      label: 'Approved',
      labelAr: 'تمت الموافقة',
      className: 'bg-primary/10 text-primary border-primary/20',
    },
    customer_rejected: {
      label: 'Rejected',
      labelAr: 'مرفوض',
      className: 'bg-red-100 text-red-700 border-red-200',
    },
    expired: {
      label: 'Expired',
      labelAr: 'انتهت المهلة',
      className: 'bg-slate-100 text-slate-500 border-slate-200',
    },
    cancelled: {
      label: 'Cancelled',
      labelAr: 'ملغي',
      className: 'bg-slate-100 text-slate-500 border-slate-200',
    },
  }

  const config = statusConfig[status] || statusConfig.pending

  return (
    <Badge variant="outline" className={cn('text-xs', config.className)}>
      {isRTL ? config.labelAr : config.label}
    </Badge>
  )
}

// Price comparison card component
function ComparisonCard({
  request,
  isCheapest,
  isFastest,
  onSelect,
  loading,
  isSelected,
}: {
  request: CustomOrderRequestWithProvider
  isCheapest: boolean
  isFastest: boolean
  onSelect: () => Promise<void>
  loading: boolean
  isSelected: boolean
}) {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [expanded, setExpanded] = useState(false)

  const provider = request.provider
  const isPriced = request.status === 'priced'
  const isPending = request.status === 'pending'
  const isApproved = request.status === 'customer_approved'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative bg-white rounded-2xl border-2 overflow-hidden transition-all',
        isSelected
          ? 'border-primary shadow-lg shadow-primary/20'
          : isPriced
          ? 'border-slate-200 hover:border-primary/50 hover:shadow-md'
          : 'border-slate-200 opacity-75'
      )}
    >
      {/* Badges */}
      <div className="absolute top-3 start-3 flex flex-wrap gap-1.5 z-10">
        {isCheapest && isPriced && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1 bg-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-medium"
          >
            <Trophy className="w-3 h-3" />
            {isRTL ? 'أقل سعر' : 'Best Price'}
          </motion.div>
        )}
        {isFastest && isPriced && !isCheapest && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1 bg-primary text-white px-2 py-0.5 rounded-full text-xs font-medium"
          >
            <Clock className="w-3 h-3" />
            {isRTL ? 'أسرع' : 'Fastest'}
          </motion.div>
        )}
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Provider Info */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0">
            {provider.logo_url ? (
              <img
                src={provider.logo_url}
                alt={isRTL ? provider.name_ar : provider.name_en}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">
                🏪
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-800 truncate">
              {isRTL ? provider.name_ar : provider.name_en}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-medium text-slate-600">
                  {provider.rating?.toFixed(1) || '0.0'}
                </span>
              </div>
              <StatusBadge status={request.status} />
            </div>
          </div>
        </div>

        {/* Pricing */}
        {isPriced || isApproved ? (
          <div className="bg-slate-50 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">
                {isRTL ? 'المنتجات' : 'Products'} ({request.items_count})
              </span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(request.subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" />
                {isRTL ? 'التوصيل' : 'Delivery'}
              </span>
              <span
                className={cn(
                  'font-medium',
                  request.delivery_fee === 0 ? 'text-emerald-600' : 'text-slate-800'
                )}
              >
                {request.delivery_fee === 0
                  ? isRTL
                    ? 'مجاني'
                    : 'Free'
                  : formatCurrency(request.delivery_fee)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="font-semibold text-slate-800">
                {isRTL ? 'الإجمالي' : 'Total'}
              </span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(request.total)}
              </span>
            </div>
          </div>
        ) : isPending ? (
          <div className="bg-amber-50 rounded-xl p-4 mb-3 text-center">
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin mx-auto mb-2" />
            <p className="text-sm text-amber-700">
              {isRTL ? 'بانتظار التسعير من المتجر...' : 'Waiting for merchant pricing...'}
            </p>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-4 mb-3 text-center">
            <XCircle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              {isRTL ? 'لم يتم التسعير' : 'Not priced'}
            </p>
          </div>
        )}

        {/* Select Button */}
        {isPriced && !isApproved && (
          <Button
            onClick={onSelect}
            disabled={loading}
            className="w-full gap-2"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isRTL ? 'جارٍ الموافقة...' : 'Approving...'}
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {isRTL ? 'اختر هذا المتجر' : 'Select this merchant'}
              </>
            )}
          </Button>
        )}

        {isApproved && (
          <div className="bg-emerald-50 rounded-xl p-3 flex items-center justify-center gap-2 text-emerald-700">
            <Check className="w-5 h-5" />
            <span className="font-medium">
              {isRTL ? 'تم اختيار هذا المتجر' : 'This merchant is selected'}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function BroadcastComparison({
  broadcast: initialBroadcast,
  onSelectProvider,
  loading = false,
  className,
}: ExtendedBroadcastComparisonProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  // Use realtime hook for live updates
  const { broadcast, requests, isConnected, lastUpdate } = useBroadcastRealtime({
    broadcastId: initialBroadcast.id,
    enabled: true,
    callbacks: {
      onPricingReceived: (request) => {
        // Could show a toast notification here
        console.log('New pricing received:', request)
      },
    },
  })

  // Use comparison hook for analysis
  const comparisonItems = useMemo(() => {
    return requests
      .filter((r) => r.status === 'priced' || r.status === 'customer_approved')
      .map((r) => ({
        providerId: r.provider_id,
        providerName: isRTL ? r.provider?.name_ar || '' : r.provider?.name_en || '',
        subtotal: r.subtotal,
        deliveryFee: r.delivery_fee,
        total: r.total,
        itemsCount: r.items_count,
        availableCount: r.items_count, // Assuming all items available for now
        rating: r.provider?.rating,
      }))
  }, [requests, isRTL])

  const comparison = usePriceComparison({ items: comparisonItems })

  // Loading state for individual selection
  const [selectingId, setSelectingId] = useState<string | null>(null)

  const handleSelect = async (orderId: string) => {
    setSelectingId(orderId)
    try {
      await onSelectProvider(orderId)
    } finally {
      setSelectingId(null)
    }
  }

  // Count stats
  const pricedCount = requests.filter((r) => r.status === 'priced').length
  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const totalCount = requests.length

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {isRTL ? 'مقارنة الأسعار' : 'Price Comparison'}
          </h2>
          <p className="text-sm text-slate-500">
            {isRTL
              ? `${pricedCount} من ${totalCount} متاجر قدموا تسعير`
              : `${pricedCount} of ${totalCount} merchants responded`}
          </p>
        </div>

        {/* Live indicator */}
        {isConnected && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            {isRTL ? 'تحديث مباشر' : 'Live'}
          </div>
        )}
      </div>

      {/* Savings Banner */}
      {comparison.savings.maxSavings > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-4 text-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm opacity-90">
                {isRTL ? 'يمكنك توفير حتى' : 'You can save up to'}
              </p>
              <p className="text-xl font-bold">
                {formatCurrency(comparison.savings.maxSavings)}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Pending Animation */}
      {pendingCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Clock className="w-5 h-5 text-amber-600" />
              <motion.div
                className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-800">
                {isRTL
                  ? `${pendingCount} ${pendingCount === 1 ? 'متجر' : 'متاجر'} لم ${pendingCount === 1 ? 'يرسل' : 'يرسلوا'} التسعير بعد`
                  : `${pendingCount} ${pendingCount === 1 ? 'merchant' : 'merchants'} still pricing`}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                {isRTL
                  ? 'سيتم التحديث تلقائياً'
                  : 'Will update automatically'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Comparison Cards */}
      <div className="grid gap-4">
        {requests.map((request) => {
          const isCheapest =
            comparison.cheapestByTotal?.providerId === request.provider_id
          const isFastest = false // Would need delivery time data

          return (
            <ComparisonCard
              key={request.id}
              request={request as CustomOrderRequestWithProvider}
              isCheapest={isCheapest}
              isFastest={isFastest}
              onSelect={() => handleSelect(request.order_id || request.id)}
              loading={selectingId === request.id || loading}
              isSelected={request.status === 'customer_approved'}
            />
          )
        })}
      </div>

      {/* Empty State */}
      {requests.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">
            {isRTL
              ? 'لا توجد عروض أسعار بعد'
              : 'No pricing offers yet'}
          </p>
        </div>
      )}

      {/* Last Update */}
      {lastUpdate && (
        <p className="text-xs text-slate-400 text-center">
          {isRTL ? 'آخر تحديث: ' : 'Last update: '}
          {lastUpdate.toLocaleTimeString(locale)}
        </p>
      )}
    </div>
  )
}
