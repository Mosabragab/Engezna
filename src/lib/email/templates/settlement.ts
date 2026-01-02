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
    <title>تم تحويل مستحقاتك!</title>
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
                                <img src="https://cmxpvzqrmptfnuymhxmr.supabase.co/storage/v1/object/public/Logos/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                            </a>
                            <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">تسوية مالية جديدة 💰</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <!-- Icon -->
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #DBEAFE; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">💳</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تم تحويل مستحقاتك!</h2>

                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                                مرحباً ${data.merchantName}!<br>
                                تم تحويل مستحقاتك من متجر <strong style="color: #009DE0;">"${data.storeName}"</strong> بنجاح.
                            </p>

                            <!-- Amount Card -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%); border: 2px solid #BAE6FD; border-radius: 16px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 28px; text-align: center;">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #0369A1; font-weight: 500;">المبلغ المحوّل</p>
                                        <p style="margin: 0; font-size: 36px; color: #0F172A; font-weight: 700;" dir="ltr">${formattedAmount}</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Details -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #64748B; text-align: right;">رقم التسوية:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #0F172A; font-weight: 600; text-align: left;" dir="ltr">#${data.settlementId}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #64748B; text-align: right;">تاريخ التحويل:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #0F172A; font-weight: 600; text-align: left;">${formattedDate}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #64748B; text-align: right;">عدد الطلبات:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #0F172A; font-weight: 600; text-align: left;">${data.ordersCount} طلب</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #64748B; text-align: right;">الفترة:</td>
                                                <td style="padding: 8px 0; font-size: 14px; color: #0F172A; font-weight: 600; text-align: left;">${data.period}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 24px 0;">
                                        <a href="${data.dashboardUrl}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px;">عرض التفاصيل ←</a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Divider -->
                            <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                            <!-- Note -->
                            <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                                سيظهر المبلغ في حسابك البنكي خلال ١-٣ أيام عمل حسب البنك الخاص بك.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background-color: #0F172A; padding: 28px 24px;">
                            <a href="https://www.engezna.com" style="text-decoration: none;">
                                <img src="https://cmxpvzqrmptfnuymhxmr.supabase.co/storage/v1/object/public/Logos/engezna-transparent-white-transparent.png" alt="إنجزنا" width="100" style="height: auto; display: block; margin: 0 auto;">
                            </a>
                            <p style="color: #009DE0; font-size: 13px; font-weight: 500; margin: 14px 0;">منصة توصيل محلية حديثة لجمهورية مصر العربية</p>
                            <p style="font-size: 11px; color: #475569; margin: 14px 0 0 0;">صنع بـ 💚 في مصر</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
}
