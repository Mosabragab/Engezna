import type { StoreApprovedData } from '../resend'

export function storeApprovedTemplate(data: StoreApprovedData): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تم تفعيل متجرك!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                    <!-- Header -->
                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 36px 24px;">
                            <a href="https://www.engezna.com" style="text-decoration: none;">
                                <img src="https://cmxpvzqrmptfnuymhxmr.supabase.co/storage/v1/object/public/Logos/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                            </a>
                            <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">تهانينا! 🎊</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <!-- Icon -->
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #DCFCE7; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">✅</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">متجرك أصبح جاهزاً!</h2>

                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                                مبروك يا ${data.merchantName}! 🎉<br>
                                تمت الموافقة على متجرك <strong style="color: #10B981;">"${data.storeName}"</strong> وأصبح متاحاً للعملاء الآن!
                            </p>

                            <!-- Stats Preview -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 20px; text-align: center;">
                                        <p style="margin: 0; font-size: 14px; color: #166534; font-weight: 600;">
                                            🟢 المتجر نشط ومتاح للطلبات
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- What's Next -->
                            <div style="text-align: right; margin-bottom: 24px;">
                                <p style="color: #0F172A; font-size: 15px; font-weight: 600; margin: 0 0 12px 0;">نصائح للبداية:</p>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 14px; color: #475569;">
                                            ✨ تأكد من تحديث أوقات العمل
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 14px; color: #475569;">
                                            📸 أضف صور جذابة لمنتجاتك
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 14px; color: #475569;">
                                            💰 راجع أسعارك ورسوم التوصيل
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 14px; color: #475569;">
                                            🔔 فعّل الإشعارات لتلقي الطلبات فوراً
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Buttons -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 16px 0;">
                                        <a href="${data.dashboardUrl}" style="display: inline-block; background-color: #10B981; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px;">لوحة التحكم ←</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 0 0 24px 0;">
                                        <a href="${data.storeUrl}" style="display: inline-block; background-color: #ffffff; color: #009DE0; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; border: 2px solid #009DE0;">شاهد متجرك على الموقع</a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Divider -->
                            <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                            <!-- Help -->
                            <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                                محتاج مساعدة؟ فريق الدعم جاهز لمساعدتك!
                                <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; font-weight: 500;">مركز المساعدة</a>
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
