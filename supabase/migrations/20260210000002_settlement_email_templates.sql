-- ============================================================================
-- Migration: Add Settlement Email Templates
-- إضافة قوالب بريد إلكتروني للتسويات
-- ============================================================================
-- Date: 2026-02-10
-- Purpose: Add missing settlement email templates:
--   1. settlement-created: When a new settlement is generated
--   2. settlement-overdue: When a settlement is past its due date
-- ============================================================================

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ Template 1: Settlement Created (تم إنشاء تسوية جديدة)                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'settlement-created',
  'إنشاء تسوية جديدة',
  'يُرسل عند إنشاء تسوية مالية جديدة للتاجر',
  'تسوية جديدة #{{settlementId}} - {{netBalance}}',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تسوية جديدة - إنجزنا</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                    <!-- Header -->
                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, #009DE0 0%, #0077B6 100%); padding: 36px 24px;">
                            <a href="https://www.engezna.com" style="text-decoration: none;">
                                <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                            </a>
                            <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">بوابة الشركاء</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #E0F4FF; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">📋</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تم إنشاء تسوية جديدة</h2>

                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 32px 0;">
                                مرحباً {{merchantName}}!<br>
                                تم إنشاء تسوية مالية جديدة لمتجر <strong style="color: #009DE0;">"{{storeName}}"</strong>.
                            </p>

                            <!-- Settlement Summary -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 2px solid #E2E8F0; border-radius: 16px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 28px; text-align: center;">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748B; font-weight: 500;">صافي الرصيد</p>
                                        <p style="margin: 0 0 8px 0; font-size: 36px; color: #009DE0; font-weight: 700;" dir="ltr">{{netBalance}}</p>
                                        <p style="margin: 0; font-size: 13px; color: #64748B; font-weight: 600;">{{direction}}</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Details -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: right;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 13px; color: #64748B;">رقم التسوية:</td>
                                                <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600; text-align: left;" dir="ltr">#{{settlementId}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 13px; color: #64748B;">الفترة:</td>
                                                <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600; text-align: left;">{{period}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 13px; color: #64748B;">عدد الطلبات:</td>
                                                <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600; text-align: left;">{{ordersCount}} طلب</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 13px; color: #64748B;">إجمالي الإيرادات:</td>
                                                <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600; text-align: left;" dir="ltr">{{grossRevenue}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 13px; color: #64748B;">عمولة المنصة:</td>
                                                <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600; text-align: left;" dir="ltr">{{commission}}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="{{dashboardUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">عرض تفاصيل التسوية ←</a>
                                    </td>
                                </tr>
                            </table>

                            <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>
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
                                <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا" width="100" style="height: auto; display: block; margin: 0 auto;">
                            </a>
                            <p style="color: #009DE0; font-size: 13px; font-weight: 500; margin: 14px 0;">عايز تطلب؟ إنجزنا!</p>
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
</html>',
  '["merchantName", "storeName", "settlementId", "period", "ordersCount", "grossRevenue", "commission", "netBalance", "direction", "periodEnd", "dashboardUrl"]'::jsonb,
  'merchant'
) ON CONFLICT (slug) DO NOTHING;

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ Template 2: Settlement Overdue (تسوية متأخرة)                            ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'settlement-overdue',
  'تنبيه تسوية متأخرة',
  'يُرسل عند تأخر التاجر في سداد التسوية المالية',
  '⚠️ تسوية متأخرة #{{settlementId}} - {{amountDue}}',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تسوية متأخرة - إنجزنا</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                    <!-- Header - Red -->
                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 36px 24px;">
                            <a href="https://www.engezna.com" style="text-decoration: none;">
                                <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                            </a>
                            <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">تنبيه مهم</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #FEE2E2; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">⚠️</div>

                            <h2 style="color: #DC2626; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تسوية متأخرة عن موعدها</h2>

                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 32px 0;">
                                مرحباً {{merchantName}}!<br>
                                لديك تسوية مالية متأخرة بـ <strong style="color: #DC2626;">{{overdueDays}} يوم</strong> لمتجر <strong style="color: #009DE0;">"{{storeName}}"</strong>.
                            </p>

                            <!-- Amount Card -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF2F2; border: 2px solid #FECACA; border-radius: 16px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 28px; text-align: center;">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #991B1B; font-weight: 500;">المبلغ المستحق</p>
                                        <p style="margin: 0; font-size: 36px; color: #DC2626; font-weight: 700;" dir="ltr">{{amountDue}}</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Details -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: right;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 13px; color: #64748B;">رقم التسوية:</td>
                                                <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600; text-align: left;" dir="ltr">#{{settlementId}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 13px; color: #64748B;">أيام التأخير:</td>
                                                <td style="padding: 8px 0; font-size: 13px; color: #DC2626; font-weight: 600; text-align: left;">{{overdueDays}} يوم</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 13px; color: #64748B;">الفترة:</td>
                                                <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600; text-align: left;">{{period}}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Warning -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF2F2; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: right;">
                                        <p style="margin: 0; font-size: 13px; color: #991B1B; line-height: 1.7;">
                                            <strong>⏰ تنبيه:</strong> يرجى تسوية المبلغ المستحق في أقرب وقت لتجنب أي تأثير على حسابك.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="{{dashboardUrl}}" style="display: inline-block; background-color: #DC2626; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">عرض التسوية ←</a>
                                    </td>
                                </tr>
                            </table>

                            <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>
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
                                <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا" width="100" style="height: auto; display: block; margin: 0 auto;">
                            </a>
                            <p style="color: #009DE0; font-size: 13px; font-weight: 500; margin: 14px 0;">عايز تطلب؟ إنجزنا!</p>
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
</html>',
  '["merchantName", "storeName", "settlementId", "amountDue", "overdueDays", "period", "dashboardUrl"]'::jsonb,
  'merchant'
) ON CONFLICT (slug) DO NOTHING;

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ END OF MIGRATION                                                          ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
