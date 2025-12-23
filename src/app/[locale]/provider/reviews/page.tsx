'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ProviderLayout } from '@/components/provider'
import {
  Star,
  MessageSquare,
  User,
  Send,
  X,
  TrendingUp,
  Filter,
} from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

type Review = {
  id: string
  order_id: string
  customer_id: string
  rating: number
  comment: string | null
  provider_response: string | null
  provider_response_at: string | null
  created_at: string
  profiles: {
    full_name: string | null
  } | { full_name: string | null }[] | null
  orders: {
    order_number: string
  } | { order_number: string }[] | null
}

type RatingStats = {
  average: number
  total: number
  distribution: { [key: number]: number }
}

export default function ProviderReviewsPage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [providerId, setProviderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState<Review[]>([])
  const [ratingStats, setRatingStats] = useState<RatingStats>({
    average: 0,
    total: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  })
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [showResponseModal, setShowResponseModal] = useState(false)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [responseText, setResponseText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadReviews = useCallback(async (provId: string) => {
    const supabase = createClient()

    const { data: reviewsData, error } = await supabase
      .from('reviews')
      .select(`
        id,
        order_id,
        customer_id,
        rating,
        comment,
        provider_response,
        provider_response_at,
        created_at,
        profiles:customer_id (
          full_name
        ),
        orders:order_id (
          order_number
        )
      `)
      .eq('provider_id', provId)
      .order('created_at', { ascending: false })

    if (error) return

    if (reviewsData) {
      setReviews(reviewsData as Review[])

      // Calculate stats
      const total = reviewsData.length
      const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      let sum = 0

      reviewsData.forEach((r: any) => {
        distribution[r.rating] = (distribution[r.rating] || 0) + 1
        sum += r.rating
      })

      setRatingStats({
        average: total > 0 ? sum / total : 0,
        total,
        distribution,
      })
    }
  }, [])

  const checkAuthAndLoadReviews = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/provider/reviews`)
      return
    }

    const { data: providerData } = await supabase
      .from('providers')
      .select('id, status')
      .eq('owner_id', user.id)
      .limit(1)

    const provider = providerData?.[0]
    if (!provider || provider.status === 'pending_approval') {
      router.push(`/${locale}/provider`)
      return
    }

    setProviderId(provider.id)
    await loadReviews(provider.id)
    setLoading(false)
  }, [loadReviews, locale, router])

  useEffect(() => {
    checkAuthAndLoadReviews()
  }, [checkAuthAndLoadReviews])

  const handleOpenResponseModal = (review: Review) => {
    setSelectedReview(review)
    setResponseText(review.provider_response || '')
    setShowResponseModal(true)
  }

  const handleSubmitResponse = async () => {
    if (!selectedReview || !responseText.trim()) return

    setSubmitting(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('reviews')
      .update({
        provider_response: responseText.trim(),
        provider_response_at: new Date().toISOString(),
      })
      .eq('id', selectedReview.id)

    if (error) {
      alert(locale === 'ar' ? 'حدث خطأ أثناء إرسال الرد' : 'Error submitting response')
    } else {
      // Update local state
      setReviews(reviews.map(r =>
        r.id === selectedReview.id
          ? { ...r, provider_response: responseText.trim(), provider_response_at: new Date().toISOString() }
          : r
      ))
      setShowResponseModal(false)
      setSelectedReview(null)
      setResponseText('')
    }

    setSubmitting(false)
  }

  const filteredReviews = filterRating
    ? reviews.filter(r => r.rating === filterRating)
    : reviews

  const getCustomerName = (review: Review) => {
    if (Array.isArray(review.profiles)) {
      return review.profiles[0]?.full_name || (locale === 'ar' ? 'عميل' : 'Customer')
    }
    return review.profiles?.full_name || (locale === 'ar' ? 'عميل' : 'Customer')
  }

  const getOrderNumber = (review: Review) => {
    if (Array.isArray(review.orders)) {
      return review.orders[0]?.order_number || review.order_id.slice(0, 8)
    }
    return review.orders?.order_number || review.order_id.slice(0, 8)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-500">
            {locale === 'ar' ? 'جاري تحميل التقييمات...' : 'Loading reviews...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <ProviderLayout
      pageTitle={{ ar: 'التقييمات', en: 'Reviews' }}
      pageSubtitle={{ ar: 'عرض وإدارة تقييمات العملاء', en: 'View and manage customer reviews' }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Average Rating Card */}
          <Card className="bg-white border-slate-200">
            <CardContent className="pt-6 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                <span className="text-4xl font-bold text-slate-900">
                  {ratingStats.average.toFixed(1)}
                </span>
              </div>
              <p className="text-sm text-slate-500">
                {locale === 'ar' ? 'متوسط التقييم' : 'Average Rating'}
              </p>
            </CardContent>
          </Card>

          {/* Total Reviews Card */}
          <Card className="bg-white border-slate-200">
            <CardContent className="pt-6 text-center">
              <MessageSquare className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-3xl font-bold text-slate-900">{ratingStats.total}</p>
              <p className="text-sm text-slate-500">
                {locale === 'ar' ? 'إجمالي التقييمات' : 'Total Reviews'}
              </p>
            </CardContent>
          </Card>

          {/* Response Rate Card */}
          <Card className="bg-white border-slate-200">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-emerald-600">
                {ratingStats.total > 0
                  ? ((reviews.filter(r => r.provider_response).length / ratingStats.total) * 100).toFixed(0)
                  : 0}%
              </p>
              <p className="text-sm text-slate-500">
                {locale === 'ar' ? 'معدل الرد' : 'Response Rate'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Rating Distribution */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'توزيع التقييمات' : 'Rating Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingStats.distribution[rating] || 0
                const percentage = ratingStats.total > 0 ? (count / ratingStats.total) * 100 : 0
                return (
                  <button
                    key={rating}
                    onClick={() => setFilterRating(filterRating === rating ? null : rating)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      filterRating === rating ? 'bg-primary/10' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1 w-16">
                      <span className="font-medium text-slate-700">{rating}</span>
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    </div>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-slate-500 w-12 text-end">
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
            {filterRating && (
              <button
                onClick={() => setFilterRating(null)}
                className="mt-4 text-sm text-primary hover:underline flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                {locale === 'ar' ? 'إزالة الفلتر' : 'Clear Filter'}
              </button>
            )}
          </CardContent>
        </Card>

        {/* Reviews List */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-900">
                {locale === 'ar' ? 'التقييمات' : 'Reviews'}
                {filterRating && (
                  <span className="text-sm font-normal text-slate-500 ms-2">
                    ({filterRating} {locale === 'ar' ? 'نجوم' : 'stars'})
                  </span>
                )}
              </CardTitle>
              <span className="text-sm text-slate-500">
                {filteredReviews.length} {locale === 'ar' ? 'تقييم' : 'reviews'}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {filteredReviews.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500">
                  {locale === 'ar' ? 'لا توجد تقييمات بعد' : 'No reviews yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReviews.map((review) => (
                  <div
                    key={review.id}
                    className="border border-slate-100 rounded-xl p-4"
                  >
                    {/* Review Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {getCustomerName(review)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {locale === 'ar' ? 'طلب رقم:' : 'Order:'} #{getOrderNumber(review)}
                            <span className="mx-2">•</span>
                            {new Date(review.created_at).toLocaleDateString(
                              locale === 'ar' ? 'ar-EG' : 'en-US',
                              { year: 'numeric', month: 'short', day: 'numeric' }
                            )}
                          </p>
                        </div>
                      </div>
                      {/* Rating */}
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Review Comment */}
                    {review.comment && (
                      <p className="text-slate-600 mb-3 leading-relaxed">
                        {review.comment}
                      </p>
                    )}

                    {/* Provider Response */}
                    {review.provider_response ? (
                      <div className="mt-3 p-3 bg-primary/5 rounded-lg border-s-4 border-primary">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-primary">
                            {locale === 'ar' ? 'ردك' : 'Your Response'}
                          </p>
                          <button
                            onClick={() => handleOpenResponseModal(review)}
                            className="text-xs text-primary hover:underline"
                          >
                            {locale === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                        </div>
                        <p className="text-sm text-slate-600">{review.provider_response}</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenResponseModal(review)}
                        className="mt-3 text-primary text-sm font-medium hover:underline flex items-center gap-1"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {locale === 'ar' ? 'إضافة رد' : 'Add Response'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Response Modal */}
      {showResponseModal && selectedReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedReview.provider_response
                  ? (locale === 'ar' ? 'تعديل الرد' : 'Edit Response')
                  : (locale === 'ar' ? 'إضافة رد' : 'Add Response')}
              </h3>
              <button
                onClick={() => {
                  setShowResponseModal(false)
                  setSelectedReview(null)
                  setResponseText('')
                }}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Original Review */}
            <div className="p-4 border-b bg-slate-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= selectedReview.rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-slate-500">
                  {getCustomerName(selectedReview)}
                </span>
              </div>
              {selectedReview.comment && (
                <p className="text-sm text-slate-600">&quot;{selectedReview.comment}&quot;</p>
              )}
            </div>

            {/* Response Input */}
            <div className="p-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {locale === 'ar' ? 'ردك على العميل' : 'Your Response'}
              </label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder={
                  locale === 'ar'
                    ? 'اكتب ردك على تقييم العميل...'
                    : 'Write your response to the customer review...'
                }
                className="w-full p-3 border border-slate-200 rounded-xl resize-none h-32 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                maxLength={500}
              />
              <p className="text-xs text-slate-400 text-end mt-1">
                {responseText.length}/500
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 border-t">
              <button
                onClick={() => {
                  setShowResponseModal(false)
                  setSelectedReview(null)
                  setResponseText('')
                }}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleSubmitResponse}
                disabled={!responseText.trim() || submitting}
                className="flex-1 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {locale === 'ar' ? 'جاري الإرسال...' : 'Sending...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {locale === 'ar' ? 'إرسال الرد' : 'Send Response'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProviderLayout>
  )
}
