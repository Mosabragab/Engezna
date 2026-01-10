'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth'
import { CustomerLayout } from '@/components/customer/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Clock,
  CheckCircle2,
  XCircle,
  Store,
  FileText,
  Mic,
  Image as ImageIcon,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  ShoppingBag,
  Package,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CustomOrderRequest, CustomOrderItem, BroadcastStatus } from '@/types/custom-order'

export const dynamic = 'force-dynamic'

// Types
interface BroadcastWithRequests {
  id: string
  status: BroadcastStatus
  original_input_type: 'text' | 'voice' | 'image' | 'mixed'
  original_text: string | null
  voice_url: string | null
  image_urls: string[] | null
  customer_notes: string | null
  pricing_deadline: string
  expires_at: string
  created_at: string
  requests: PricingRequest[]
}

interface PricingRequest {
  id: string
  provider_id: string
  status: string
  items_count: number
  subtotal: number
  delivery_fee: number
  total: number
  priced_at: string | null
  pricing_expires_at: string | null
  order_id: string | null
  provider: {
    id: string
    name_ar: string
    name_en: string
    logo_url: string | null
    rating: number
  }
  items: CustomOrderItem[]
}

export default function CustomOrderReviewPage() {
  const locale = useLocale()
  const router = useRouter()
  const params = useParams()
  const broadcastId = params.id as string
  const { user, loading: authLoading } = useAuth()
  const isRTL = locale === 'ar'

  const [loading, setLoading] = useState(true)
  const [broadcast, setBroadcast] = useState<BroadcastWithRequests | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Approval dialog
  const [selectedRequest, setSelectedRequest] = useState<PricingRequest | null>(null)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [processing, setProcessing] = useState(false)

  // Load broadcast and pricing requests
  const loadBroadcast = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    const supabase = createClient()

    // Fetch broadcast
    const { data: broadcastData, error: broadcastError } = await supabase
      .from('custom_order_broadcasts')
      .select('*')
      .eq('id', broadcastId)
      .eq('customer_id', user.id)
      .single()

    if (broadcastError || !broadcastData) {
      setError(isRTL ? 'لم يتم العثور على الطلب' : 'Order not found')
      setLoading(false)
      return
    }

    // Fetch pricing requests with items
    const { data: requestsData } = await supabase
      .from('custom_order_requests')
      .select(`
        *,
        provider:providers(id, name_ar, name_en, logo_url, rating),
        items:custom_order_items(*)
      `)
      .eq('broadcast_id', broadcastId)
      .in('status', ['priced', 'customer_approved', 'customer_rejected'])
      .order('total', { ascending: true })

    const transformedRequests: PricingRequest[] = (requestsData || []).map(req => ({
      ...req,
      provider: Array.isArray(req.provider) ? req.provider[0] : req.provider,
      items: req.items || [],
    }))

    setBroadcast({
      ...broadcastData,
      requests: transformedRequests,
    })
    setLoading(false)
  }, [user?.id, broadcastId, isRTL])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/${locale}/auth/login?redirect=/custom-order/${broadcastId}`)
      return
    }
    if (user) {
      loadBroadcast()
    }
  }, [user, authLoading, router, locale, broadcastId, loadBroadcast])

  // Handle approve pricing
  const handleApprove = async () => {
    if (!selectedRequest || !user?.id) return

    setProcessing(true)
    try {
      const supabase = createClient()

      // Check if request is still priced (not expired or already approved)
      const { data: currentRequest } = await supabase
        .from('custom_order_requests')
        .select('status, pricing_expires_at')
        .eq('id', selectedRequest.id)
        .single()

      if (!currentRequest || currentRequest.status !== 'priced') {
        throw new Error(isRTL ? 'هذا العرض لم يعد متاحاً' : 'This quote is no longer available')
      }

      // Check if pricing has expired
      if (currentRequest.pricing_expires_at && new Date(currentRequest.pricing_expires_at) < new Date()) {
        throw new Error(isRTL ? 'انتهت صلاحية هذا العرض' : 'This quote has expired')
      }

      // Update request status to approved
      const { error: updateRequestError } = await supabase
        .from('custom_order_requests')
        .update({
          status: 'customer_approved',
          responded_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id)

      if (updateRequestError) throw updateRequestError

      // Update order status to accepted (if order exists)
      if (selectedRequest.order_id) {
        const { error: updateOrderError } = await supabase
          .from('orders')
          .update({
            status: 'accepted',
            pricing_status: 'pricing_approved',
            pricing_responded_at: new Date().toISOString(),
          })
          .eq('id', selectedRequest.order_id)

        if (updateOrderError) throw updateOrderError
      }

      // Update broadcast to completed
      const { error: updateBroadcastError } = await supabase
        .from('custom_order_broadcasts')
        .update({
          status: 'completed',
          winning_order_id: selectedRequest.order_id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', broadcastId)

      if (updateBroadcastError) throw updateBroadcastError

      // Cancel other pending requests
      await supabase
        .from('custom_order_requests')
        .update({ status: 'cancelled' })
        .eq('broadcast_id', broadcastId)
        .neq('id', selectedRequest.id)
        .in('status', ['pending', 'priced'])

      setShowApproveDialog(false)

      // Redirect to order page
      if (selectedRequest.order_id) {
        router.push(`/${locale}/orders/${selectedRequest.order_id}`)
      } else {
        router.push(`/${locale}/orders`)
      }
    } catch (err) {
      console.error('Error approving pricing:', err)
      setError(err instanceof Error ? err.message : (isRTL ? 'حدث خطأ' : 'An error occurred'))
    } finally {
      setProcessing(false)
    }
  }

  // Handle reject pricing
  const handleReject = async () => {
    if (!selectedRequest) return

    setProcessing(true)
    try {
      const supabase = createClient()

      // Update request status to rejected
      const { error: updateError } = await supabase
        .from('custom_order_requests')
        .update({
          status: 'customer_rejected',
          responded_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id)

      if (updateError) throw updateError

      // If order exists, cancel it
      if (selectedRequest.order_id) {
        await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            pricing_status: 'pricing_rejected',
            pricing_responded_at: new Date().toISOString(),
            cancellation_reason: isRTL ? 'العميل رفض التسعيرة' : 'Customer rejected the quote',
          })
          .eq('id', selectedRequest.order_id)
      }

      setShowRejectDialog(false)
      setSelectedRequest(null)
      loadBroadcast() // Refresh data
    } catch (err) {
      console.error('Error rejecting pricing:', err)
      setError(isRTL ? 'حدث خطأ أثناء رفض العرض' : 'Error rejecting quote')
    } finally {
      setProcessing(false)
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Check if broadcast has expired
  const isExpired = broadcast?.expires_at ? new Date(broadcast.expires_at) < new Date() : false

  // Loading state
  if (loading || authLoading) {
    return (
      <CustomerLayout
        headerTitle={isRTL ? 'مراجعة التسعيرات' : 'Review Quotes'}
        showBackButton
        showBottomNav={true}
      >
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              {isRTL ? 'جاري التحميل...' : 'Loading...'}
            </p>
          </div>
        </div>
      </CustomerLayout>
    )
  }

  // Error state
  if (error || !broadcast) {
    return (
      <CustomerLayout
        headerTitle={isRTL ? 'مراجعة التسعيرات' : 'Review Quotes'}
        showBackButton
        showBottomNav={true}
      >
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {error || (isRTL ? 'حدث خطأ' : 'An error occurred')}
          </h2>
          <Link href={`/${locale}/orders`}>
            <Button className="mt-4">
              {isRTL ? 'العودة للطلبات' : 'Back to Orders'}
            </Button>
          </Link>
        </div>
      </CustomerLayout>
    )
  }

  // Get priced requests
  const pricedRequests = broadcast.requests.filter(r => r.status === 'priced')
  const approvedRequest = broadcast.requests.find(r => r.status === 'customer_approved')

  return (
    <CustomerLayout
      headerTitle={isRTL ? 'مراجعة التسعيرات' : 'Review Quotes'}
      showBackButton
      showBottomNav={true}
    >
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Order Summary */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                {broadcast.original_input_type === 'voice' ? (
                  <Mic className="w-6 h-6 text-primary" />
                ) : broadcast.original_input_type === 'image' ? (
                  <ImageIcon className="w-6 h-6 text-primary" />
                ) : (
                  <FileText className="w-6 h-6 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg mb-1">
                  {isRTL ? 'طلبك الخاص' : 'Your Custom Order'}
                </h2>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {broadcast.original_text || (isRTL ? 'تسجيل صوتي / صور' : 'Voice / Images')}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDate(broadcast.created_at)}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="mt-4 flex items-center gap-2">
              {broadcast.status === 'completed' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  {isRTL ? 'تمت الموافقة' : 'Approved'}
                </span>
              ) : isExpired ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                  <XCircle className="w-4 h-4" />
                  {isRTL ? 'انتهت الصلاحية' : 'Expired'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
                  <Clock className="w-4 h-4" />
                  {isRTL ? 'في انتظار الموافقة' : 'Awaiting Approval'}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Approved Order */}
        {approvedRequest && (
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3 text-green-700">
              {isRTL ? '✅ الطلب المعتمد' : '✅ Approved Order'}
            </h3>
            <Card className="border-2 border-green-500 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  {approvedRequest.provider?.logo_url ? (
                    <img
                      src={approvedRequest.provider.logo_url}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Store className="w-6 h-6 text-green-600" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold">
                      {isRTL ? approvedRequest.provider?.name_ar : approvedRequest.provider?.name_en}
                    </h4>
                    <p className="text-sm text-green-600">
                      {approvedRequest.items_count} {isRTL ? 'أصناف' : 'items'}
                    </p>
                  </div>
                  <div className="ms-auto text-end">
                    <p className="text-2xl font-bold text-green-700">
                      {approvedRequest.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-green-600">{isRTL ? 'ج.م' : 'EGP'}</p>
                  </div>
                </div>

                {approvedRequest.order_id && (
                  <Link href={`/${locale}/orders/${approvedRequest.order_id}`}>
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      {isRTL ? 'تتبع الطلب' : 'Track Order'}
                      {isRTL ? <ArrowLeft className="w-4 h-4 ms-2" /> : <ArrowRight className="w-4 h-4 ms-2" />}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pricing Quotes */}
        {pricedRequests.length > 0 && !approvedRequest && (
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3">
              {isRTL ? `عروض الأسعار (${pricedRequests.length})` : `Price Quotes (${pricedRequests.length})`}
            </h3>
            <div className="space-y-4">
              {pricedRequests.map((request, index) => {
                const isPricingExpired = request.pricing_expires_at
                  ? new Date(request.pricing_expires_at) < new Date()
                  : false

                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={`overflow-hidden ${index === 0 ? 'border-2 border-primary' : ''}`}>
                      {index === 0 && (
                        <div className="bg-primary text-white text-center py-1 text-sm font-medium">
                          {isRTL ? '⭐ أفضل سعر' : '⭐ Best Price'}
                        </div>
                      )}
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-4">
                          {request.provider?.logo_url ? (
                            <img
                              src={request.provider.logo_url}
                              alt=""
                              className="w-12 h-12 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                              <Store className="w-6 h-6 text-slate-500" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-bold">
                              {isRTL ? request.provider?.name_ar : request.provider?.name_en}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {request.items_count} {isRTL ? 'أصناف' : 'items'}
                            </p>
                          </div>
                          <div className="text-end">
                            <p className="text-2xl font-bold text-primary">
                              {request.total.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">{isRTL ? 'ج.م' : 'EGP'}</p>
                          </div>
                        </div>

                        {/* Price breakdown */}
                        <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="text-muted-foreground">{isRTL ? 'المنتجات' : 'Products'}</span>
                            <span>{request.subtotal.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{isRTL ? 'التوصيل' : 'Delivery'}</span>
                            <span>{request.delivery_fee.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}</span>
                          </div>
                        </div>

                        {/* Expiry warning */}
                        {isPricingExpired ? (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                            <p className="text-sm text-red-700">
                              {isRTL ? 'انتهت صلاحية هذا العرض' : 'This quote has expired'}
                            </p>
                          </div>
                        ) : request.pricing_expires_at && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                            <p className="text-sm text-amber-700">
                              {isRTL ? 'ينتهي في: ' : 'Expires: '}
                              {formatDate(request.pricing_expires_at)}
                            </p>
                          </div>
                        )}

                        {/* Action buttons */}
                        {!isPricingExpired && (
                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                setSelectedRequest(request)
                                setShowRejectDialog(true)
                              }}
                            >
                              <XCircle className="w-4 h-4 me-2" />
                              {isRTL ? 'رفض' : 'Reject'}
                            </Button>
                            <Button
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setSelectedRequest(request)
                                setShowApproveDialog(true)
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 me-2" />
                              {isRTL ? 'موافقة' : 'Approve'}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* No quotes yet */}
        {pricedRequests.length === 0 && !approvedRequest && !isExpired && (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">
              {isRTL ? 'في انتظار عروض الأسعار' : 'Waiting for Quotes'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {isRTL
                ? 'التجار يعملون على تسعير طلبك. سيتم إشعارك عند وصول عرض.'
                : 'Merchants are working on pricing your order. You will be notified when a quote arrives.'}
            </p>
            <Link href={`/${locale}/orders`}>
              <Button variant="outline">
                {isRTL ? 'العودة للطلبات' : 'Back to Orders'}
              </Button>
            </Link>
          </div>
        )}

        {/* Expired state */}
        {isExpired && !approvedRequest && (
          <div className="text-center py-12">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">
              {isRTL ? 'انتهت صلاحية الطلب' : 'Order Expired'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {isRTL
                ? 'عذراً، انتهت مهلة هذا الطلب. يمكنك إنشاء طلب جديد.'
                : 'Sorry, this order has expired. You can create a new order.'}
            </p>
            <Link href={`/${locale}/providers`}>
              <Button>
                {isRTL ? 'طلب جديد' : 'New Order'}
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              {isRTL ? 'تأكيد الموافقة' : 'Confirm Approval'}
            </DialogTitle>
            <DialogDescription>
              {isRTL
                ? `هل تريد الموافقة على عرض ${selectedRequest?.provider?.name_ar} بقيمة ${selectedRequest?.total.toFixed(2)} ج.م؟`
                : `Approve ${selectedRequest?.provider?.name_en}'s quote for ${selectedRequest?.total.toFixed(2)} EGP?`}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="bg-green-50 rounded-lg p-4 my-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">{isRTL ? 'الإجمالي' : 'Total'}</span>
                <span className="text-2xl font-bold text-green-700">
                  {selectedRequest.total.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={processing}
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin me-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 me-2" />
              )}
              {isRTL ? 'تأكيد الموافقة' : 'Confirm Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              {isRTL ? 'تأكيد الرفض' : 'Confirm Rejection'}
            </DialogTitle>
            <DialogDescription>
              {isRTL
                ? `هل تريد رفض عرض ${selectedRequest?.provider?.name_ar}؟`
                : `Reject ${selectedRequest?.provider?.name_en}'s quote?`}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={processing}
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin me-2" />
              ) : (
                <XCircle className="w-4 h-4 me-2" />
              )}
              {isRTL ? 'تأكيد الرفض' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  )
}
