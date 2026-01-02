import type { SettlementData } from '../resend'

export function settlementTemplate(data: SettlementData): string {
  const formattedAmount = new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
  }).format(data.amount)

  const formattedDate = new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(data.settlementDate))

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تسوية مالية - إنجزنا</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                    <!-- Header -->
                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, #009DE0 0%, #0077B6 100%); padding: 36px 24px;">
                            <a href="https://www.engezna.com" style="text-decoration: none;">
                                <h1 style="color: #ffffff; font-size: 36px; font-weight: 700; margin: 0; font-family: -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif;">إنجزنا</h1>
                            </a>
                            <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">بوابة الشركاء</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <!-- Icon -->
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #E0F4FF; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">💰</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تم تحويل مستحقاتك!</h2>

                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 32px 0;">
                                مرحباً ${data.merchantName}!<br>
                                تم تحويل مستحقاتك من متجر <strong style="color: #009DE0;">"${data.storeName}"</strong> بنجاح.
                            </p>

                            <!-- Amount Card -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 2px solid #E2E8F0; border-radius: 16px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 28px; text-align: center;">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748B; font-weight: 500;">المبلغ المحوّل</p>
                                        <p style="margin: 0; font-size: 36px; color: #009DE0; font-weight: 700;" dir="ltr">${formattedAmount}</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Details Box -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: right;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 13px; color: #64748B;">رقم التسوية:</td>
                                                <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600; text-align: left;" dir="ltr">#${data.settlementId}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 13px; color: #64748B;">تاريخ التحويل:</td>
                                                <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600; text-align: left;">${formattedDate}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 13px; color: #64748B;">عدد الطلبات:</td>
                                                <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600; text-align: left;">${data.ordersCount} طلب</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 13px; color: #64748B;">الفترة:</td>
                                                <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600; text-align: left;">${data.period}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Note -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: right;">
                                        <p style="margin: 0; font-size: 13px; color: #64748B; line-height: 1.7;">
                                            <strong style="color: #0F172A;">⏰ ملاحظة:</strong> سيظهر المبلغ في حسابك البنكي خلال ١-٣ أيام عمل حسب البنك الخاص بك.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="${data.dashboardUrl}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">عرض التفاصيل ←</a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Divider -->
                            <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                            <!-- Help -->
                            <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                                محتاج مساعدة؟ تواصل معانا عبر
                                <a href="https://www.engezna.com/ar/provider/help" style="color: #009DE0; text-decoration: none; font-weight: 500;">مركز مساعدة الشركاء</a>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background-color: #0F172A; padding: 28px 24px;">
                            <a href="https://www.engezna.com" style="text-decoration: none;">
                                <p style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; font-family: -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif;">إنجزنا</p>
                            </a>
                            <p style="color: #009DE0; font-size: 13px; font-weight: 500; margin: 14px 0;">منصة توصيل محلية حديثة لجمهورية مصر العربية</p>
                            <p style="font-size: 12px; color: #64748B; margin: 10px 0;">لكل محافظات مصر 🇪🇬</p>
                            <p style="font-size: 11px; color: #475569; margin: 14px 0 0 0;">صنع بـ 💚 في مصر</p>
                            <p style="font-size: 11px; color: #64748B; margin: 14px 0 0 0;">
                                <a href="https://www.engezna.com/ar/privacy" style="color: #009DE0; text-decoration: none; margin: 0 6px;">سياسة الخصوصية</a> •
                                <a href="https://www.engezna.com/ar/terms" style="color: #009DE0; text-decoration: none; margin: 0 6px;">الشروط والأحكام</a> •
                                <a href="https://www.engezna.com/ar/provider/help" style="color: #009DE0; text-decoration: none; margin: 0 6px;">دعم الشركاء</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
}
