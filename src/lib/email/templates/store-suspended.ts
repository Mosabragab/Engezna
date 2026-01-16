export interface StoreSuspendedData {
  to: string;
  merchantName: string;
  storeName: string;
  suspensionReason: string;
  suspensionDate: string;
  supportUrl: string;
}

export function storeSuspendedTemplate(data: StoreSuspendedData): string {
  const formattedDate = new Date(data.suspensionDate).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إشعار مهم - إيقاف المتجر مؤقتاً - إنجزنا</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                    <!-- Header -->
                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 36px 24px;">
                            <a href="https://www.engezna.com" style="text-decoration: none;">
                                <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                            </a>
                            <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">إشعار مهم</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <!-- Icon -->
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #FEF2F2; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">⚠️</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تم إيقاف المتجر مؤقتاً</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                                مرحباً ${data.merchantName}، نود إعلامك بأنه تم إيقاف متجرك مؤقتاً
                            </p>

                            <!-- Suspension Info -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF2F2; border-radius: 12px; margin-bottom: 24px; border-right: 4px solid #DC2626;">
                                <tr>
                                    <td style="padding: 20px; text-align: right;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #7F1D1D;">
                                                    <strong style="color: #991B1B;">🏪 المتجر:</strong> ${data.storeName}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #7F1D1D;">
                                                    <strong style="color: #991B1B;">📅 تاريخ الإيقاف:</strong> ${formattedDate}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 0 0 0; font-size: 14px; color: #7F1D1D; line-height: 1.7;">
                                                    <strong style="color: #991B1B;">📝 السبب:</strong><br>
                                                    ${data.suspensionReason}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- What happens now -->
                            <div style="text-align: right; margin-bottom: 24px;">
                                <p style="color: #0F172A; font-size: 15px; font-weight: 600; margin: 0 0 12px 0;">ماذا يعني هذا؟</p>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px;">
                                    <tr>
                                        <td style="padding: 16px 20px;">
                                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569; line-height: 1.7;">
                                                ⛔ لن يظهر متجرك للعملاء حالياً
                                            </p>
                                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569; line-height: 1.7;">
                                                ⛔ لن تستقبل طلبات جديدة
                                            </p>
                                            <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.7;">
                                                ✓ يمكنك الوصول للوحة التحكم لمعالجة المشكلة
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- How to resolve -->
                            <div style="text-align: right; margin-bottom: 24px;">
                                <p style="color: #0F172A; font-size: 15px; font-weight: 600; margin: 0 0 12px 0;">لإعادة تفعيل المتجر:</p>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F0FDF4; border-radius: 12px;">
                                    <tr>
                                        <td style="padding: 16px 20px;">
                                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #166534; line-height: 1.7;">
                                                1. راجع سبب الإيقاف أعلاه
                                            </p>
                                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #166534; line-height: 1.7;">
                                                2. قم بمعالجة المشكلة المذكورة
                                            </p>
                                            <p style="margin: 0; font-size: 14px; color: #166534; line-height: 1.7;">
                                                3. تواصل مع فريق الدعم لطلب إعادة التفعيل
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Button -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="${data.supportUrl}" style="display: inline-block; background-color: #DC2626; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">تواصل مع الدعم ←</a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Divider -->
                            <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                            <!-- Help -->
                            <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                                نحن هنا لمساعدتك! تواصل معنا عبر
                                <a href="https://www.engezna.com/ar/provider/help" style="color: #009DE0; text-decoration: none; font-weight: 500;">مركز مساعدة الشركاء</a>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background-color: #0F172A; padding: 28px 24px;">
                            <a href="https://www.engezna.com" style="text-decoration: none;">
                                <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا" width="100" style="height: auto; display: block; margin: 0 auto;">
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
</html>`;
}
