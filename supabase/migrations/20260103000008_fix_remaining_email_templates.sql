-- ============================================================================
-- Fix Remaining Email Templates Header and Footer
-- Direct update for templates with different HTML structure
-- ============================================================================

-- customer-refund-initiated
UPDATE email_templates
SET html_content = E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>طلب الاسترداد قيد المعالجة</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                <tr>
                    <td align="center" style="background: linear-gradient(135deg, #009DE0 0%, #0077B6 100%); padding: 36px 24px;">
                        <a href="https://www.engezna.com" style="text-decoration: none;">
                            <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                        </a>
                        <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">عايز تطلب؟ إنجزنا!</p>
                    </td>
                </tr>

                <tr>
                    <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                        <div style="display: inline-block; width: 72px; height: 72px; background-color: #FEF3C7; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">⏳</div>

                        <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">طلب الاسترداد قيد المعالجة</h2>
                        <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                            مرحباً {{userName}}! تم استلام طلب الاسترداد الخاص بك وهو الآن قيد المراجعة.
                        </p>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF3C7; border-radius: 12px; margin-bottom: 24px; border-right: 4px solid #F59E0B;">
                            <tr>
                                <td style="padding: 20px; text-align: right;">
                                    <p style="margin: 0 0 12px 0; font-size: 18px; color: #92400E; font-weight: 700;">طلب #{{orderNumber}}</p>
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                        <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>مبلغ الاسترداد:</strong> <span style="color: #009DE0; font-weight: 700;">{{refundAmount}}</span></td></tr>
                                        <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>السبب:</strong> {{refundReason}}</td></tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <p style="color: #64748B; font-size: 14px; line-height: 1.7; margin: 0 0 24px 0;">
                            سيتم مراجعة طلبك خلال 24-48 ساعة وسنُعلمك بالنتيجة.
                        </p>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center" style="padding: 0 0 32px 0;">
                                    <a href="{{trackUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">متابعة حالة الطلب ←</a>
                                </td>
                            </tr>
                        </table>

                        <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                        <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                            محتاج مساعدة؟ تواصل معانا عبر
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; font-weight: 500;">مركز المساعدة</a>
                        </p>
                    </td>
                </tr>

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
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; margin: 0 6px;">الدعم الفني</a>
                        </p>
                    </td>
                </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    updated_at = NOW()
WHERE slug = 'customer-refund-initiated';

-- customer-refund-completed
UPDATE email_templates
SET html_content = E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تم الاسترداد بنجاح</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                <tr>
                    <td align="center" style="background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%); padding: 36px 24px;">
                        <a href="https://www.engezna.com" style="text-decoration: none;">
                            <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                        </a>
                        <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">عايز تطلب؟ إنجزنا!</p>
                    </td>
                </tr>

                <tr>
                    <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                        <div style="display: inline-block; width: 72px; height: 72px; background-color: #DCFCE7; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">✅</div>

                        <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تم الاسترداد بنجاح!</h2>
                        <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                            مرحباً {{userName}}! تم استرداد المبلغ بنجاح وسيظهر في حسابك قريباً.
                        </p>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F0FDF4; border-radius: 12px; margin-bottom: 24px; border-right: 4px solid #22C55E;">
                            <tr>
                                <td style="padding: 20px; text-align: right;">
                                    <p style="margin: 0 0 12px 0; font-size: 18px; color: #166534; font-weight: 700;">طلب #{{orderNumber}}</p>
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                        <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>المبلغ المسترد:</strong> <span style="color: #166534; font-weight: 700;">{{refundAmount}}</span></td></tr>
                                        <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>طريقة الاسترداد:</strong> {{refundMethod}}</td></tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                        <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                            شكراً لاستخدامك إنجزنا! نتطلع لخدمتك مرة أخرى.
                        </p>
                    </td>
                </tr>

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
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; margin: 0 6px;">الدعم الفني</a>
                        </p>
                    </td>
                </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    updated_at = NOW()
WHERE slug = 'customer-refund-completed';

-- merchant-order-cancelled
UPDATE email_templates
SET html_content = E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تم إلغاء الطلب</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                <tr>
                    <td align="center" style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 36px 24px;">
                        <a href="https://www.engezna.com" style="text-decoration: none;">
                            <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                        </a>
                        <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">عايز تطلب؟ إنجزنا!</p>
                    </td>
                </tr>

                <tr>
                    <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                        <div style="display: inline-block; width: 72px; height: 72px; background-color: #FEE2E2; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">❌</div>

                        <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تم إلغاء الطلب</h2>
                        <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                            تم إلغاء طلب من متجرك {{storeName}}.
                        </p>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF2F2; border-radius: 12px; margin-bottom: 24px; border-right: 4px solid #EF4444;">
                            <tr>
                                <td style="padding: 20px; text-align: right;">
                                    <p style="margin: 0 0 12px 0; font-size: 18px; color: #991B1B; font-weight: 700;">طلب #{{orderNumber}}</p>
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                        <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>سبب الإلغاء:</strong> {{cancellationReason}}</td></tr>
                                        <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>تم الإلغاء بواسطة:</strong> {{cancelledBy}}</td></tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center" style="padding: 0 0 32px 0;">
                                    <a href="{{dashboardUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">عرض لوحة التحكم ←</a>
                                </td>
                            </tr>
                        </table>

                        <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                        <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                            محتاج مساعدة؟ تواصل معانا عبر
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; font-weight: 500;">مركز المساعدة</a>
                        </p>
                    </td>
                </tr>

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
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; margin: 0 6px;">الدعم الفني</a>
                        </p>
                    </td>
                </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    updated_at = NOW()
WHERE slug = 'merchant-order-cancelled';

-- merchant-low-rating-alert
UPDATE email_templates
SET html_content = E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تنبيه تقييم منخفض</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                <tr>
                    <td align="center" style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 36px 24px;">
                        <a href="https://www.engezna.com" style="text-decoration: none;">
                            <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                        </a>
                        <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">عايز تطلب؟ إنجزنا!</p>
                    </td>
                </tr>

                <tr>
                    <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                        <div style="display: inline-block; width: 72px; height: 72px; background-color: #FEF3C7; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">⚠️</div>

                        <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تنبيه: تقييم منخفض</h2>
                        <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                            حصل متجرك {{storeName}} على تقييم منخفض.
                        </p>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF3C7; border-radius: 12px; margin-bottom: 24px; border-right: 4px solid #F59E0B;">
                            <tr>
                                <td style="padding: 20px; text-align: center;">
                                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #92400E;">التقييم</p>
                                    <p style="margin: 0 0 16px 0; font-size: 36px; color: #D97706; font-weight: 700;">{{rating}} ⭐</p>
                                    <p style="margin: 0; font-size: 14px; color: #78716C; font-style: italic;">"{{reviewComment}}"</p>
                                </td>
                            </tr>
                        </table>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center" style="padding: 0 0 32px 0;">
                                    <a href="{{reviewsUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">عرض التقييمات ←</a>
                                </td>
                            </tr>
                        </table>

                        <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                        <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                            محتاج مساعدة؟ تواصل معانا عبر
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; font-weight: 500;">مركز المساعدة</a>
                        </p>
                    </td>
                </tr>

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
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; margin: 0 6px;">الدعم الفني</a>
                        </p>
                    </td>
                </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    updated_at = NOW()
WHERE slug = 'merchant-low-rating-alert';

-- merchant-new-review
UPDATE email_templates
SET html_content = E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تقييم جديد</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                <tr>
                    <td align="center" style="background: linear-gradient(135deg, #009DE0 0%, #0077B6 100%); padding: 36px 24px;">
                        <a href="https://www.engezna.com" style="text-decoration: none;">
                            <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                        </a>
                        <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">عايز تطلب؟ إنجزنا!</p>
                    </td>
                </tr>

                <tr>
                    <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                        <div style="display: inline-block; width: 72px; height: 72px; background-color: #FEF3C7; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">⭐</div>

                        <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تقييم جديد لمتجرك!</h2>
                        <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                            حصل متجرك {{storeName}} على تقييم جديد من {{customerName}}.
                        </p>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF3C7; border-radius: 12px; margin-bottom: 24px;">
                            <tr>
                                <td style="padding: 20px; text-align: center;">
                                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #92400E;">التقييم</p>
                                    <p style="margin: 0 0 16px 0; font-size: 36px; color: #D97706; font-weight: 700;">{{rating}} ⭐</p>
                                    <p style="margin: 0; font-size: 14px; color: #78716C; font-style: italic;">"{{reviewComment}}"</p>
                                </td>
                            </tr>
                        </table>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center" style="padding: 0 0 32px 0;">
                                    <a href="{{reviewsUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">عرض التقييمات ←</a>
                                </td>
                            </tr>
                        </table>

                        <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                        <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                            محتاج مساعدة؟ تواصل معانا عبر
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; font-weight: 500;">مركز المساعدة</a>
                        </p>
                    </td>
                </tr>

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
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; margin: 0 6px;">الدعم الفني</a>
                        </p>
                    </td>
                </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    updated_at = NOW()
WHERE slug = 'merchant-new-review';

-- merchant-store-reactivated
UPDATE email_templates
SET html_content = E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تم إعادة تفعيل متجرك</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                <tr>
                    <td align="center" style="background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%); padding: 36px 24px;">
                        <a href="https://www.engezna.com" style="text-decoration: none;">
                            <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                        </a>
                        <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">عايز تطلب؟ إنجزنا!</p>
                    </td>
                </tr>

                <tr>
                    <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                        <div style="display: inline-block; width: 72px; height: 72px; background-color: #DCFCE7; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">🎉</div>

                        <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تم إعادة تفعيل متجرك!</h2>
                        <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                            متجرك {{storeName}} أصبح نشطاً مرة أخرى ويمكنك استقبال الطلبات.
                        </p>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center" style="padding: 0 0 32px 0;">
                                    <a href="{{dashboardUrl}}" style="display: inline-block; background-color: #22C55E; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">عرض لوحة التحكم ←</a>
                                </td>
                            </tr>
                        </table>

                        <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                        <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                            محتاج مساعدة؟ تواصل معانا عبر
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; font-weight: 500;">مركز المساعدة</a>
                        </p>
                    </td>
                </tr>

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
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; margin: 0 6px;">الدعم الفني</a>
                        </p>
                    </td>
                </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    updated_at = NOW()
WHERE slug = 'merchant-store-reactivated';

-- Support Templates

-- ticket-created
UPDATE email_templates
SET html_content = E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تم استلام طلب الدعم</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                <tr>
                    <td align="center" style="background: linear-gradient(135deg, #009DE0 0%, #0077B6 100%); padding: 36px 24px;">
                        <a href="https://www.engezna.com" style="text-decoration: none;">
                            <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                        </a>
                        <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">عايز تطلب؟ إنجزنا!</p>
                    </td>
                </tr>

                <tr>
                    <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                        <div style="display: inline-block; width: 72px; height: 72px; background-color: #E0F4FF; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">🎫</div>

                        <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تم استلام طلب الدعم</h2>
                        <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                            مرحباً {{userName}}! تم استلام طلب الدعم الخاص بك.
                        </p>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px;">
                            <tr>
                                <td style="padding: 20px; text-align: right;">
                                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748B;">رقم التذكرة</p>
                                    <p style="margin: 0 0 16px 0; font-size: 20px; color: #009DE0; font-weight: 700;">#{{ticketNumber}}</p>
                                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748B;">الموضوع</p>
                                    <p style="margin: 0; font-size: 16px; color: #0F172A;">{{ticketSubject}}</p>
                                </td>
                            </tr>
                        </table>

                        <p style="color: #64748B; font-size: 14px; line-height: 1.7; margin: 0 0 24px 0;">
                            سيتم الرد على طلبك خلال 24 ساعة.
                        </p>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center" style="padding: 0 0 32px 0;">
                                    <a href="{{ticketUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">متابعة التذكرة ←</a>
                                </td>
                            </tr>
                        </table>

                        <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                        <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                            شكراً لتواصلك معنا!
                        </p>
                    </td>
                </tr>

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
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; margin: 0 6px;">الدعم الفني</a>
                        </p>
                    </td>
                </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    updated_at = NOW()
WHERE slug = 'ticket-created';

-- ticket-replied
UPDATE email_templates
SET html_content = E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>رد جديد على تذكرتك</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                <tr>
                    <td align="center" style="background: linear-gradient(135deg, #009DE0 0%, #0077B6 100%); padding: 36px 24px;">
                        <a href="https://www.engezna.com" style="text-decoration: none;">
                            <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                        </a>
                        <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">عايز تطلب؟ إنجزنا!</p>
                    </td>
                </tr>

                <tr>
                    <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                        <div style="display: inline-block; width: 72px; height: 72px; background-color: #E0F4FF; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">💬</div>

                        <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">رد جديد على تذكرتك</h2>
                        <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                            مرحباً {{userName}}! رد {{agentName}} على تذكرتك #{{ticketNumber}}.
                        </p>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px;">
                            <tr>
                                <td style="padding: 20px; text-align: right;">
                                    <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.7; font-style: italic;">"{{replyPreview}}"</p>
                                </td>
                            </tr>
                        </table>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center" style="padding: 0 0 32px 0;">
                                    <a href="{{ticketUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">عرض الرد الكامل ←</a>
                                </td>
                            </tr>
                        </table>

                        <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                        <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                            شكراً لتواصلك معنا!
                        </p>
                    </td>
                </tr>

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
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; margin: 0 6px;">الدعم الفني</a>
                        </p>
                    </td>
                </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    updated_at = NOW()
WHERE slug = 'ticket-replied';

-- ticket-resolved
UPDATE email_templates
SET html_content = E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تم حل تذكرتك</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                <tr>
                    <td align="center" style="background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%); padding: 36px 24px;">
                        <a href="https://www.engezna.com" style="text-decoration: none;">
                            <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                        </a>
                        <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">عايز تطلب؟ إنجزنا!</p>
                    </td>
                </tr>

                <tr>
                    <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                        <div style="display: inline-block; width: 72px; height: 72px; background-color: #DCFCE7; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">✅</div>

                        <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تم حل تذكرتك!</h2>
                        <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                            مرحباً {{userName}}! تم حل تذكرة الدعم #{{ticketNumber}}.
                        </p>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF3C7; border-radius: 12px; margin-bottom: 24px;">
                            <tr>
                                <td style="padding: 20px; text-align: center;">
                                    <p style="margin: 0 0 12px 0; font-size: 16px; color: #92400E; font-weight: 600;">⭐ شاركنا رأيك!</p>
                                    <p style="margin: 0; font-size: 14px; color: #A16207;">كيف كانت تجربتك مع فريق الدعم؟</p>
                                </td>
                            </tr>
                        </table>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center" style="padding: 0 0 16px 0;">
                                    <a href="{{ticketUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">عرض التذكرة ←</a>
                                </td>
                            </tr>
                            <tr>
                                <td align="center" style="padding: 0 0 32px 0;">
                                    <a href="{{feedbackUrl}}" style="display: inline-block; background-color: #F59E0B; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">قيّم الخدمة ←</a>
                                </td>
                            </tr>
                        </table>

                        <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                        <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                            شكراً لتواصلك معنا!
                        </p>
                    </td>
                </tr>

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
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; margin: 0 6px;">الدعم الفني</a>
                        </p>
                    </td>
                </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    updated_at = NOW()
WHERE slug = 'ticket-resolved';

-- dispute-opened
UPDATE email_templates
SET html_content = E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تم فتح نزاع</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                <tr>
                    <td align="center" style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 36px 24px;">
                        <a href="https://www.engezna.com" style="text-decoration: none;">
                            <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                        </a>
                        <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">عايز تطلب؟ إنجزنا!</p>
                    </td>
                </tr>

                <tr>
                    <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                        <div style="display: inline-block; width: 72px; height: 72px; background-color: #FEF3C7; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">⚖️</div>

                        <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تم فتح نزاع</h2>
                        <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                            مرحباً {{userName}}! تم فتح نزاع على طلبك #{{orderNumber}}.
                        </p>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF3C7; border-radius: 12px; margin-bottom: 24px; border-right: 4px solid #F59E0B;">
                            <tr>
                                <td style="padding: 20px; text-align: right;">
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                        <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>نوع النزاع:</strong> {{disputeType}}</td></tr>
                                        <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>الوصف:</strong> {{disputeDescription}}</td></tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <p style="color: #64748B; font-size: 14px; line-height: 1.7; margin: 0 0 24px 0;">
                            سيتم مراجعة النزاع خلال 48-72 ساعة.
                        </p>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center" style="padding: 0 0 32px 0;">
                                    <a href="{{disputeUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">متابعة النزاع ←</a>
                                </td>
                            </tr>
                        </table>

                        <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                        <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                            محتاج مساعدة؟ تواصل معانا عبر
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; font-weight: 500;">مركز المساعدة</a>
                        </p>
                    </td>
                </tr>

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
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; margin: 0 6px;">الدعم الفني</a>
                        </p>
                    </td>
                </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    updated_at = NOW()
WHERE slug = 'dispute-opened';

-- dispute-resolved
UPDATE email_templates
SET html_content = E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تم حل النزاع</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                <tr>
                    <td align="center" style="background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%); padding: 36px 24px;">
                        <a href="https://www.engezna.com" style="text-decoration: none;">
                            <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                        </a>
                        <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">عايز تطلب؟ إنجزنا!</p>
                    </td>
                </tr>

                <tr>
                    <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                        <div style="display: inline-block; width: 72px; height: 72px; background-color: #DCFCE7; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">✅</div>

                        <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تم حل النزاع!</h2>
                        <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                            مرحباً {{userName}}! تم حل النزاع المتعلق بطلبك #{{orderNumber}}.
                        </p>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F0FDF4; border-radius: 12px; margin-bottom: 24px; border-right: 4px solid #22C55E;">
                            <tr>
                                <td style="padding: 20px; text-align: right;">
                                    <p style="margin: 0 0 12px 0; font-size: 16px; color: #166534; font-weight: 700;">{{resolution}}</p>
                                    <p style="margin: 0; font-size: 14px; color: #475569;">{{resolutionDetails}}</p>
                                </td>
                            </tr>
                        </table>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center" style="padding: 0 0 32px 0;">
                                    <a href="{{disputeUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">عرض التفاصيل ←</a>
                                </td>
                            </tr>
                        </table>

                        <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                        <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                            شكراً لصبرك وتفهمك!
                        </p>
                    </td>
                </tr>

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
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; margin: 0 6px;">الدعم الفني</a>
                        </p>
                    </td>
                </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    updated_at = NOW()
WHERE slug = 'dispute-resolved';

-- Admin Templates

-- admin-daily-report
UPDATE email_templates
SET html_content = E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>التقرير اليومي</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                <tr>
                    <td align="center" style="background: linear-gradient(135deg, #009DE0 0%, #0077B6 100%); padding: 36px 24px;">
                        <a href="https://www.engezna.com" style="text-decoration: none;">
                            <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                        </a>
                        <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">عايز تطلب؟ إنجزنا!</p>
                    </td>
                </tr>

                <tr>
                    <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                        <div style="display: inline-block; width: 72px; height: 72px; background-color: #E0F4FF; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">📊</div>

                        <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">التقرير اليومي - {{reportDate}}</h2>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="8" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px;">
                            <tr>
                                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #E2E8F0;">
                                    <span style="color: #64748B;">إجمالي الطلبات</span>
                                </td>
                                <td style="text-align: left; padding: 12px; border-bottom: 1px solid #E2E8F0;">
                                    <strong style="color: #009DE0; font-size: 18px;">{{totalOrders}}</strong>
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #E2E8F0;">
                                    <span style="color: #64748B;">إجمالي الإيرادات</span>
                                </td>
                                <td style="text-align: left; padding: 12px; border-bottom: 1px solid #E2E8F0;">
                                    <strong style="color: #22C55E; font-size: 18px;">{{totalRevenue}}</strong>
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #E2E8F0;">
                                    <span style="color: #64748B;">عملاء جدد</span>
                                </td>
                                <td style="text-align: left; padding: 12px; border-bottom: 1px solid #E2E8F0;">
                                    <strong style="color: #0F172A;">{{newCustomers}}</strong>
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #E2E8F0;">
                                    <span style="color: #64748B;">متاجر جديدة</span>
                                </td>
                                <td style="text-align: left; padding: 12px; border-bottom: 1px solid #E2E8F0;">
                                    <strong style="color: #0F172A;">{{newStores}}</strong>
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #E2E8F0;">
                                    <span style="color: #64748B;">طلبات ملغاة</span>
                                </td>
                                <td style="text-align: left; padding: 12px; border-bottom: 1px solid #E2E8F0;">
                                    <strong style="color: #EF4444;">{{cancelledOrders}}</strong>
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align: right; padding: 12px; border-bottom: 1px solid #E2E8F0;">
                                    <span style="color: #64748B;">طلبات استرداد</span>
                                </td>
                                <td style="text-align: left; padding: 12px; border-bottom: 1px solid #E2E8F0;">
                                    <strong style="color: #F59E0B;">{{refundRequests}}</strong>
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align: right; padding: 12px;">
                                    <span style="color: #64748B;">متوسط قيمة الطلب</span>
                                </td>
                                <td style="text-align: left; padding: 12px;">
                                    <strong style="color: #0F172A;">{{avgOrderValue}}</strong>
                                </td>
                            </tr>
                        </table>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center" style="padding: 0 0 32px 0;">
                                    <a href="{{dashboardUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">عرض لوحة التحكم ←</a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

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
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; margin: 0 6px;">الدعم الفني</a>
                        </p>
                    </td>
                </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    updated_at = NOW()
WHERE slug = 'admin-daily-report';

-- admin-escalation-alert
UPDATE email_templates
SET html_content = E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تنبيه تصعيد عاجل</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                <tr>
                    <td align="center" style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 36px 24px;">
                        <a href="https://www.engezna.com" style="text-decoration: none;">
                            <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                        </a>
                        <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">عايز تطلب؟ إنجزنا!</p>
                    </td>
                </tr>

                <tr>
                    <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                        <div style="display: inline-block; width: 72px; height: 72px; background-color: #FEE2E2; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">🚨</div>

                        <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تنبيه تصعيد عاجل</h2>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF2F2; border-radius: 12px; margin-bottom: 24px; border-right: 4px solid #EF4444;">
                            <tr>
                                <td style="padding: 20px; text-align: right;">
                                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748B;">نوع التنبيه</p>
                                    <p style="margin: 0 0 16px 0; font-size: 18px; color: #991B1B; font-weight: 700;">{{alertType}}</p>
                                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748B;">الأولوية</p>
                                    <p style="margin: 0 0 16px 0; font-size: 16px; color: #DC2626; font-weight: 600;">{{priority}}</p>
                                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748B;">التفاصيل</p>
                                    <p style="margin: 0; font-size: 14px; color: #0F172A;">{{alertDetails}}</p>
                                </td>
                            </tr>
                        </table>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center" style="padding: 0 0 32px 0;">
                                    <a href="{{actionUrl}}" style="display: inline-block; background-color: #EF4444; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">اتخاذ إجراء ←</a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

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
                            <a href="https://www.engezna.com/ar/help" style="color: #009DE0; text-decoration: none; margin: 0 6px;">الدعم الفني</a>
                        </p>
                    </td>
                </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
    updated_at = NOW()
WHERE slug = 'admin-escalation-alert';

-- Verify all templates are now updated
SELECT slug, name,
       CASE WHEN html_content LIKE '%عايز تطلب؟ إنجزنا!%' THEN 'YES' ELSE 'NO' END as has_tagline,
       CASE WHEN html_content LIKE '%لكل محافظات مصر%' THEN 'YES' ELSE 'NO' END as has_egypt_line,
       CASE WHEN html_content LIKE '%صنع بـ 💚 في مصر%' THEN 'YES' ELSE 'NO' END as has_made_in_egypt
FROM email_templates
WHERE is_active = true
ORDER BY
    CASE WHEN html_content LIKE '%عايز تطلب؟ إنجزنا!%' THEN 1 ELSE 0 END,
    category, slug;
