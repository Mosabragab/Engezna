'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Minus, ShoppingBag, Store } from 'lucide-react'
import { useCart } from '@/lib/store/cart'
import { CustomerLayout } from '@/components/customer/layout'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export default function CartPage() {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations('cart')

  const {
    cart: items,
    provider,
    removeItem,
    updateQuantity,
    clearCart,
    getSubtotal,
    getTotal,
    getItemCount,
  } = useCart()

  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [promoError, setPromoError] = useState('')

  const subtotal = getSubtotal()
  const deliveryFee = provider?.delivery_fee || 0
  const total = getTotal() - discount

  const handleApplyPromo = () => {
    // Placeholder for promo code logic
    if (promoCode.trim().toUpperCase() === 'WELCOME10') {
      setDiscount(subtotal * 0.1)
      setPromoError('')
    } else if (promoCode.trim()) {
      setPromoError(locale === 'ar' ? 'كود غير صالح' : 'Invalid code')
      setDiscount(0)
    }
  }

  const handleCheckout = () => {
    router.push(`/${locale}/checkout`)
  }

  const getName = (item: { name_ar: string; name_en: string }) => {
    return locale === 'ar' ? item.name_ar : item.name_en
  }

  if (items.length === 0) {
    return (
      <CustomerLayout headerTitle={t('title')} showBackButton showBottomNav={false}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <ShoppingBag className="w-12 h-12 text-slate-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{t('empty')}</h2>
          <p className="text-slate-500 text-center mb-6">{t('emptyDescription')}</p>
          <button
            onClick={() => router.push(`/${locale}/providers`)}
            className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            {t('browsStores')}
          </button>
        </div>
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout headerTitle={t('title')} showBackButton showBottomNav={false}>
      <div className="px-4 py-4 pb-32">
        {/* Provider Info */}
        {provider && (
          <div className="bg-slate-50 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{getName(provider)}</h3>
                <p className="text-sm text-slate-500">
                  {items.length} {locale === 'ar' ? 'عناصر' : 'items'}
                </p>
              </div>
            </div>
            <Link
              href={`/${locale}/providers/${provider.id}`}
              className="text-primary text-sm font-medium hover:underline"
            >
              {t('edit')}
            </Link>
          </div>
        )}

        {/* Cart Items */}
        <div className="space-y-3 mb-6">
          {items.map((item) => (
            <div
              key={item.menuItem.id}
              className="bg-white rounded-xl border border-slate-100 p-4"
            >
              <div className="flex gap-3">
                {/* Image */}
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                  {item.menuItem.image_url ? (
                    <img
                      src={item.menuItem.image_url}
                      alt={getName(item.menuItem)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      🍽️
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 truncate">
                    {getName(item.menuItem)}
                  </h4>
                  <p className="text-primary font-bold mt-1">
                    {item.menuItem.price} {locale === 'ar' ? 'ج.م' : 'EGP'}
                  </p>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeItem(item.menuItem.id)}
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:border-red-300 hover:text-red-500 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <span className="font-bold text-slate-900">
                      {(item.menuItem.price * item.quantity).toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add More Items */}
        {provider && (
          <Link
            href={`/${locale}/providers/${provider.id}`}
            className="block bg-slate-50 rounded-xl p-4 text-center text-primary font-medium hover:bg-slate-100 transition-colors mb-6"
          >
            + {t('addMore')} {getName(provider)}
          </Link>
        )}

        {/* Promo Code */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 mb-6">
          <h4 className="font-semibold text-slate-900 mb-3">{t('promoCode')}</h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder={t('promoPlaceholder')}
              className="flex-1 h-10 px-4 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button onClick={handleApplyPromo} variant="outline">
              {t('apply')}
            </Button>
          </div>
          {promoError && (
            <p className="text-red-500 text-sm mt-2">{promoError}</p>
          )}
          {discount > 0 && (
            <p className="text-green-600 text-sm mt-2">
              {locale === 'ar' ? 'تم تطبيق الخصم!' : 'Discount applied!'}
            </p>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 mb-6">
          <h4 className="font-semibold text-slate-900 mb-4">{t('summary')}</h4>

          <div className="space-y-3">
            <div className="flex justify-between text-slate-600">
              <span>{t('subtotal')}</span>
              <span>{subtotal.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>{t('deliveryFee')}</span>
              <span>
                {deliveryFee === 0
                  ? (locale === 'ar' ? 'مجاني' : 'Free')
                  : `${deliveryFee.toFixed(2)} ${locale === 'ar' ? 'ج.م' : 'EGP'}`
                }
              </span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>{t('discount')}</span>
                <span>- {discount.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
              </div>
            )}

            <div className="border-t border-slate-100 pt-3 flex justify-between font-bold text-lg">
              <span>{t('total')}</span>
              <span className="text-primary">{total.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Checkout Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl safe-area-bottom z-50">
        <div className="px-4 py-3">
          {provider && provider.min_order_amount > subtotal && (
            <div className="bg-amber-50 text-amber-700 text-sm rounded-lg px-3 py-2 mb-3 text-center">
              {locale === 'ar'
                ? `أضف ${(provider.min_order_amount - subtotal).toFixed(0)} ج.م للوصول للحد الأدنى`
                : `Add ${(provider.min_order_amount - subtotal).toFixed(0)} EGP to reach minimum order`
              }
            </div>
          )}
          <button
            onClick={handleCheckout}
            disabled={provider && provider.min_order_amount > subtotal}
            className="w-full bg-primary text-white rounded-xl py-4 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <span>{t('checkout')}</span>
            <span className="bg-white/20 px-3 py-1 rounded-lg">{total.toFixed(0)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
          </button>
        </div>
      </div>
    </CustomerLayout>
  )
}
