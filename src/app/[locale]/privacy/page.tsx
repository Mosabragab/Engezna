'use client'

import { useLocale } from 'next-intl'
import Link from 'next/link'
import { CustomerLayout } from '@/components/customer/layout'
import { ArrowLeft, ArrowRight, Shield, Database, Share2, Lock, UserCheck, Clock, Mail } from 'lucide-react'

export default function PrivacyPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const BackArrow = isRTL ? ArrowRight : ArrowLeft

  const content = {
    ar: {
      title: 'سياسة الخصوصية',
      lastUpdated: 'آخر تحديث: ديسمبر 2025',
      sections: [
        {
          icon: Shield,
          title: '١. مقدمة',
          content: `مرحباً بك في إنجزنا. توضح سياسة الخصوصية هذه كيفية جمع واستخدام والإفصاح عن معلوماتك وحمايتها عند استخدامك لتطبيقنا وموقعنا الإلكتروني.

باستخدامك لإنجزنا، فإنك توافق على جمع واستخدام المعلومات وفقاً لهذه السياسة.`
        },
        {
          icon: Database,
          title: '٢. المعلومات التي نجمعها',
          content: `نجمع فقط الحد الأدنى من المعلومات اللازمة لتقديم خدماتنا:

• الاسم الكامل - لتعريف الحساب ومعالجة الطلبات
• البريد الإلكتروني - للتحقق من الحساب والتواصل
• رقم الهاتف - لتأكيد الطلبات وتنسيق التوصيل
• عناوين التوصيل - لتنفيذ الطلبات
• المحافظة والمدينة - لعرض المتاجر المتاحة في منطقتك

⚠️ هام: إنجزنا لا تستخدم تتبع الموقع الجغرافي اللحظي (GPS). نحن لا نتتبع موقعك المباشر ولا نراقب تحركاتك. يتم تحديد موقعك فقط من خلال المحافظة والمدينة التي تختارها يدوياً.`
        },
        {
          icon: Share2,
          title: '٣. مشاركة المعلومات',
          content: `نشارك المعلومات التالية مع المتاجر لتنفيذ طلباتك:
• اسمك
• عنوان التوصيل
• رقم الهاتف
• تفاصيل الطلب

مقدمو الخدمة ملزمون تعاقدياً باستخدام هذه المعلومات فقط لتنفيذ الطلبات، ويُحظر عليهم استخدامها للتسويق أو أي أغراض أخرى.

🔒 نحن لا نبيع أو نؤجر أو نتاجر بمعلوماتك الشخصية لأطراف ثالثة لأغراض تسويقية.`
        },
        {
          icon: Lock,
          title: '٤. أمان البيانات',
          content: `نطبق إجراءات أمنية مناسبة لحماية معلوماتك:

• التشفير: جميع البيانات المنقولة مشفرة باستخدام SSL/TLS
• التحكم في الوصول: فقط الموظفون المصرح لهم يمكنهم الوصول إلى البيانات
• التخزين الآمن: البيانات مخزنة على خوادم آمنة مع عمليات تدقيق منتظمة
• حماية كلمات المرور: كلمات المرور مشفرة ولا تُخزن كنص عادي`
        },
        {
          icon: UserCheck,
          title: '٥. حقوقك',
          content: `لديك الحق في:

• الوصول: طلب نسخة من بياناتك الشخصية
• التصحيح: تحديث أو تصحيح المعلومات غير الدقيقة
• الحذف: طلب حذف حسابك وبياناتك
• إلغاء الاشتراك: إلغاء الاشتراك من الرسائل الترويجية

لممارسة هذه الحقوق، تواصل معنا على: privacy@engezna.com`
        },
        {
          icon: Clock,
          title: '٦. الاحتفاظ بالبيانات',
          content: `نحتفظ بمعلوماتك الشخصية طالما حسابك نشط أو حسب الحاجة لتقديم الخدمات. يمكنك طلب حذف حسابك والبيانات المرتبطة به في أي وقت عن طريق التواصل مع فريق الدعم.`
        },
        {
          icon: Mail,
          title: '٧. تواصل معنا',
          content: `إذا كانت لديك أسئلة حول سياسة الخصوصية:

🏢 الشركة: سويفكم للتجارة والتصدير
📍 العنوان: ش صالح حمام بجوار مسجد الاباصيري - بني سويف، مصر
📋 السجل التجاري: 2767
📧 البريد الإلكتروني: support@engezna.com
💬 الدعم الفني: من خلال قسم المساعدة في التطبيق`
        }
      ]
    },
    en: {
      title: 'Privacy Policy',
      lastUpdated: 'Last Updated: December 2025',
      sections: [
        {
          icon: Shield,
          title: '1. Introduction',
          content: `Welcome to Engezna. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website.

By using Engezna, you agree to the collection and use of information in accordance with this policy.`
        },
        {
          icon: Database,
          title: '2. Information We Collect',
          content: `We collect only the minimum information necessary to provide our services:

• Full Name - Account identification and order processing
• Email Address - Account verification and communications
• Phone Number - Order confirmation and delivery coordination
• Delivery Addresses - Order fulfillment
• Governorate & City - Displaying relevant stores in your area

⚠️ Important: Engezna does NOT use real-time GPS tracking. We do not track your live location or monitor your movements. Your location is determined solely by the governorate and city you manually select.`
        },
        {
          icon: Share2,
          title: '3. Information Sharing',
          content: `We share the following information with stores to fulfill your orders:
• Your name
• Delivery address
• Phone number
• Order details

Service providers are contractually obligated to use this information solely for order fulfillment and are prohibited from using it for marketing or other purposes.

🔒 We NEVER sell, rent, or trade your personal information to third parties for marketing purposes.`
        },
        {
          icon: Lock,
          title: '4. Data Security',
          content: `We implement appropriate security measures to protect your personal information:

• Encryption: All transmitted data is encrypted using SSL/TLS
• Access Control: Only authorized personnel can access personal data
• Secure Storage: Data is stored on secure servers with regular audits
• Password Protection: Passwords are hashed and never stored in plain text`
        },
        {
          icon: UserCheck,
          title: '5. Your Rights',
          content: `You have the right to:

• Access: Request a copy of your personal data
• Correction: Update or correct inaccurate information
• Deletion: Request deletion of your account and data
• Opt-out: Unsubscribe from promotional communications

To exercise these rights, contact us at: privacy@engezna.com`
        },
        {
          icon: Clock,
          title: '6. Data Retention',
          content: `We retain your personal information for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time by contacting our support team.`
        },
        {
          icon: Mail,
          title: '7. Contact Us',
          content: `If you have questions about this Privacy Policy:

🏢 Company: Sweifcom for Trade and Export
📍 Address: Saleh Hammam St., next to Al-Abasiri Mosque, Beni Suef, Egypt
📋 Commercial Registry: 2767
📧 Email: support@engezna.com
💬 Support: Through the app's Help section`
        }
      ]
    }
  }

  const t = content[locale as keyof typeof content] || content.en

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
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{t.title}</h1>
                <p className="text-slate-400 text-sm mt-1">{t.lastUpdated}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {t.sections.map((section, index) => {
              const IconComponent = section.icon
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-[#009DE0]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-5 h-5 text-[#009DE0]" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-[#0F172A] mb-3">
                        {section.title}
                      </h2>
                      <div className="text-slate-600 text-sm md:text-base leading-relaxed whitespace-pre-line">
                        {section.content}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Footer Note */}
            <div className="bg-slate-100 rounded-xl p-6 text-center">
              <p className="text-slate-600 text-sm">
                {isRTL
                  ? 'هذه السياسة متوافقة مع قانون حماية البيانات الشخصية المصري (القانون رقم ١٥١ لسنة ٢٠٢٠)'
                  : 'This policy complies with the Egyptian Personal Data Protection Law (Law No. 151 of 2020)'
                }
              </p>
            </div>

            {/* Related Links */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href={`/${locale}/terms`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0F172A] text-white rounded-lg hover:bg-[#1e293b] transition-colors"
              >
                {isRTL ? 'الشروط والأحكام' : 'Terms & Conditions'}
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
