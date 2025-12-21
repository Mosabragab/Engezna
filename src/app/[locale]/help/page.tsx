'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { CustomerLayout } from '@/components/customer/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Truck,
  HelpCircle,
  Phone,
  Mail,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface FAQItem {
  id: string
  question_ar: string
  question_en: string
  answer_ar: string
  answer_en: string
  category: string
}

interface FAQCategory {
  id: string
  name_ar: string
  name_en: string
  icon: typeof HelpCircle
}

const FAQ_CATEGORIES: FAQCategory[] = [
  { id: 'orders', name_ar: 'الطلبات', name_en: 'Orders', icon: ShoppingBag },
  { id: 'delivery', name_ar: 'التوصيل', name_en: 'Delivery', icon: Truck },
  { id: 'refunds', name_ar: 'المرتجعات والاسترداد', name_en: 'Refunds', icon: RefreshCw },
  { id: 'payments', name_ar: 'الدفع', name_en: 'Payments', icon: CreditCard },
  { id: 'complaints', name_ar: 'الشكاوى', name_en: 'Complaints', icon: MessageSquare },
  { id: 'general', name_ar: 'أسئلة عامة', name_en: 'General', icon: HelpCircle },
]

const FAQ_ITEMS: FAQItem[] = [
  // Orders
  {
    id: '1',
    question_ar: 'كيف أقدم طلب جديد؟',
    question_en: 'How do I place a new order?',
    answer_ar: 'يمكنك تصفح المتاجر المتاحة من الصفحة الرئيسية، اختر المتجر المناسب، ثم أضف المنتجات إلى السلة وأكمل الطلب. يمكنك أيضاً استخدام المساعد الذكي للطلب بالدردشة.',
    answer_en: 'Browse available stores from the homepage, select a store, add products to cart and complete your order. You can also use the smart assistant to order via chat.',
    category: 'orders',
  },
  {
    id: '2',
    question_ar: 'كيف أتابع حالة طلبي؟',
    question_en: 'How do I track my order?',
    answer_ar: 'اذهب إلى "طلباتي" من القائمة السفلية، واختر الطلب المراد متابعته. ستظهر لك حالة الطلب الحالية وجميع التفاصيل.',
    answer_en: 'Go to "My Orders" from the bottom navigation, select the order you want to track. You will see the current order status and all details.',
    category: 'orders',
  },
  {
    id: '3',
    question_ar: 'هل يمكنني إلغاء طلبي؟',
    question_en: 'Can I cancel my order?',
    answer_ar: 'يمكنك إلغاء الطلب قبل أن يبدأ التاجر في تحضيره. بمجرد بدء التحضير، لا يمكن الإلغاء ولكن يمكنك طلب استرداد بعد الاستلام.',
    answer_en: 'You can cancel the order before the merchant starts preparing it. Once preparation starts, cancellation is not possible but you can request a refund after receiving.',
    category: 'orders',
  },
  // Delivery
  {
    id: '4',
    question_ar: 'كم يستغرق التوصيل؟',
    question_en: 'How long does delivery take?',
    answer_ar: 'يختلف وقت التوصيل حسب المتجر والمسافة، عادة من 30 إلى 60 دقيقة. يظهر الوقت المتوقع في صفحة المتجر وعند الطلب.',
    answer_en: 'Delivery time varies by store and distance, usually 30-60 minutes. Expected time is shown on the store page and during ordering.',
    category: 'delivery',
  },
  {
    id: '5',
    question_ar: 'ما هي رسوم التوصيل؟',
    question_en: 'What are the delivery fees?',
    answer_ar: 'تختلف رسوم التوصيل حسب المتجر والمسافة. تظهر الرسوم بوضوح قبل تأكيد الطلب. بعض المتاجر تقدم توصيل مجاني للطلبات الكبيرة.',
    answer_en: 'Delivery fees vary by store and distance. Fees are clearly shown before confirming the order. Some stores offer free delivery for large orders.',
    category: 'delivery',
  },
  {
    id: '6',
    question_ar: 'ماذا لو تأخر الطلب؟',
    question_en: 'What if my order is delayed?',
    answer_ar: 'إذا تأخر الطلب بشكل ملحوظ، يمكنك التواصل مع التاجر من صفحة تفاصيل الطلب أو تقديم شكوى من صفحة الدعم.',
    answer_en: 'If your order is significantly delayed, you can contact the merchant from the order details page or submit a complaint from the support page.',
    category: 'delivery',
  },
  // Refunds
  {
    id: '7',
    question_ar: 'كيف أطلب استرداد أموالي؟',
    question_en: 'How do I request a refund?',
    answer_ar: 'بعد استلام الطلب، اذهب إلى صفحة تفاصيل الطلب واضغط على "طلب مساعدة". اختر المشكلة واطلب الاسترداد. سيراجع التاجر الطلب ويتخذ إجراء.',
    answer_en: 'After receiving your order, go to order details and click "Get Help". Select the issue and request a refund. The merchant will review and take action.',
    category: 'refunds',
  },
  {
    id: '8',
    question_ar: 'كيف يتم الاسترداد؟',
    question_en: 'How is the refund processed?',
    answer_ar: 'حالياً يتم الاسترداد نقداً عن طريق مندوب التوصيل. سيتم إخطارك بموعد استلام المبلغ وعليك تأكيد الاستلام من التطبيق.',
    answer_en: 'Currently refunds are processed as cash via delivery rider. You will be notified of the collection time and must confirm receipt in the app.',
    category: 'refunds',
  },
  {
    id: '9',
    question_ar: 'ماذا لو لم أستلم المبلغ المسترد؟',
    question_en: 'What if I did not receive the refund?',
    answer_ar: 'إذا لم تستلم المبلغ خلال المهلة المحددة (48 ساعة)، اضغط على "لم أستلم" وسيتم تصعيد الشكوى للإدارة للتحقيق.',
    answer_en: 'If you did not receive the amount within the deadline (48 hours), click "Not Received" and the complaint will be escalated to admin for investigation.',
    category: 'refunds',
  },
  // Payments
  {
    id: '10',
    question_ar: 'ما هي طرق الدفع المتاحة؟',
    question_en: 'What payment methods are available?',
    answer_ar: 'حالياً الدفع عند الاستلام نقداً فقط. قريباً سنضيف خيارات الدفع الإلكتروني.',
    answer_en: 'Currently only cash on delivery is available. Electronic payment options coming soon.',
    category: 'payments',
  },
  {
    id: '11',
    question_ar: 'هل يوجد حد أدنى للطلب؟',
    question_en: 'Is there a minimum order amount?',
    answer_ar: 'نعم، كل متجر له حد أدنى للطلب يظهر في صفحة المتجر. لا يمكن إتمام الطلب إذا كان أقل من الحد الأدنى.',
    answer_en: 'Yes, each store has a minimum order amount shown on the store page. Orders below minimum cannot be completed.',
    category: 'payments',
  },
  // Complaints
  {
    id: '12',
    question_ar: 'كيف أقدم شكوى؟',
    question_en: 'How do I submit a complaint?',
    answer_ar: 'من صفحة تفاصيل الطلب، اضغط على "طلب مساعدة" واختر نوع المشكلة. يمكنك أيضاً الوصول لصفحة الدعم من الحساب الشخصي أو من زر المساعدة في المساعد الذكي.',
    answer_en: 'From order details page, click "Get Help" and select the issue type. You can also access support page from profile or via the help button in smart assistant.',
    category: 'complaints',
  },
  {
    id: '13',
    question_ar: 'كم يستغرق حل الشكوى؟',
    question_en: 'How long does complaint resolution take?',
    answer_ar: 'عادة يتم الرد على الشكاوى خلال 24 ساعة. الشكاوى العاجلة (مثل الطلبات الناقصة) تُعالج أسرع.',
    answer_en: 'Complaints are usually responded to within 24 hours. Urgent complaints (like missing items) are processed faster.',
    category: 'complaints',
  },
  // General
  {
    id: '14',
    question_ar: 'ما هي مناطق التغطية؟',
    question_en: 'What areas do you cover?',
    answer_ar: 'حالياً نغطي محافظة بني سويف. يمكنك رؤية المتاجر المتاحة في منطقتك من الصفحة الرئيسية بعد تحديد موقعك.',
    answer_en: 'Currently we cover Beni Suef governorate. You can see available stores in your area from the homepage after setting your location.',
    category: 'general',
  },
  {
    id: '15',
    question_ar: 'كيف أستخدم المساعد الذكي؟',
    question_en: 'How do I use the smart assistant?',
    answer_ar: 'اضغط على زر المساعد الذكي (الأيقونة اللامعة) في أسفل الشاشة. يمكنك الكتابة بالعامية المصرية مثل "عايز 2 برجر" وسيساعدك في الطلب.',
    answer_en: 'Click the smart assistant button (sparkle icon) at the bottom of the screen. You can type in Egyptian Arabic like "عايز 2 برجر" and it will help you order.',
    category: 'general',
  },
  {
    id: '16',
    question_ar: 'كيف أتواصل مع الدعم الفني؟',
    question_en: 'How do I contact support?',
    answer_ar: 'يمكنك التواصل عبر واتساب على الرقم الموجود في التطبيق، أو إرسال بريد إلكتروني إلى support@engezna.com، أو تقديم شكوى من صفحة الدعم.',
    answer_en: 'You can contact via WhatsApp using the number in the app, email support@engezna.com, or submit a complaint from the support page.',
    category: 'general',
  },
]

export default function HelpPage() {
  const locale = useLocale()
  const router = useRouter()
  const isArabic = locale === 'ar'

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter FAQs based on search and category
  const filteredFAQs = FAQ_ITEMS.filter((faq) => {
    const matchesCategory = !selectedCategory || faq.category === selectedCategory
    const matchesSearch = !searchQuery ||
      (isArabic ? faq.question_ar : faq.question_en).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (isArabic ? faq.answer_ar : faq.answer_en).toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <CustomerLayout showBottomNav={true}>
      <div className="px-4 py-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"
          >
            {isArabic ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isArabic ? 'مركز المساعدة' : 'Help Center'}
            </h1>
            <p className="text-sm text-slate-500">
              {isArabic ? 'أسئلة شائعة ومساعدة' : 'FAQs and Support'}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className={cn(
            "absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400",
            isArabic ? "right-3" : "left-3"
          )} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isArabic ? 'ابحث عن سؤالك...' : 'Search for your question...'}
            className={cn(
              "w-full py-3 bg-slate-100 rounded-xl text-slate-900 placeholder:text-slate-400",
              "focus:outline-none focus:ring-2 focus:ring-primary/30",
              isArabic ? "pr-11 pl-4" : "pl-11 pr-4"
            )}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link
            href={`/${locale}/profile/support`}
            className="flex items-center gap-3 p-4 bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors"
          >
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">
                {isArabic ? 'تذاكر الدعم' : 'Support Tickets'}
              </p>
              <p className="text-xs text-slate-500">
                {isArabic ? 'تتبع شكاواك' : 'Track complaints'}
              </p>
            </div>
          </Link>
          <a
            href="https://wa.me/201XXXXXXXXX"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
          >
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">
                {isArabic ? 'واتساب' : 'WhatsApp'}
              </p>
              <p className="text-xs text-slate-500">
                {isArabic ? 'تواصل مباشر' : 'Direct contact'}
              </p>
            </div>
          </a>
        </div>

        {/* Categories */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            {isArabic ? 'الأقسام' : 'Categories'}
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                !selectedCategory
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {isArabic ? 'الكل' : 'All'}
            </button>
            {FAQ_CATEGORIES.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                    selectedCategory === category.id
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {isArabic ? category.name_ar : category.name_en}
                </button>
              )
            })}
          </div>
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {isArabic ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
            {searchQuery && (
              <span className="text-sm font-normal text-slate-500 mr-2">
                ({filteredFAQs.length} {isArabic ? 'نتيجة' : 'results'})
              </span>
            )}
          </h2>

          {filteredFAQs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500">
                {isArabic
                  ? 'لم نجد نتائج مطابقة. جرب كلمات بحث مختلفة.'
                  : 'No matching results. Try different search terms.'}
              </p>
            </div>
          ) : (
            filteredFAQs.map((faq) => (
              <Card key={faq.id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                  className="w-full text-right"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          {isArabic ? faq.question_ar : faq.question_en}
                        </p>
                        {expandedId === faq.id && (
                          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                            {isArabic ? faq.answer_ar : faq.answer_en}
                          </p>
                        )}
                      </div>
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                        expandedId === faq.id ? "bg-primary/10" : "bg-slate-100"
                      )}>
                        {expandedId === faq.id ? (
                          <ChevronUp className="w-4 h-4 text-primary" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </button>
              </Card>
            ))
          )}
        </div>

        {/* Contact Section */}
        <div className="mt-8 p-6 bg-slate-100 rounded-2xl text-center">
          <HelpCircle className="w-12 h-12 text-primary mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 mb-2">
            {isArabic ? 'لم تجد إجابتك؟' : "Didn't find your answer?"}
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            {isArabic
              ? 'تواصل معنا مباشرة وسنساعدك'
              : 'Contact us directly and we will help you'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://wa.me/201XXXXXXXXX"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
            >
              <Phone className="w-5 h-5" />
              {isArabic ? 'واتساب' : 'WhatsApp'}
            </a>
            <a
              href="mailto:support@engezna.com"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              <Mail className="w-5 h-5" />
              {isArabic ? 'البريد الإلكتروني' : 'Email'}
            </a>
          </div>
        </div>
      </div>
    </CustomerLayout>
  )
}
