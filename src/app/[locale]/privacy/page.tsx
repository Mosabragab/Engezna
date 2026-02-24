'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { CustomerLayout } from '@/components/customer/layout';
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  Database,
  Share2,
  Lock,
  UserCheck,
  Clock,
  Mail,
  Trash2,
  Cookie,
  Globe,
  CreditCard,
  Download,
  Baby,
  FileText,
  Loader2,
  Target,
  Plane,
  Scale,
  ShieldAlert,
} from 'lucide-react';

export default function PrivacyPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      const response = await fetch('/api/auth/export-data');

      if (response.status === 401) {
        setExportError(isRTL ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
        return;
      }

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `engezna-data-export-${new Date().toISOString().split('T')[0]}.json`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 5000);
    } catch {
      setExportError(isRTL ? 'حدث خطأ أثناء التصدير' : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const content = {
    ar: {
      title: 'سياسة الخصوصية',
      lastUpdated: 'آخر تحديث: يناير 2026',
      sections: [
        {
          icon: Shield,
          title: '١. مقدمة',
          content: `مرحباً بك في إنجزنا. توضح سياسة الخصوصية هذه كيفية جمع واستخدام والإفصاح عن معلوماتك وحمايتها عند استخدامك لتطبيقنا وموقعنا الإلكتروني.

باستخدامك لإنجزنا، فإنك توافق على جمع واستخدام المعلومات وفقاً لهذه السياسة.`,
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

⚠️ هام: إنجزنا لا تستخدم تتبع الموقع الجغرافي اللحظي (GPS). نحن لا نتتبع موقعك المباشر ولا نراقب تحركاتك.`,
        },
        {
          icon: Target,
          title: '٣. كيف نستخدم معلوماتك',
          content: `نستخدم المعلومات المجمعة من أجل:

١. معالجة الطلبات:
• إنشاء وإدارة حسابك
• معالجة وتنفيذ طلباتك
• إرسال تأكيدات وتحديثات الطلبات

٢. تحسين الخدمة:
• تحليل أنماط الاستخدام لتحسين المنصة
• معالجة المشكلات التقنية
• تطوير ميزات جديدة

٣. التواصل:
• إرسال العروض الترويجية (بموافقتك)
• الرد على استفسارات الدعم الفني
• تقديم إعلانات الخدمة المهمة`,
        },
        {
          icon: Share2,
          title: '٤. مشاركة المعلومات',
          content: `نشارك المعلومات التالية مع المتاجر لتنفيذ طلباتك:
• اسمك وعنوان التوصيل ورقم الهاتف وتفاصيل الطلب

مقدمو الخدمة ملزمون تعاقدياً باستخدام هذه المعلومات فقط لتنفيذ الطلبات.

🔒 نحن لا نبيع أو نؤجر بياناتك لأطراف ثالثة.`,
        },
        {
          icon: Lock,
          title: '٥. أمان البيانات',
          content: `نطبق إجراءات أمنية مناسبة لحماية معلوماتك:

• التشفير: جميع البيانات مشفرة باستخدام SSL/TLS
• التحكم في الوصول: فقط الموظفون المصرح لهم
• التخزين الآمن: خوادم آمنة مع تدقيق منتظم
• حماية كلمات المرور: مشفرة ولا تُخزن كنص عادي`,
        },
        {
          icon: UserCheck,
          title: '٦. حقوقك',
          content: `لديك الحق في:

• الوصول: طلب نسخة من بياناتك الشخصية
• التصحيح: تحديث المعلومات غير الدقيقة
• الحذف: طلب حذف حسابك وبياناتك
• إلغاء الاشتراك: من الرسائل الترويجية

📧 لممارسة هذه الحقوق: privacy@engezna.com`,
        },
        {
          icon: Baby,
          title: '٧. خصوصية الأطفال',
          content: `إنجزنا غير مخصصة للأطفال دون ١٦ عاماً. نحن لا نجمع معلومات شخصية من الأطفال عن قصد. إذا كنت والداً وتعتقد أن طفلك قدم لنا معلومات شخصية، يُرجى التواصل معنا.`,
        },
        {
          icon: Cookie,
          id: 'cookies',
          title: '٨. الكوكيز والتقنيات المشابهة',
          content: `نستخدم ملفات تعريف الارتباط (الكوكيز) لتحسين تجربتك:

🔹 أنواع الكوكيز:
• كوكيز أساسية (Supabase) - للمصادقة والأمان
• كوكيز التحليلات (Vercel) - إحصائيات مجهولة
• كوكيز الأمان (Sentry) - تتبع الأخطاء
• كوكيز الإشعارات (Firebase) - الإشعارات المهمة

⚙️ يمكنك إدارة الكوكيز من إعدادات متصفحك. تعطيل الكوكيز الأساسية سيمنعك من تسجيل الدخول.`,
        },
        {
          icon: Globe,
          title: '٩. عناوين IP وبيانات التصفح',
          content: `عند استخدامك للخدمة، نجمع تلقائياً:

• عنوان IP - لأغراض الأمان
• معلومات المتصفح والجهاز
• سجلات الوصول (الصفحات، الوقت)

🔒 يتم إخفاء هوية عناوين IP بعد ٣٠ يوماً ولا تُستخدم للإعلانات.`,
        },
        {
          icon: CreditCard,
          title: '١٠. معلومات الدفع',
          content: `ندعم الدفع الإلكتروني عبر Kashier والدفع عند الاستلام.

🔐 أمان الدفع:
• لا نخزن أرقام البطاقات الكاملة
• لا نملك وصولاً لرمز CVV أو PIN
• Kashier متوافق مع PCI-DSS
• البيانات مشفرة من طرف إلى طرف

نتلقى فقط: تأكيد المعاملة وآخر ٤ أرقام من البطاقة.`,
        },
        {
          icon: Trash2,
          title: '١١. كيفية حذف حسابك',
          content: `🔹 خطوات الحذف:
١. افتح تطبيق إنجزنا
٢. اذهب إلى الإعدادات → الحساب
٣. اضغط على "حذف الحساب"
٤. أكد قرارك

✅ ما يُحذف: الملف الشخصي، العناوين، المفضلة، الإشعارات، التقييمات

📌 ما نحتفظ به قانونياً:
• سجل الطلبات (مجهول الهوية) - للضرائب
• سجلات المعاملات - القانون التجاري المصري

⏱️ يتم الحذف خلال ٢٤ ساعة.`,
        },
        {
          icon: Download,
          id: 'data-export',
          title: '١٢. تصدير البيانات',
          content: `لديك الحق في الحصول على نسخة من بياناتك بتنسيق منظم.

📦 يتضمن التصدير: الملف الشخصي، الطلبات، العناوين، المفضلة، التقييمات

⬇️ اضغط الزر أدناه لتحميل بياناتك فوراً (يتطلب تسجيل الدخول)`,
        },
        {
          icon: Clock,
          title: '١٣. الاحتفاظ بالبيانات',
          content: `نحتفظ بمعلوماتك طالما حسابك نشط. يمكنك طلب حذف حسابك في أي وقت.`,
        },
        {
          icon: Scale,
          title: '١٤. الأساس القانوني للمعالجة',
          content: `نعالج بياناتك الشخصية وفقاً لقانون حماية البيانات الشخصية المصري (القانون رقم ١٥١ لسنة ٢٠٢٠) على الأسس التالية:

• تنفيذ العقد: معالجة الطلبات وتقديم الخدمة
• الموافقة: الرسائل الترويجية والتسويقية (يمكنك إلغاء الاشتراك في أي وقت)
• المصلحة المشروعة: تحسين الخدمة ومنع الاحتيال وضمان أمان المنصة
• الالتزام القانوني: الاحتفاظ بالسجلات المالية وفقاً للقانون التجاري المصري`,
        },
        {
          icon: Plane,
          title: '١٥. نقل البيانات الدولي',
          content: `لتقديم خدماتنا بأفضل شكل، نستعين بشركات تقنية موثوقة قد تُعالج بعض بياناتك خارج مصر. هذه الشركات تشمل:

• خدمات تخزين وإدارة الحسابات (Supabase)
• خدمات تشغيل الموقع (Vercel)
• خدمات تحسين الأداء ومعالجة الأخطاء (Sentry)
• خدمات الإشعارات (Firebase)
• خدمات الدفع الإلكتروني (Kashier - داخل مصر)

جميع هذه الشركات ملتزمة بمعايير حماية البيانات الدولية. بياناتك مشفرة أثناء النقل والتخزين، ولا يتم مشاركتها مع أي جهة أخرى بدون إذنك.`,
        },
        {
          icon: ShieldAlert,
          title: '١٦. إخطار الاختراق الأمني',
          content: `في حالة حدوث اختراق أمني يؤثر على بياناتك الشخصية:

• سنقوم بإخطارك خلال ٧٢ ساعة من اكتشاف الاختراق
• سنبلغ الجهات الرقابية المختصة وفقاً للقانون المصري
• سنوضح طبيعة البيانات المتأثرة والإجراءات المتخذة
• سنقدم توصيات لحماية نفسك

📧 للإبلاغ عن مشكلة أمنية: security@engezna.com`,
        },
        {
          icon: FileText,
          title: '١٧. التغييرات على السياسة',
          content: `قد نحدّث هذه السياسة من وقت لآخر. سنُخطرك بالتغييرات عبر:
• نشر السياسة الجديدة هنا
• تحديث تاريخ "آخر تحديث"
• إشعار داخل التطبيق للتغييرات الجوهرية`,
        },
        {
          icon: Mail,
          title: '١٨. تواصل معنا',
          content: `🏢 الشركة: سويفكم للتجارة والتصدير (ذ.م.م)
📍 العنوان: ش صالح حمام، بني سويف، مصر
📋 السجل التجاري: 2767
📧 البريد: support@engezna.com
🔒 الخصوصية: privacy@engezna.com`,
        },
      ],
    },
    en: {
      title: 'Privacy Policy',
      lastUpdated: 'Last Updated: January 2026',
      sections: [
        {
          icon: Shield,
          title: '1. Introduction',
          content: `Welcome to Engezna. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website.

By using Engezna, you agree to the collection and use of information in accordance with this policy.`,
        },
        {
          icon: Database,
          title: '2. Information We Collect',
          content: `We collect only the minimum information necessary:

• Full Name - Account identification and order processing
• Email Address - Account verification and communications
• Phone Number - Order confirmation and delivery
• Delivery Addresses - Order fulfillment
• Governorate & City - Displaying relevant stores

⚠️ Important: Engezna does NOT use real-time GPS tracking. We do not track your live location.`,
        },
        {
          icon: Target,
          title: '3. How We Use Your Information',
          content: `We use the collected information for:

1. Order Processing:
• Creating and managing your account
• Processing and fulfilling your orders
• Sending order confirmations and updates

2. Service Improvement:
• Analyzing usage patterns to improve our platform
• Troubleshooting technical issues
• Developing new features

3. Communication:
• Sending promotional offers (with your consent)
• Responding to customer support inquiries
• Providing important service announcements`,
        },
        {
          icon: Share2,
          title: '4. Information Sharing',
          content: `We share with stores to fulfill your orders:
• Your name, delivery address, phone number, order details

Service providers are contractually obligated to use this information solely for order fulfillment.

🔒 We NEVER sell your personal information to third parties.`,
        },
        {
          icon: Lock,
          title: '5. Data Security',
          content: `We implement appropriate security measures:

• Encryption: All data encrypted using SSL/TLS
• Access Control: Only authorized personnel
• Secure Storage: Secure servers with regular audits
• Password Protection: Hashed, never stored in plain text`,
        },
        {
          icon: UserCheck,
          title: '6. Your Rights',
          content: `You have the right to:

• Access: Request a copy of your personal data
• Correction: Update inaccurate information
• Deletion: Request deletion of your account
• Opt-out: Unsubscribe from promotional communications

📧 Contact: privacy@engezna.com`,
        },
        {
          icon: Baby,
          title: "7. Children's Privacy",
          content: `Engezna is not intended for children under 16 years of age. We do not knowingly collect personal information from children. If you are a parent and believe your child has provided us with personal information, please contact us.`,
        },
        {
          icon: Cookie,
          id: 'cookies',
          title: '8. Cookies and Similar Technologies',
          content: `We use cookies to enhance your experience:

🔹 Cookie Types:
• Essential (Supabase) - Authentication & security
• Analytics (Vercel) - Anonymous statistics
• Security (Sentry) - Error tracking
• Notifications (Firebase) - Push notifications

⚙️ Manage cookies in your browser settings. Disabling essential cookies will prevent login.`,
        },
        {
          icon: Globe,
          title: '9. IP Addresses and Browsing Data',
          content: `When you use our Service, we automatically collect:

• IP Address - For security purposes
• Browser and device information
• Access logs (pages visited, time spent)

🔒 IP addresses are anonymized after 30 days and never used for advertising.`,
        },
        {
          icon: CreditCard,
          title: '10. Payment Information',
          content: `We support online payment via Kashier and Cash on Delivery.

🔐 Payment Security:
• We DO NOT store full card numbers
• We DO NOT have access to CVV or PIN
• Kashier is PCI-DSS compliant
• End-to-end encryption

We only receive: Transaction confirmation and last 4 card digits.`,
        },
        {
          icon: Trash2,
          title: '11. How to Delete Your Account',
          content: `🔹 Deletion Steps:
1. Open Engezna app
2. Go to Settings → Account
3. Tap "Delete Account"
4. Confirm your decision

✅ What's deleted: Profile, addresses, favorites, notifications, reviews

📌 What we keep legally:
• Order history (anonymized) - Tax records
• Transaction records - Egyptian commercial law

⏱️ Deletion within 24 hours.`,
        },
        {
          icon: Download,
          id: 'data-export',
          title: '12. Data Export',
          content: `You have the right to receive a copy of your data in a structured format.

📦 Export includes: Profile, orders, addresses, favorites, reviews

⬇️ Click the button below to download your data instantly (requires login)`,
        },
        {
          icon: Clock,
          title: '13. Data Retention',
          content: `We retain your information as long as your account is active. You may request deletion at any time.`,
        },
        {
          icon: Scale,
          title: '14. Legal Basis for Processing',
          content: `We process your personal data in accordance with the Egyptian Personal Data Protection Law (Law No. 151 of 2020) on the following bases:

• Contract Performance: Processing orders and providing the service
• Consent: Promotional and marketing communications (you can opt out at any time)
• Legitimate Interest: Service improvement, fraud prevention, and platform security
• Legal Obligation: Maintaining financial records as required by Egyptian commercial law`,
        },
        {
          icon: Plane,
          title: '15. International Data Transfer',
          content: `To provide our services effectively, we work with trusted technology companies that may process some of your data outside Egypt. These include:

• Account storage and management services (Supabase)
• Website hosting services (Vercel)
• Performance and error monitoring services (Sentry)
• Notification services (Firebase)
• Electronic payment services (Kashier - within Egypt)

All these companies comply with international data protection standards. Your data is encrypted during transfer and storage, and is never shared with any other party without your consent.`,
        },
        {
          icon: ShieldAlert,
          title: '16. Data Breach Notification',
          content: `In the event of a security breach affecting your personal data:

• We will notify you within 72 hours of discovering the breach
• We will report to the relevant regulatory authorities as required by Egyptian law
• We will explain the nature of the affected data and the measures taken
• We will provide recommendations to protect yourself

📧 To report a security concern: security@engezna.com`,
        },
        {
          icon: FileText,
          title: '17. Changes to This Policy',
          content: `We may update this policy from time to time. We will notify you by:
• Posting the new policy here
• Updating the "Last Updated" date
• In-app notification for significant changes`,
        },
        {
          icon: Mail,
          title: '18. Contact Us',
          content: `🏢 Company: Sweifcom for Trade and Export (LLC)
📍 Address: Saleh Hammam St., Beni Suef, Egypt
📋 Commercial Registry: 2767
📧 Email: support@engezna.com
🔒 Privacy: privacy@engezna.com`,
        },
      ],
    },
  };

  const t = content[locale as keyof typeof content] || content.en;

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
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
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
              const IconComponent = section.icon;
              const sectionId = 'id' in section ? (section as { id?: string }).id : undefined;
              return (
                <div
                  key={index}
                  id={sectionId}
                  className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow scroll-mt-24"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-[#0F172A] mb-3">{section.title}</h2>
                      <div className="text-slate-600 text-sm md:text-base leading-relaxed whitespace-pre-line">
                        {section.content}
                      </div>
                      {/* Data Export Button */}
                      {sectionId === 'data-export' && (
                        <div className="mt-4 space-y-3">
                          <button
                            onClick={handleExportData}
                            disabled={isExporting}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isExporting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {isRTL ? 'جارٍ التصدير...' : 'Exporting...'}
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4" />
                                {isRTL ? 'تحميل بياناتي' : 'Download My Data'}
                              </>
                            )}
                          </button>
                          {exportError && <p className="text-red-500 text-sm">{exportError}</p>}
                          {exportSuccess && (
                            <p className="text-green-600 text-sm">
                              {isRTL
                                ? '✅ تم تحميل بياناتك بنجاح!'
                                : '✅ Your data has been downloaded successfully!'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Footer Note */}
            <div className="bg-slate-100 rounded-xl p-6 text-center">
              <p className="text-slate-600 text-sm">
                {isRTL
                  ? 'هذه السياسة متوافقة مع قانون حماية البيانات الشخصية المصري (القانون رقم ١٥١ لسنة ٢٠٢٠)'
                  : 'This policy complies with the Egyptian Personal Data Protection Law (Law No. 151 of 2020)'}
              </p>
            </div>

            {/* Related Links */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href={`/${locale}/terms`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
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
  );
}
