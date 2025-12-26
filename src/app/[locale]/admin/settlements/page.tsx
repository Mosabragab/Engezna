'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, GeoFilter, useGeoFilter, useAdminSidebar } from '@/components/admin'
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils/formatters'
import { exportSettlementsToCSV } from '@/lib/finance'
import {
  Shield,
  Search,
  Eye,
  RefreshCw,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  Wallet,
  Calendar,
  PlayCircle,
  CreditCard,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  X,
  Users,
  Download,
  PauseCircle,
  FileWarning,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Settlement {
  id: string
  provider_id: string
  provider: {
    name_ar: string
    name_en: string
    governorate_id: string | null
    city_id: string | null
    commission_rate: number | null
    custom_commission_rate: number | null
  } | null
  period_start: string
  period_end: string
  total_orders: number
  gross_revenue: number
  platform_commission: number
  net_payout: number
  delivery_fees_collected: number | null
  // New fields from updated schema
  cod_orders_count: number | null
  cod_revenue: number | null
  cod_commission_owed: number | null
  online_orders_count: number | null
  online_revenue: number | null
  online_platform_owes: number | null
  online_platform_commission: number | null
  net_amount_due: number | null
  net_balance: number | null
  settlement_direction: 'platform_pays_provider' | 'provider_pays_platform' | 'balanced' | null
  amount_paid: number | null
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'disputed' | 'waived'
  paid_at: string | null
  payment_method: string | null
  payment_reference: string | null
  due_date: string | null
  is_overdue: boolean | null
  orders_included: string[] | null
  notes: string | null
  created_at: string
  updated_at: string
  processed_by: string | null
  approved_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
}

interface Provider {
  id: string
  name_ar: string
  name_en: string
  governorate_id: string | null
  city_id: string | null
}

interface HeldOrder {
  id: string
  order_number: string
  provider_id: string
  provider: {
    name_ar: string
    name_en: string
  } | null
  total: number
  platform_commission: number
  hold_reason: string | null
  hold_until: string | null
  created_at: string
  status: string
  settlement_status: string
}

type FilterStatus = 'all' | 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'disputed' | 'waived'

export default function AdminSettlementsPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const { toggle: toggleSidebar } = useAdminSidebar()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [filteredSettlements, setFilteredSettlements] = useState<Settlement[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const { geoFilter, setGeoFilter } = useGeoFilter()

  // Modal states
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Settlement generation period: 1 = daily, 3 = every 3 days, 7 = weekly
  const [settlementPeriod, setSettlementPeriod] = useState<1 | 3 | 7>(7)

  // Generate settlement form
  const [generateForm, setGenerateForm] = useState({
    providerId: '',
    periodStart: '',
    periodEnd: '',
  })

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'cash',
    reference: '',
  })

  const [stats, setStats] = useState({
    totalPending: 0,
    totalOverdue: 0,
    totalPaid: 0,
    pendingCount: 0,
    overdueCount: 0,
    paidCount: 0,
    heldOrdersCount: 0,
    heldOrdersValue: 0,
  })

  // Held orders state
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([])
  const [showHeldOrders, setShowHeldOrders] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterSettlements()
  }, [settlements, searchQuery, statusFilter, geoFilter])

  async function checkAuth() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin') {
        setIsAdmin(true)
        setLoading(false)
        loadData(supabase)
        return
      }
    }

    setLoading(false)
  }

  async function loadData(supabase: ReturnType<typeof createClient>) {
    setDataLoading(true)
    // Load settlements with provider commission rates
    const { data: settlementsData, error: settlementsError } = await supabase
      .from('settlements')
      .select(`
        *,
        provider:providers(name_ar, name_en, governorate_id, city_id, commission_rate, custom_commission_rate)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (settlementsError) {
      console.error('Error loading settlements:', settlementsError)
    }

    console.log('Loaded settlements:', settlementsData?.length || 0, settlementsData)

    const settlementsTyped = (settlementsData || []) as unknown as Settlement[]
    setSettlements(settlementsTyped)

    // Load providers for the generate form (all providers)
    const { data: providersData, error: providersError } = await supabase
      .from('providers')
      .select('id, name_ar, name_en, governorate_id, city_id')
      .order('name_ar')

    setProviders((providersData || []) as Provider[])

    // Load held orders (orders with settlement_status = 'on_hold')
    const { data: heldOrdersData } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        provider_id,
        provider:providers(name_ar, name_en),
        total,
        platform_commission,
        hold_reason,
        hold_until,
        created_at,
        status,
        settlement_status
      `)
      .eq('settlement_status', 'on_hold')
      .order('created_at', { ascending: false })

    const heldOrdersTyped = (heldOrdersData || []) as unknown as HeldOrder[]
    setHeldOrders(heldOrdersTyped)

    // Calculate stats - use net_amount_due if available, otherwise fall back to platform_commission
    const pending = settlementsTyped.filter(s => s.status === 'pending' || s.status === 'partially_paid')
    const paid = settlementsTyped.filter(s => s.status === 'paid')
    const overdue = settlementsTyped.filter(s => s.status === 'overdue' || s.status === 'disputed')

    // Helper to get the amount due from a settlement
    const getAmountDue = (s: Settlement) => {
      // Use new field if available, otherwise fall back to platform_commission
      const due = s.net_amount_due ?? s.platform_commission ?? 0
      const paid = s.amount_paid ?? 0
      return Math.max(0, due - paid)
    }

    // Calculate held orders value
    const heldOrdersValue = heldOrdersTyped.reduce((sum, o) => sum + (o.total || 0), 0)

    setStats({
      totalPending: pending.reduce((sum, s) => sum + getAmountDue(s), 0),
      totalOverdue: overdue.reduce((sum, s) => sum + getAmountDue(s), 0),
      totalPaid: paid.reduce((sum, s) => sum + (s.amount_paid ?? s.platform_commission ?? 0), 0),
      pendingCount: pending.length,
      overdueCount: overdue.length,
      paidCount: paid.length,
      heldOrdersCount: heldOrdersTyped.length,
      heldOrdersValue: heldOrdersValue,
    })
    setDataLoading(false)
  }

  // Release order from hold (make it eligible for settlement)
  async function handleReleaseOrder(orderId: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('orders')
      .update({
        settlement_status: 'eligible',
        hold_reason: null,
        hold_until: null,
      })
      .eq('id', orderId)

    if (error) {
      alert(locale === 'ar' ? 'حدث خطأ أثناء تحرير الطلب' : 'Error releasing order')
    } else {
      alert(locale === 'ar' ? 'تم تحرير الطلب بنجاح' : 'Order released successfully')
      await handleRefresh()
    }
  }

  function filterSettlements() {
    let filtered = [...settlements]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(s =>
        (locale === 'ar' ? s.provider?.name_ar : s.provider?.name_en)?.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter)
    }

    // Geographic filter
    if (geoFilter.governorate_id || geoFilter.city_id) {
      filtered = filtered.filter(s => {
        if (geoFilter.city_id && s.provider?.city_id) {
          return s.provider.city_id === geoFilter.city_id
        }
        if (geoFilter.governorate_id && s.provider?.governorate_id) {
          return s.provider.governorate_id === geoFilter.governorate_id
        }
        return true
      })
    }

    setFilteredSettlements(filtered)
  }

  async function handleRefresh() {
    setLoading(true)
    const supabase = createClient()
    await loadData(supabase)
    setLoading(false)
  }

  async function handleGenerateWeeklySettlements() {
    setIsGenerating(true)
    try {
      const supabase = createClient()

      // Get date range based on selected period
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - settlementPeriod)

      // Get all providers
      const { data: activeProviders, error: provError } = await supabase
        .from('providers')
        .select('id')

      if (!activeProviders || activeProviders.length === 0) {
        alert(locale === 'ar' ? 'لا يوجد مزودين نشطين' : 'No active providers found')
        return
      }

      // Get all order IDs already included in previous settlements
      const { data: existingSettlements, error: existingError } = await supabase
        .from('settlements')
        .select('id, orders_included, status, created_at')
        .not('orders_included', 'is', null)

      console.log('[Weekly] Existing settlements:', existingSettlements?.length || 0, existingSettlements)
      if (existingError) {
        console.error('[Weekly] Error fetching existing settlements:', existingError)
      }

      // Collect all order IDs that are already in settlements
      const settledOrderIds = new Set<string>()
      if (existingSettlements) {
        for (const settlement of existingSettlements) {
          if (settlement.orders_included && Array.isArray(settlement.orders_included)) {
            for (const orderId of settlement.orders_included) {
              settledOrderIds.add(orderId)
            }
          }
        }
      }
      console.log('[Weekly] Settled order IDs:', settledOrderIds.size)

      let createdCount = 0
      const DEFAULT_COMMISSION_RATE = 0.07 // 7% max as fallback

      for (const provider of activeProviders) {
        // Get provider's actual commission settings from database
        const { data: providerData } = await supabase
          .from('providers')
          .select('commission_rate, custom_commission_rate, commission_status, grace_period_end')
          .eq('id', provider.id)
          .single()

        // Determine commission rate based on provider status
        let providerCommissionRate = DEFAULT_COMMISSION_RATE

        if (providerData) {
          // Check grace period first
          if (providerData.commission_status === 'in_grace_period' &&
              providerData.grace_period_end &&
              new Date() < new Date(providerData.grace_period_end)) {
            providerCommissionRate = 0
          }
          // Check if exempt
          else if (providerData.commission_status === 'exempt') {
            providerCommissionRate = 0
          }
          // Use custom rate if set
          else if (providerData.custom_commission_rate) {
            providerCommissionRate = providerData.custom_commission_rate / 100
          }
          // Use provider's standard rate
          else if (providerData.commission_rate) {
            providerCommissionRate = providerData.commission_rate / 100
          }
        }

        // Get delivered orders for this provider in the period (including payment_method)
        // IMPORTANT: Use platform_commission from database (calculated by server-side trigger)
        // Include orders that are eligible or have no settlement_status set
        // Exclude only orders that are explicitly on_hold, settled, or excluded
        const { data: allOrders } = await supabase
          .from('orders')
          .select('id, total, subtotal, discount, delivery_fee, payment_method, platform_commission, original_commission, settlement_status')
          .eq('provider_id', provider.id)
          .eq('status', 'delivered')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())

        // Filter out orders that are on_hold, settled, or excluded (client-side for reliability)
        const eligibleOrders = (allOrders || []).filter(o =>
          !o.settlement_status ||
          o.settlement_status === 'eligible' ||
          o.settlement_status === null
        )

        // Filter out orders that are already in previous settlements
        const orders = eligibleOrders.filter(o => !settledOrderIds.has(o.id))

        if (orders && orders.length > 0) {
          // Get processed refunds for these orders
          const orderIds = orders.map(o => o.id)
          const { data: refundsData } = await supabase
            .from('refunds')
            .select('order_id, processed_amount, amount, status, affects_settlement')
            .in('order_id', orderIds)
            .eq('status', 'processed')

          // ═══════════════════════════════════════════════════════════════════
          // SOURCE OF TRUTH: Build refund map per order for commission adjustment
          // Formula: adjusted_commission = (commission_base - refund) * rate
          // ═══════════════════════════════════════════════════════════════════
          const refundMap = new Map<string, number>()
          if (refundsData) {
            for (const refund of refundsData) {
              if (refund.affects_settlement !== false) {
                const amount = refund.processed_amount || refund.amount || 0
                const existing = refundMap.get(refund.order_id) || 0
                refundMap.set(refund.order_id, existing + amount)
              }
            }
          }

          // Calculate total refunds for settlement record
          const totalRefunds = Array.from(refundMap.values()).reduce((sum, v) => sum + v, 0)

          // Separate orders by payment method
          const codOrders = orders.filter(o => o.payment_method === 'cash' || o.payment_method === 'cod')
          const onlineOrders = orders.filter(o => o.payment_method !== 'cash' && o.payment_method !== 'cod')

          // ═══════════════════════════════════════════════════════════════════
          // SOURCE OF TRUTH FORMULA (from financial_settlement_engine.sql):
          // commission_base = subtotal - discount (NO delivery)
          // commission = (commission_base - refund_amount) * rate / 100
          // ═══════════════════════════════════════════════════════════════════

          // Helper function to calculate adjusted commission per order
          const calculateOrderCommission = (order: typeof orders[0]): number => {
            const subtotal = order.subtotal ?? ((order.total || 0) - (order.delivery_fee || 0))
            const discount = order.discount || 0
            const refund = refundMap.get(order.id) || 0
            const commissionBase = subtotal - discount
            const netForCommission = Math.max(0, commissionBase - refund)
            // If grace period (commission = 0), respect that
            if (providerCommissionRate === 0) return 0
            return netForCommission * providerCommissionRate
          }

          // COD breakdown - calculate all values
          const codGrossRevenue = codOrders.reduce((sum, o) => sum + (o.total || 0), 0)
          const codDeliveryFees = codOrders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0)
          const codNetRevenue = codGrossRevenue - codDeliveryFees
          const codCommissionOwed = codOrders.reduce((sum, o) => sum + calculateOrderCommission(o), 0)
          const codOriginalCommission = codOrders.reduce((sum, o) => sum + (o.original_commission || o.platform_commission || 0), 0)

          // Online breakdown - calculate all values
          const onlineGrossRevenue = onlineOrders.reduce((sum, o) => sum + (o.total || 0), 0)
          const onlineDeliveryFees = onlineOrders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0)
          const onlineNetRevenue = onlineGrossRevenue - onlineDeliveryFees
          const onlinePlatformCommission = onlineOrders.reduce((sum, o) => sum + calculateOrderCommission(o), 0)
          const onlineOriginalCommission = onlineOrders.reduce((sum, o) => sum + (o.original_commission || o.platform_commission || 0), 0)
          const onlinePayoutOwed = onlineGrossRevenue - onlinePlatformCommission - totalRefunds

          // Calculate totals (adjusted for refunds)
          const grossRevenue = codGrossRevenue + onlineGrossRevenue
          const deliveryFeesCollected = codDeliveryFees + onlineDeliveryFees
          const platformCommission = codCommissionOwed + onlinePlatformCommission

          // ═══════════════════════════════════════════════════════════════════
          // FIXED: net_payout = gross_revenue - platform_commission
          // This is what the merchant keeps after platform takes commission
          // ═══════════════════════════════════════════════════════════════════
          const netPayout = grossRevenue - platformCommission

          // Net balance: What platform owes provider minus what provider owes platform
          // For COD: Provider collected cash, owes platform the commission
          // For Online: Platform collected payment, owes provider (total - commission)
          // Positive = Platform pays provider, Negative = Provider pays platform
          const netBalance = onlinePayoutOwed - codCommissionOwed

          // Determine settlement direction
          let settlementDirection: 'platform_pays_provider' | 'provider_pays_platform' | 'balanced' = 'balanced'
          if (netBalance > 0.01) {
            settlementDirection = 'platform_pays_provider'
          } else if (netBalance < -0.01) {
            settlementDirection = 'provider_pays_platform'
          }

          // Create settlement with full breakdown (ALL values calculated and stored)
          const { error: insertError } = await supabase
            .from('settlements')
            .insert({
              provider_id: provider.id,
              period_start: startDate.toISOString(),
              period_end: endDate.toISOString(),
              total_orders: orders.length,
              gross_revenue: grossRevenue,
              platform_commission: platformCommission,
              net_payout: netPayout,
              delivery_fees_collected: deliveryFeesCollected,
              total_refunds: totalRefunds,
              // COD breakdown
              cod_orders_count: codOrders.length,
              cod_gross_revenue: codGrossRevenue,
              cod_delivery_fees: codDeliveryFees,
              cod_net_revenue: codNetRevenue,
              cod_commission_owed: codCommissionOwed,
              cod_original_commission: codOriginalCommission,
              // Online breakdown
              online_orders_count: onlineOrders.length,
              online_gross_revenue: onlineGrossRevenue,
              online_delivery_fees: onlineDeliveryFees,
              online_net_revenue: onlineNetRevenue,
              online_platform_commission: onlinePlatformCommission,
              online_original_commission: onlineOriginalCommission,
              online_payout_owed: onlinePayoutOwed,
              // Net calculation
              net_balance: netBalance,
              settlement_direction: settlementDirection,
              status: 'pending',
              orders_included: orders.map(o => o.id),
            })

          if (!insertError) {
            // Mark orders as settled
            const orderIds = orders.map(o => o.id)
            await supabase
              .from('orders')
              .update({ settlement_status: 'settled' })
              .in('id', orderIds)
            createdCount++
          }
        }
      }

      alert(locale === 'ar' ? `تم إنشاء ${createdCount} تسوية جديدة` : `Generated ${createdCount} new settlements`)
      await handleRefresh()
    } catch {
      alert(locale === 'ar' ? 'حدث خطأ أثناء إنشاء التسويات' : 'Error generating settlements')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleGenerateSettlement() {
    if (!generateForm.providerId || !generateForm.periodStart || !generateForm.periodEnd) {
      alert(locale === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields')
      return
    }

    setIsGenerating(true)
    try {
      const supabase = createClient()
      const DEFAULT_COMMISSION_RATE = 0.07 // 7% max as fallback

      // Get provider's actual commission settings from database
      const { data: providerData } = await supabase
        .from('providers')
        .select('commission_rate, custom_commission_rate, commission_status, grace_period_end')
        .eq('id', generateForm.providerId)
        .single()

      // Determine commission rate based on provider status
      let providerCommissionRate = DEFAULT_COMMISSION_RATE

      if (providerData) {
        // Check grace period first
        if (providerData.commission_status === 'in_grace_period' &&
            providerData.grace_period_end &&
            new Date() < new Date(providerData.grace_period_end)) {
          providerCommissionRate = 0
        }
        // Check if exempt
        else if (providerData.commission_status === 'exempt') {
          providerCommissionRate = 0
        }
        // Use custom rate if set
        else if (providerData.custom_commission_rate) {
          providerCommissionRate = providerData.custom_commission_rate / 100
        }
        // Use provider's standard rate
        else if (providerData.commission_rate) {
          providerCommissionRate = providerData.commission_rate / 100
        }
      }

      // Get all order IDs already included in previous settlements
      const { data: existingSettlements, error: existingError } = await supabase
        .from('settlements')
        .select('id, orders_included, status, created_at')
        .not('orders_included', 'is', null)

      console.log('[Custom] Existing settlements:', existingSettlements?.length || 0, existingSettlements)
      if (existingError) {
        console.error('[Custom] Error fetching existing settlements:', existingError)
      }

      // Collect all order IDs that are already in settlements
      const settledOrderIds = new Set<string>()
      if (existingSettlements) {
        for (const settlement of existingSettlements) {
          if (settlement.orders_included && Array.isArray(settlement.orders_included)) {
            for (const orderId of settlement.orders_included) {
              settledOrderIds.add(orderId)
            }
          }
        }
      }
      console.log('[Custom] Settled order IDs:', settledOrderIds.size, Array.from(settledOrderIds))

      // Get delivered orders for this provider in the period (including payment_method)
      // IMPORTANT: Use platform_commission from database (calculated by server-side trigger)
      // Include orders that are eligible or have no settlement_status set
      const { data: allOrders } = await supabase
        .from('orders')
        .select('id, total, subtotal, discount, delivery_fee, payment_method, platform_commission, original_commission, settlement_status')
        .eq('provider_id', generateForm.providerId)
        .eq('status', 'delivered')
        .gte('created_at', generateForm.periodStart)
        .lte('created_at', generateForm.periodEnd + 'T23:59:59')

      // Filter out orders that are on_hold, settled, or excluded (client-side for reliability)
      const eligibleOrders = (allOrders || []).filter(o =>
        !o.settlement_status ||
        o.settlement_status === 'eligible' ||
        o.settlement_status === null
      )

      // Filter out orders that are already in previous settlements
      const orders = eligibleOrders.filter(o => !settledOrderIds.has(o.id))

      if (!orders || orders.length === 0) {
        const hasOrdersButSettled = allOrders && allOrders.length > 0 && orders.length === 0
        if (hasOrdersButSettled) {
          alert(locale === 'ar'
            ? 'جميع الطلبات في هذه الفترة مدرجة بالفعل في تسويات سابقة'
            : 'All orders in this period are already included in previous settlements')
        } else {
          alert(locale === 'ar' ? 'لا توجد طلبات في هذه الفترة' : 'No orders found in this period')
        }
        return
      }

      // Get processed refunds for these orders
      const orderIds = orders.map(o => o.id)
      const { data: refundsData } = await supabase
        .from('refunds')
        .select('order_id, processed_amount, amount, status, affects_settlement')
        .in('order_id', orderIds)
        .eq('status', 'processed')

      // ═══════════════════════════════════════════════════════════════════
      // SOURCE OF TRUTH: Build refund map per order for commission adjustment
      // Formula: adjusted_commission = (commission_base - refund) * rate
      // ═══════════════════════════════════════════════════════════════════
      const refundMap = new Map<string, number>()
      if (refundsData) {
        for (const refund of refundsData) {
          if (refund.affects_settlement !== false) {
            const amount = refund.processed_amount || refund.amount || 0
            const existing = refundMap.get(refund.order_id) || 0
            refundMap.set(refund.order_id, existing + amount)
          }
        }
      }

      // Calculate total refunds for settlement record
      const totalRefunds = Array.from(refundMap.values()).reduce((sum, v) => sum + v, 0)

      // Separate orders by payment method
      const codOrders = orders.filter(o => o.payment_method === 'cash' || o.payment_method === 'cod')
      const onlineOrders = orders.filter(o => o.payment_method !== 'cash' && o.payment_method !== 'cod')

      // ═══════════════════════════════════════════════════════════════════
      // SOURCE OF TRUTH FORMULA (from financial_settlement_engine.sql):
      // commission_base = subtotal - discount (NO delivery)
      // commission = (commission_base - refund_amount) * rate / 100
      // ═══════════════════════════════════════════════════════════════════

      // Helper function to calculate adjusted commission per order
      const calculateOrderCommission = (order: typeof orders[0]): number => {
        const subtotal = order.subtotal ?? ((order.total || 0) - (order.delivery_fee || 0))
        const discount = order.discount || 0
        const refund = refundMap.get(order.id) || 0
        const commissionBase = subtotal - discount
        const netForCommission = Math.max(0, commissionBase - refund)
        // If grace period (commission = 0), respect that
        if (providerCommissionRate === 0) return 0
        return netForCommission * providerCommissionRate
      }

      // COD breakdown - calculate all values
      const codGrossRevenue = codOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      const codDeliveryFees = codOrders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0)
      const codNetRevenue = codGrossRevenue - codDeliveryFees
      const codCommissionOwed = codOrders.reduce((sum, o) => sum + calculateOrderCommission(o), 0)
      const codOriginalCommission = codOrders.reduce((sum, o) => sum + (o.original_commission || o.platform_commission || 0), 0)

      // Online breakdown - calculate all values
      const onlineGrossRevenue = onlineOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      const onlineDeliveryFees = onlineOrders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0)
      const onlineNetRevenue = onlineGrossRevenue - onlineDeliveryFees
      const onlinePlatformCommission = onlineOrders.reduce((sum, o) => sum + calculateOrderCommission(o), 0)
      const onlineOriginalCommission = onlineOrders.reduce((sum, o) => sum + (o.original_commission || o.platform_commission || 0), 0)
      const onlinePayoutOwed = onlineGrossRevenue - onlinePlatformCommission - totalRefunds

      // Calculate totals (adjusted for refunds)
      const grossRevenue = codGrossRevenue + onlineGrossRevenue
      const deliveryFeesCollected = codDeliveryFees + onlineDeliveryFees
      const platformCommission = codCommissionOwed + onlinePlatformCommission

      // net_payout = gross_revenue - platform_commission
      const netPayout = grossRevenue - platformCommission

      // Net balance: Platform owes provider minus provider owes platform
      const netBalance = onlinePayoutOwed - codCommissionOwed

      // Determine settlement direction
      let settlementDirection: 'platform_pays_provider' | 'provider_pays_platform' | 'balanced' = 'balanced'
      if (netBalance > 0.01) {
        settlementDirection = 'platform_pays_provider'
      } else if (netBalance < -0.01) {
        settlementDirection = 'provider_pays_platform'
      }

      // Create settlement with full breakdown (ALL values calculated and stored)
      const { error: insertError } = await supabase
        .from('settlements')
        .insert({
          provider_id: generateForm.providerId,
          period_start: generateForm.periodStart,
          period_end: generateForm.periodEnd,
          total_orders: orders.length,
          gross_revenue: grossRevenue,
          platform_commission: platformCommission,
          net_payout: netPayout,
          delivery_fees_collected: deliveryFeesCollected,
          total_refunds: totalRefunds,
          // COD breakdown
          cod_orders_count: codOrders.length,
          cod_gross_revenue: codGrossRevenue,
          cod_delivery_fees: codDeliveryFees,
          cod_net_revenue: codNetRevenue,
          cod_commission_owed: codCommissionOwed,
          cod_original_commission: codOriginalCommission,
          // Online breakdown
          online_orders_count: onlineOrders.length,
          online_gross_revenue: onlineGrossRevenue,
          online_delivery_fees: onlineDeliveryFees,
          online_net_revenue: onlineNetRevenue,
          online_platform_commission: onlinePlatformCommission,
          online_original_commission: onlineOriginalCommission,
          online_payout_owed: onlinePayoutOwed,
          // Net calculation
          net_balance: netBalance,
          settlement_direction: settlementDirection,
          status: 'pending',
          orders_included: orders.map(o => o.id),
        })

      if (insertError) {
        alert(locale === 'ar' ? 'حدث خطأ أثناء إنشاء التسوية' : 'Error creating settlement')
      } else {
        // Mark orders as settled
        const orderIds = orders.map(o => o.id)
        await supabase
          .from('orders')
          .update({ settlement_status: 'settled' })
          .in('id', orderIds)

        alert(locale === 'ar' ? 'تم إنشاء التسوية بنجاح' : 'Settlement generated successfully')
        setShowGenerateModal(false)
        setGenerateForm({ providerId: '', periodStart: '', periodEnd: '' })
        await handleRefresh()
      }
    } catch {
      alert(locale === 'ar' ? 'حدث خطأ أثناء إنشاء التسوية' : 'Error generating settlement')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleRecordPayment() {
    if (!selectedSettlement || !paymentForm.amount) {
      alert(locale === 'ar' ? 'يرجى إدخال المبلغ' : 'Please enter amount')
      return
    }

    setIsProcessingPayment(true)
    try {
      const supabase = createClient()
      const paidAmount = parseFloat(paymentForm.amount)

      // Update settlement with amount_paid and status
      const { error } = await supabase
        .from('settlements')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          amount_paid: paidAmount,
          payment_method: paymentForm.method,
          payment_reference: paymentForm.reference || null,
        })
        .eq('id', selectedSettlement.id)

      if (error) {
        alert(locale === 'ar' ? 'حدث خطأ أثناء تسجيل الدفع' : 'Error recording payment')
      } else {
        alert(locale === 'ar' ? 'تم تسجيل الدفع بنجاح' : 'Payment recorded successfully')
        setShowPaymentModal(false)
        setSelectedSettlement(null)
        setPaymentForm({ amount: '', method: 'cash', reference: '' })
        await handleRefresh()
      }
    } finally {
      setIsProcessingPayment(false)
    }
  }

  async function handleUpdateOverdue() {
    // This function is not needed since we don't have due dates
    // Just refresh to get latest data
    alert(locale === 'ar' ? 'تم تحديث البيانات' : 'Data updated')
    await handleRefresh()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'status-success'
      case 'waived': return 'status-success'
      case 'pending': return 'status-warning'
      case 'partially_paid': return 'status-in-progress'
      case 'overdue': return 'status-error'
      case 'disputed': return 'status-error'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      pending: { ar: 'معلق', en: 'Pending' },
      partially_paid: { ar: 'مدفوع جزئياً', en: 'Partially Paid' },
      paid: { ar: 'مدفوع', en: 'Paid' },
      overdue: { ar: 'متأخر', en: 'Overdue' },
      disputed: { ar: 'متنازع عليه', en: 'Disputed' },
      waived: { ar: 'معفى', en: 'Waived' },
    }
    return labels[status]?.[locale === 'ar' ? 'ar' : 'en'] || status
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="w-3 h-3" />
      case 'waived': return <CheckCircle2 className="w-3 h-3" />
      case 'pending': return <Clock className="w-3 h-3" />
      case 'partially_paid': return <TrendingUp className="w-3 h-3" />
      case 'overdue': return <AlertTriangle className="w-3 h-3" />
      case 'disputed': return <AlertTriangle className="w-3 h-3" />
      default: return null
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CSV Export Handler
  // ═══════════════════════════════════════════════════════════════════════════

  function handleExportCSV() {
    if (filteredSettlements.length === 0) {
      alert(locale === 'ar' ? 'لا توجد تسويات للتصدير' : 'No settlements to export')
      return
    }

    // Convert settlements to Settlement type format
    const exportData = filteredSettlements.map(s => ({
      id: s.id,
      providerId: s.provider_id,
      providerName: {
        ar: s.provider?.name_ar || '',
        en: s.provider?.name_en || '',
      },
      periodStart: s.period_start,
      periodEnd: s.period_end,
      totalOrders: s.total_orders,
      grossRevenue: s.gross_revenue,
      platformCommission: s.platform_commission,
      deliveryFeesCollected: s.delivery_fees_collected || 0,
      netAmountDue: s.net_amount_due || 0,
      netPayout: s.net_payout || 0,
      netBalance: s.net_balance || s.net_amount_due || 0,
      settlementDirection: (s.settlement_direction || 'balanced') as 'platform_pays_provider' | 'provider_pays_platform' | 'balanced',
      status: s.status,
      amountPaid: s.amount_paid || 0,
      paymentDate: s.paid_at || null,
      paidAt: s.paid_at || null,
      paymentMethod: s.payment_method || null,
      paymentReference: s.payment_reference || null,
      dueDate: s.due_date || '',
      isOverdue: s.is_overdue || false,
      cod: {
        ordersCount: s.cod_orders_count || 0,
        grossRevenue: s.cod_revenue || 0,
        commissionOwed: s.cod_commission_owed || 0,
      },
      online: {
        ordersCount: s.online_orders_count || 0,
        grossRevenue: s.online_revenue || 0,
        platformCommission: s.online_platform_commission || 0,
        payoutOwed: s.online_platform_owes || 0,
      },
    }))

    exportSettlementsToCSV(exportData as never[], { locale: locale as 'ar' | 'en' })
  }

  if (loading) {
    return (
      <>
        <div className="sticky top-0 z-40 bg-white border-b border-slate-200 animate-pulse">
          <div className="h-16 px-4 flex items-center justify-between">
            <div className="h-6 w-32 bg-slate-200 rounded"></div>
            <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
          </div>
        </div>
        <main className="flex-1 p-4 lg:p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
        </main>
      </>
    )
  }

  if (!user || !isAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'إدارة التسويات' : 'Settlements Management'}
            </h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-slate-900">
              {locale === 'ar' ? 'غير مصرح' : 'Unauthorized'}
            </h1>
            <Link href={`/${locale}/auth/login`}>
              <Button size="lg" className="bg-red-600 hover:bg-red-700">
                {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
              </Button>
            </Link>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'إدارة التسويات' : 'Settlements Management'}
        onMenuClick={toggleSidebar}
      />

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Action Buttons */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Period selector */}
              <select
                value={settlementPeriod}
                onChange={(e) => setSettlementPeriod(Number(e.target.value) as 1 | 3 | 7)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value={1}>{locale === 'ar' ? 'يومي' : 'Daily'}</option>
                <option value={3}>{locale === 'ar' ? 'كل 3 أيام' : 'Every 3 Days'}</option>
                <option value={7}>{locale === 'ar' ? 'أسبوعي' : 'Weekly'}</option>
              </select>

              <Button
                onClick={handleGenerateWeeklySettlements}
                disabled={isGenerating}
                className="bg-primary hover:bg-[#0080b8] text-white"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                {isGenerating
                  ? (locale === 'ar' ? 'جاري الإنشاء...' : 'Generating...')
                  : (locale === 'ar' ? 'إنشاء التسويات' : 'Generate Settlements')
                }
              </Button>

              <Button
                onClick={() => setShowGenerateModal(true)}
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-white"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {locale === 'ar' ? 'تسوية مخصصة' : 'Custom'}
              </Button>

              <Button
                variant="outline"
                onClick={handleRefresh}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {locale === 'ar' ? 'تحديث' : 'Refresh'}
              </Button>

              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={filteredSettlements.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                {locale === 'ar' ? 'تصدير CSV' : 'Export CSV'}
              </Button>

              {/* Link to Settlement Groups */}
              <Link href={`/${locale}/admin/settlements/groups`} className="ml-auto">
                <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                  <Users className="w-4 h-4 mr-2" />
                  {locale === 'ar' ? 'مجموعات التسوية' : 'Settlement Groups'}
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Paid - Green card */}
            <div className="bg-gradient-to-br from-[#22C55E] to-[#16A34A] rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <span className="text-white/80 text-sm">{stats.paidCount} {locale === 'ar' ? 'تسوية' : 'settlements'}</span>
              </div>
              <p className="text-white/80 text-sm mb-1">{locale === 'ar' ? 'إجمالي المدفوع' : 'Total Paid'}</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalPaid, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </div>

            {/* Overdue - Red card */}
            <div className="bg-gradient-to-br from-[#EF4444] to-[#DC2626] rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <span className="text-white/80 text-sm">{stats.overdueCount} {locale === 'ar' ? 'تسوية' : 'settlements'}</span>
              </div>
              <p className="text-white/80 text-sm mb-1">{locale === 'ar' ? 'مستحقات متأخرة' : 'Overdue Dues'}</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalOverdue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </div>

            {/* Pending - Amber card */}
            <div className="bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="text-white/80 text-sm">{stats.pendingCount} {locale === 'ar' ? 'تسوية' : 'settlements'}</span>
              </div>
              <p className="text-white/80 text-sm mb-1">{locale === 'ar' ? 'مستحقات معلقة' : 'Pending Dues'}</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalPending, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </div>

            {/* Held Orders - Purple card */}
            <div
              className="bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-xl p-5 text-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => setShowHeldOrders(!showHeldOrders)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <PauseCircle className="w-6 h-6" />
                </div>
                <span className="text-white/80 text-sm">{stats.heldOrdersCount} {locale === 'ar' ? 'طلب' : 'orders'}</span>
              </div>
              <p className="text-white/80 text-sm mb-1">{locale === 'ar' ? 'طلبات معلقة (نزاعات)' : 'Held Orders (Disputes)'}</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold">{formatCurrency(stats.heldOrdersValue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
                {showHeldOrders ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>
          </div>

          {/* Held Orders Section (Collapsible) */}
          {showHeldOrders && heldOrders.length > 0 && (
            <div className="bg-white rounded-xl border border-purple-200 shadow-sm overflow-hidden mb-6">
              <div className="p-4 border-b border-purple-100 bg-purple-50">
                <div className="flex items-center gap-2">
                  <FileWarning className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-purple-900">
                    {locale === 'ar' ? 'الطلبات المعلقة بسبب النزاعات' : 'Orders Held Due to Disputes'}
                  </h3>
                </div>
                <p className="text-sm text-purple-700 mt-1">
                  {locale === 'ar'
                    ? 'هذه الطلبات مستبعدة من التسويات حتى يتم حل النزاعات المرتبطة بها'
                    : 'These orders are excluded from settlements until their associated disputes are resolved'}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-purple-50/50 border-b border-purple-100">
                    <tr>
                      <th className="text-start px-4 py-3 text-sm font-medium text-purple-700">{locale === 'ar' ? 'رقم الطلب' : 'Order #'}</th>
                      <th className="text-start px-4 py-3 text-sm font-medium text-purple-700">{locale === 'ar' ? 'المزود' : 'Provider'}</th>
                      <th className="text-start px-4 py-3 text-sm font-medium text-purple-700">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                      <th className="text-start px-4 py-3 text-sm font-medium text-purple-700">{locale === 'ar' ? 'سبب التعليق' : 'Hold Reason'}</th>
                      <th className="text-start px-4 py-3 text-sm font-medium text-purple-700">{locale === 'ar' ? 'تاريخ الطلب' : 'Order Date'}</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-purple-700">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50">
                    {heldOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-slate-700">#{order.order_number}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-900">
                            {locale === 'ar' ? order.provider?.name_ar : order.provider?.name_en}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">
                            {formatCurrency(order.total || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-purple-700 bg-purple-100 px-2 py-1 rounded">
                            {order.hold_reason || (locale === 'ar' ? 'طلب استرداد قيد المراجعة' : 'Refund request pending')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">{formatDate(order.created_at, locale)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-purple-600 hover:text-purple-800 hover:bg-purple-100"
                              onClick={() => {
                                if (confirm(locale === 'ar'
                                  ? 'هل تريد تحرير هذا الطلب للتسوية؟ تأكد من حل النزاع أولاً.'
                                  : 'Release this order for settlement? Make sure the dispute is resolved first.')) {
                                  handleReleaseOrder(order.id)
                                }
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              {locale === 'ar' ? 'تحرير' : 'Release'}
                            </Button>
                            <Link href={`/${locale}/admin/orders/${order.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="w-4 h-4 text-slate-500" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث عن مزود...' : 'Search provider...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500`}
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                <option value="pending">{locale === 'ar' ? 'معلق' : 'Pending'}</option>
                <option value="partially_paid">{locale === 'ar' ? 'مدفوع جزئياً' : 'Partially Paid'}</option>
                <option value="paid">{locale === 'ar' ? 'مدفوع' : 'Paid'}</option>
                <option value="overdue">{locale === 'ar' ? 'متأخر' : 'Overdue'}</option>
                <option value="disputed">{locale === 'ar' ? 'متنازع عليه' : 'Disputed'}</option>
              </select>

              {/* Geographic Filter */}
              <GeoFilter
                value={geoFilter}
                onChange={setGeoFilter}
                showDistrict={false}
              />
            </div>
          </div>

          {/* Settlements Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {locale === 'ar' ? 'قائمة التسويات' : 'Settlements List'}
                <span className="text-sm font-normal text-slate-500 ml-2">
                  ({filteredSettlements.length})
                </span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'المزود' : 'Provider'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الفترة' : 'Period'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الطلبات' : 'Orders'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الإيرادات' : 'Revenue'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'العمولة' : 'Commission'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'صافي التاجر' : 'Net Payout'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSettlements.length > 0 ? (
                    filteredSettlements.map((settlement) => {
                      // Get provider's actual commission rate
                      const providerCommissionRate = settlement.provider?.custom_commission_rate
                        ?? settlement.provider?.commission_rate
                        ?? 7

                      return (
                        <tr key={settlement.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                <Building className="w-5 h-5 text-slate-500" />
                              </div>
                              <div>
                                <span className="font-medium text-slate-900">
                                  {locale === 'ar' ? settlement.provider?.name_ar : settlement.provider?.name_en}
                                </span>
                                <p className="text-xs text-slate-500">
                                  {locale === 'ar' ? `عمولة ${providerCommissionRate}%` : `${providerCommissionRate}% rate`}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">
                              <p className="text-slate-900">{formatDate(settlement.period_start, locale)}</p>
                              <p className="text-slate-500">{locale === 'ar' ? 'إلى' : 'to'} {formatDate(settlement.period_end, locale)}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <span className="font-medium text-slate-900">{formatNumber(settlement.total_orders, locale)}</span>
                              <p className="text-xs text-slate-500">
                                {settlement.cod_orders_count || 0} {locale === 'ar' ? 'نقدي' : 'COD'} |{' '}
                                {settlement.online_orders_count || 0} {locale === 'ar' ? 'إلكتروني' : 'Online'}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-900">
                              {formatCurrency(settlement.gross_revenue || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <span className="font-bold text-red-600">
                                {formatCurrency(settlement.platform_commission || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                              </span>
                              <p className="text-xs text-slate-500">
                                ({providerCommissionRate}%)
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-green-600">
                              {formatCurrency(settlement.net_payout || 0, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${getStatusColor(settlement.status)}`}>
                              {getStatusIcon(settlement.status)}
                              {getStatusLabel(settlement.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              {settlement.status === 'pending' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-success hover:text-success/80 hover:bg-card-bg-success"
                                  onClick={() => {
                                    setSelectedSettlement(settlement)
                                    setPaymentForm({
                                      amount: (settlement.platform_commission ?? 0).toString(),
                                      method: 'cash',
                                      reference: '',
                                    })
                                    setShowPaymentModal(true)
                                  }}
                                >
                                  <CreditCard className="w-4 h-4 mr-1" />
                                  {locale === 'ar' ? 'تأكيد' : 'Confirm'}
                                </Button>
                              )}
                              <Link href={`/${locale}/admin/settlements/${settlement.id}`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Eye className="w-4 h-4 text-slate-500" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <Wallet className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500">
                          {locale === 'ar' ? 'لا توجد تسويات' : 'No settlements found'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

      {/* Generate Settlement Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {locale === 'ar' ? 'إنشاء تسوية مخصصة' : 'Generate Custom Settlement'}
              </h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'المزود' : 'Provider'}
                </label>
                <select
                  value={generateForm.providerId}
                  onChange={(e) => setGenerateForm({ ...generateForm, providerId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                >
                  <option value="">{locale === 'ar' ? 'اختر المزود' : 'Select Provider'}</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {locale === 'ar' ? provider.name_ar : provider.name_en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'بداية الفترة' : 'Period Start'}
                </label>
                <input
                  type="date"
                  value={generateForm.periodStart}
                  onChange={(e) => setGenerateForm({ ...generateForm, periodStart: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'نهاية الفترة' : 'Period End'}
                </label>
                <input
                  type="date"
                  value={generateForm.periodEnd}
                  onChange={(e) => setGenerateForm({ ...generateForm, periodEnd: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleGenerateSettlement}
                disabled={isGenerating}
                className="bg-primary hover:bg-[#0080b8] text-white"
              >
                {isGenerating ? (locale === 'ar' ? 'جاري الإنشاء...' : 'Generating...') : (locale === 'ar' ? 'إنشاء' : 'Generate')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedSettlement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {locale === 'ar' ? 'تسجيل دفعة' : 'Record Payment'}
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                <p className="text-sm text-slate-600">
                  {locale === 'ar' ? 'المزود:' : 'Provider:'} <span className="font-medium text-slate-900">
                    {locale === 'ar' ? selectedSettlement.provider?.name_ar : selectedSettlement.provider?.name_en}
                  </span>
                  <span className="text-xs text-slate-500 ms-2">
                    ({selectedSettlement.provider?.custom_commission_rate ?? selectedSettlement.provider?.commission_rate ?? 7}%)
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">{locale === 'ar' ? 'إجمالي الإيرادات' : 'Gross Revenue'}</p>
                    <p className="font-medium text-slate-900">{formatCurrency(selectedSettlement.gross_revenue || 0, locale)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{locale === 'ar' ? 'عمولة المنصة' : 'Commission'}</p>
                    <p className="font-bold text-red-600">{formatCurrency(selectedSettlement.platform_commission || 0, locale)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{locale === 'ar' ? 'صافي التاجر' : 'Net Payout'}</p>
                    <p className="font-bold text-green-600">{formatCurrency(selectedSettlement.net_payout || 0, locale)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{locale === 'ar' ? 'الطلبات' : 'Orders'}</p>
                    <p className="font-medium text-slate-900">{selectedSettlement.total_orders}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'المبلغ' : 'Amount'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                </label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                >
                  <option value="cash">{locale === 'ar' ? 'نقدي' : 'Cash'}</option>
                  <option value="bank_transfer">{locale === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                  <option value="instapay">{locale === 'ar' ? 'انستاباي' : 'InstaPay'}</option>
                  <option value="vodafone_cash">{locale === 'ar' ? 'فودافون كاش' : 'Vodafone Cash'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'مرجع الدفع (اختياري)' : 'Payment Reference (Optional)'}
                </label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  placeholder={locale === 'ar' ? 'رقم المعاملة أو الملاحظات' : 'Transaction ID or notes'}
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleRecordPayment}
                disabled={isProcessingPayment}
                className="bg-success hover:bg-success/90 text-white"
              >
                {isProcessingPayment ? (locale === 'ar' ? 'جاري التسجيل...' : 'Recording...') : (locale === 'ar' ? 'تسجيل الدفع' : 'Record Payment')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
