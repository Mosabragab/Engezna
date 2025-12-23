'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { CustomerLayout } from '@/components/customer/layout'
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Users,
  ShoppingBag,
  Store,
  CreditCard,
  AlertTriangle,
  MessageSquare,
  Scale,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Section {
  id: string
  icon: typeof FileText
  title: string
  content: string
}

export default function TermsPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const BackArrow = isRTL ? ArrowRight : ArrowLeft
  const [expandedSection, setExpandedSection] = useState<string | null>('general')

  const content = {
    ar: {
      title: 'الشروط والأحكام',
      lastUpdated: 'آخر تحديث: ديسمبر 2025',
      tabs: {
        customer: 'شروط العميل',
        provider: 'شروط المتاجر'
      },
      customerSections: [
        {
          id: 'general',
          icon: FileText,
          title: 'طبيعة المنصة ودورها',
          content: `تعمل إنجزنا كوسيط تقني يربط العملاء بمقدمي الخدمات (المتاجر، المطاعم، السوبر ماركت، البقالة، الصيدليات، وغيرها).

⚠️ توضيح هام:
إنجزنا ليست مطعماً أو متجراً أو خدمة توصيل. نحن لسنا مسؤولين عن:
• إعداد الطعام أو جودة المنتجات
• دقة الطلبات وتحضيرها
• توقيت التوصيل وتنفيذه

جميع مقدمي الخدمات هم أعمال تجارية مستقلة ومسؤولون بالكامل عن خدماتهم.`
        },
        {
          id: 'orders',
          icon: ShoppingBag,
          title: 'الطلبات والتوصيل',
          content: `عند تقديم طلب:
• الطلبات تُرسل مباشرة إلى مقدمي الخدمات
• تأكيد الطلب يعتمد على توفر المتجر
• أوقات التوصيل المقدرة تقريبية
• يمكن إلغاء الطلب قبل بدء التحضير فقط

🚚 التوصيل:
يتم التوصيل بواسطة مقدم الخدمة (المتجر) باستخدام موظفيه. إنجزنا لا توظف عمال توصيل ولا تضمن أوقات توصيل محددة.

📍 العنوان:
يجب تقديم عنوان دقيق والتواجد لاستلام الطلب.`
        },
        {
          id: 'discounts',
          icon: CreditCard,
          title: 'أكواد الخصم والعروض',
          content: `قواعد استخدام أكواد الخصم:
• الأكواد للاستخدام الشخصي فقط
• كود واحد لكل طلب
• لا يمكن الجمع بين الأكواد

⚠️ تحتفظ إنجزنا بالحق المطلق في:
• إلغاء أي كود خصم في أي وقت دون إشعار
• إلغاء الطلبات التي تسيء استخدام الأكواد
• حظر الحسابات التي تنشئ حسابات متعددة لاستغلال العروض

عواقب إساءة الاستخدام:
• إلغاء الكود والطلب بدون استرداد
• تعليق الحساب بشكل دائم
• إجراءات قانونية في الحالات الجسيمة`
        },
        {
          id: 'fraud',
          icon: AlertTriangle,
          title: 'الطلبات الوهمية والاحتيال',
          content: `🚫 ممنوع منعاً باتاً:
• تقديم طلبات دون نية استلامها
• تقديم معلومات اتصال كاذبة
• استخدام طرق دفع شخص آخر دون إذن

⚡ إجراء فوري:
أي حساب يُكتشف أنه يقدم طلبات وهمية سيتم:
• حظره فوراً وبشكل دائم
• الإبلاغ عنه للجهات المختصة
• ملاحقته قانونياً

📱 إشعار قانوني:
أرقام الهواتف المستخدمة مسجلة ويمكن تتبعها. تحتفظ إنجزنا بالحق في اتخاذ إجراءات قانونية لاسترداد الأضرار.`
        },
        {
          id: 'disputes',
          icon: MessageSquare,
          title: 'الشكاوى وحل النزاعات',
          content: `يمكن تقديم الشكاوى عبر:
• مركز المساعدة داخل التطبيق
• البريد الإلكتروني: support@engezna.com
• مركز حل النزاعات

⚖️ مركز نزاعات إنجزنا:
عند تصعيد نزاع إلى مركز النزاعات:
• قرار إدارة المنصة نهائي وملزم لجميع الأطراف
• تُتخذ القرارات بناءً على الأدلة المتاحة
• يتم إصدار المبالغ المستردة وفقاً لتقدير المنصة

مقدمو الخدمات الذين تتكرر الشكاوى ضدهم قد يواجهون التعليق أو الإزالة الدائمة.`
        }
      ],
      providerSections: [
        {
          id: 'partnership',
          icon: Store,
          title: 'اتفاقية الشراكة',
          content: `بتسجيلك كمقدم خدمة، توافق على هذه الشروط التي تحكم العلاقة التجارية بين منشأتك والمنصة.

متطلبات الأهلية:
• نشاط تجاري مسجل قانونياً في مصر
• جميع التراخيص والتصاريح المطلوبة
• الامتثال للوائح الصحة والسلامة
• القدرة على تنفيذ الطلبات بسرعة

مسؤولياتك:
• جودة المنتجات وسلامتها
• دقة القوائم والأسعار
• إعداد الطلبات في الوقت المحدد
• إدارة التوصيل بموظفيك`
        },
        {
          id: 'commission',
          icon: CreditCard,
          title: 'هيكل العمولات',
          content: `💰 فترة السماح:
• أول ٦ أشهر: عمولة ٠٪ على جميع الطلبات
• تبدأ من أول طلب على المنصة
• غير قابلة للتحويل أو التمديد

📊 العمولة القياسية (بعد فترة السماح):
• الحد الأقصى: ٧٪ لكل طلب ناجح
• تُحسب على إجمالي الطلب (باستثناء رسوم التوصيل)

مثال:
إجمالي الطلب: ٢٠٠ جنيه
العمولة (٧٪): ١٤ جنيه
يستلم المتجر: ١٨٦ جنيه`
        },
        {
          id: 'settlements',
          icon: Scale,
          title: 'النظام المالي والتسويات',
          content: `💵 نموذج الدفع الحالي (الدفع عند الاستلام):
• العملاء يدفعون للمتجر مباشرة عند التوصيل
• تسوية العمولة بشكل منفصل

🔮 تفويض الدفع الإلكتروني المستقبلي:
يفوض مقدم الخدمة إنجزنا بـ:
• تحصيل مدفوعات الطلبات من العملاء إلكترونياً (مستقبلاً)
• خصم العمولة مباشرة قبل تحويل الرصيد المتبقي
• معالجة وتحويل المبالغ الصافية

⚙️ حقوق المنصة:
• تفعيل أو إلغاء أي طريقة دفع (نقدي/إلكتروني)
• تعديل شروط معالجة الدفع
• تعديل جداول التسوية مع إشعار معقول`
        },
        {
          id: 'termination',
          icon: AlertTriangle,
          title: 'التعليق والإنهاء',
          content: `قد تعلق إنجزنا حسابات المتاجر بسبب:
• شكاوى العملاء المتكررة
• انتهاكات الجودة أو السلامة
• الفشل في تنفيذ الطلبات
• انتهاك هذه الشروط

يجوز لأي طرف إنهاء الشراكة بإشعار كتابي قبل ٣٠ يوماً.

عند الإنهاء:
• يجب تنفيذ جميع الطلبات المعلقة
• العمولات المستحقة تظل واجبة الدفع
• يمكن للمتجر طلب تصدير البيانات`
        }
      ],
      footer: {
        company: 'سويفكم للتجارة والتصدير - سجل تجاري: 2767',
        address: 'ش صالح حمام بجوار مسجد الاباصيري - بني سويف، مصر',
        law: 'هذه الشروط تخضع لقوانين جمهورية مصر العربية وتتوافق مع قانون حماية المستهلك المصري (القانون رقم ١٨١ لسنة ٢٠١٨)',
        contact: 'للاستفسارات: support@engezna.com'
      }
    },
    en: {
      title: 'Terms & Conditions',
      lastUpdated: 'Last Updated: December 2025',
      tabs: {
        customer: 'Customer Terms',
        provider: 'Store Terms'
      },
      customerSections: [
        {
          id: 'general',
          icon: FileText,
          title: 'Platform Nature and Role',
          content: `Engezna operates as a technological intermediary connecting customers with service providers (stores, restaurants, supermarkets, groceries, pharmacies, and more).

⚠️ Important Clarification:
Engezna is NOT a restaurant, store, or delivery service. We are not responsible for:
• Food preparation or product quality
• Order accuracy and preparation
• Delivery timing and execution

All service providers are independent businesses and are fully responsible for their services.`
        },
        {
          id: 'orders',
          icon: ShoppingBag,
          title: 'Orders and Delivery',
          content: `When placing an order:
• Orders are sent directly to service providers
• Order confirmation depends on store availability
• Estimated delivery times are approximate
• Cancellation is only possible before preparation starts

🚚 Delivery:
Delivery is performed by the service provider (store) using their own staff. Engezna does not employ delivery personnel and cannot guarantee specific delivery times.

📍 Address:
You must provide an accurate address and be available to receive the order.`
        },
        {
          id: 'discounts',
          icon: CreditCard,
          title: 'Discount Codes and Promotions',
          content: `Discount code usage rules:
• Codes are for personal use only
• One code per order
• Codes cannot be combined

⚠️ Engezna reserves the absolute right to:
• Revoke any discount code at any time without notice
• Cancel orders that misuse promotional codes
• Permanently ban accounts that create multiple accounts to exploit promotions

Consequences of abuse:
• Code and order cancellation without refund
• Permanent account suspension
• Legal action in severe cases`
        },
        {
          id: 'fraud',
          icon: AlertTriangle,
          title: 'Fake Orders and Fraud',
          content: `🚫 Strictly prohibited:
• Placing orders with no intention of receiving them
• Providing false contact information
• Using someone else's payment methods without authorization

⚡ Immediate action:
Any account found placing fake orders will be:
• Immediately and permanently banned
• Reported to relevant authorities
• Subject to legal pursuit

📱 Legal Notice:
Phone numbers used on the Platform are registered and can be traced. Engezna reserves the right to pursue legal action to recover damages.`
        },
        {
          id: 'disputes',
          icon: MessageSquare,
          title: 'Complaints and Dispute Resolution',
          content: `Complaints can be filed through:
• The in-app Help Center
• Email: support@engezna.com
• The Resolution Center

⚖️ Engezna Resolution Center:
When a dispute is escalated to the Resolution Center:
• The Platform's management decision is final and binding on all parties
• Decisions are made based on available evidence
• Refunds are issued at the Platform's discretion

Service providers with repeated complaints may face suspension or permanent removal.`
        }
      ],
      providerSections: [
        {
          id: 'partnership',
          icon: Store,
          title: 'Partnership Agreement',
          content: `By registering as a service provider, you agree to these terms governing the business relationship between your establishment and the Platform.

Eligibility requirements:
• Legally registered business in Egypt
• All required licenses and permits
• Compliance with health and safety regulations
• Capability to fulfill orders promptly

Your responsibilities:
• Product quality and safety
• Accurate listings and prices
• Timely order preparation
• Managing delivery with your own staff`
        },
        {
          id: 'commission',
          icon: CreditCard,
          title: 'Commission Structure',
          content: `💰 Grace Period:
• First 6 months: 0% commission on all orders
• Starts from your first order on the Platform
• Non-transferable and cannot be extended

📊 Standard Commission (after grace period):
• Maximum: 7% per successful order
• Calculated on order subtotal (excluding delivery fees)

Example:
Order subtotal: 200 EGP
Commission (7%): 14 EGP
Store receives: 186 EGP`
        },
        {
          id: 'settlements',
          icon: Scale,
          title: 'Financial System and Settlements',
          content: `💵 Current Payment Model (Cash on Delivery):
• Customers pay the store directly upon delivery
• Commission is settled separately

🔮 Future Electronic Payment Authorization:
The service provider authorizes Engezna to:
• Collect order payments from customers electronically (future)
• Deduct commission directly before transferring the remaining balance
• Process and transfer net amounts

⚙️ Platform Rights:
• Activate or deactivate any payment method (cash/electronic)
• Modify payment processing terms
• Modify settlement schedules with reasonable notice`
        },
        {
          id: 'termination',
          icon: AlertTriangle,
          title: 'Suspension and Termination',
          content: `Engezna may suspend store accounts for:
• Repeated customer complaints
• Quality or safety violations
• Failure to fulfill orders
• Violation of these Terms

Either party may terminate the partnership with 30 days' written notice.

Upon termination:
• All pending orders must be fulfilled
• Outstanding commissions remain payable
• Store can request data export`
        }
      ],
      footer: {
        company: 'Sweifcom for Trade and Export - Commercial Registry: 2767',
        address: 'Saleh Hammam St., next to Al-Abasiri Mosque, Beni Suef, Egypt',
        law: 'These Terms are governed by the laws of the Arab Republic of Egypt and comply with the Egyptian Consumer Protection Law (Law No. 181 of 2018)',
        contact: 'For inquiries: support@engezna.com'
      }
    }
  }

  const t = content[locale as keyof typeof content] || content.en
  const [activeTab, setActiveTab] = useState<'customer' | 'provider'>('customer')

  const currentSections = activeTab === 'customer' ? t.customerSections : t.providerSections

  return (
    <CustomerLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Header */}
        <div className="bg-[#0F172A] text-white">
          <div className="container mx-auto px-4 py-8">
            <Link
              href={`/${locale}`}
              className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors mb-4"
            >
              <BackArrow className="w-5 h-5" />
              <span>{isRTL ? 'الرئيسية' : 'Home'}</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#009DE0] rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{t.title}</h1>
                <p className="text-slate-400 text-sm mt-1">{t.lastUpdated}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
          <div className="container mx-auto px-4">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('customer')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'customer'
                    ? 'border-[#009DE0] text-[#009DE0]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                <Users className="w-4 h-4" />
                {t.tabs.customer}
              </button>
              <button
                onClick={() => setActiveTab('provider')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'provider'
                    ? 'border-[#009DE0] text-[#009DE0]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                <Store className="w-4 h-4" />
                {t.tabs.provider}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto space-y-4">
            {currentSections.map((section) => {
              const IconComponent = section.icon
              const isExpanded = expandedSection === section.id

              return (
                <div
                  key={section.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
                >
                  <button
                    onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                    className="w-full flex items-center justify-between p-4 md:p-6 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#009DE0]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-5 h-5 text-[#009DE0]" />
                      </div>
                      <h2 className="text-base md:text-lg font-bold text-[#0F172A]">
                        {section.title}
                      </h2>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 md:px-6 pb-4 md:pb-6">
                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-slate-600 text-sm md:text-base leading-relaxed whitespace-pre-line mt-4">
                          {section.content}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Footer Note */}
            <div className="bg-[#0F172A] rounded-xl p-6 text-center mt-8">
              <Scale className="w-8 h-8 text-[#009DE0] mx-auto mb-3" />
              <p className="text-white font-semibold text-sm mb-1">
                {t.footer.company}
              </p>
              <p className="text-slate-400 text-xs mb-3">
                {t.footer.address}
              </p>
              <p className="text-slate-300 text-sm mb-2">
                {t.footer.law}
              </p>
              <p className="text-slate-400 text-xs">
                {t.footer.contact}
              </p>
            </div>

            {/* Related Links */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href={`/${locale}/privacy`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0F172A] text-white rounded-lg hover:bg-[#1e293b] transition-colors"
              >
                {isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}
              </Link>
              <Link
                href={`/${locale}/help`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {isRTL ? 'مركز المساعدة' : 'Help Center'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  )
}
