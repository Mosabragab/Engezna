-- ============================================================================
-- Seed Email Templates
-- Initial templates that can be edited by marketing team
-- Variables are marked with {{variableName}} syntax
-- ============================================================================

-- Merchant Welcome Template
INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'merchant-welcome',
  'ترحيب بالتاجر الجديد',
  'يُرسل عند تسجيل تاجر جديد في المنصة',
  'أهلاً بك في إنجزنا - حسابك جاهز',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>أهلاً بك في إنجزنا - بوابة الشركاء</title>
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
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #E0F4FF; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">🎉</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">أهلاً بك {{merchantName}}!</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 32px 0;">تم إنشاء حسابك كشريك في منصة إنجزنا بنجاح! 🚀</p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: right;">
                                        <p style="margin: 0; font-size: 13px; color: #64748B; line-height: 1.7;">
                                            <strong style="color: #0F172A;">🏪 نوع النشاط:</strong> {{storeName}}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <div style="text-align: right; margin-bottom: 24px;">
                                <p style="color: #0F172A; font-size: 15px; font-weight: 600; margin: 0 0 12px 0;">الخطوات التالية:</p>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 14px; color: #475569;">
                                            <span style="display: inline-block; width: 24px; height: 24px; background-color: #009DE0; color: white; border-radius: 50%; text-align: center; line-height: 24px; margin-left: 8px; font-size: 12px;">1</span>
                                            أكمل بيانات متجرك (الاسم، العنوان، الصور)
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 14px; color: #475569;">
                                            <span style="display: inline-block; width: 24px; height: 24px; background-color: #009DE0; color: white; border-radius: 50%; text-align: center; line-height: 24px; margin-left: 8px; font-size: 12px;">2</span>
                                            أضف منتجاتك أو قائمة الطعام
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 14px; color: #475569;">
                                            <span style="display: inline-block; width: 24px; height: 24px; background-color: #009DE0; color: white; border-radius: 50%; text-align: center; line-height: 24px; margin-left: 8px; font-size: 12px;">3</span>
                                            انتظر مراجعة الإدارة وتفعيل المتجر
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="{{dashboardUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">الدخول للوحة التحكم ←</a>
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
                            <p style="color: #009DE0; font-size: 13px; font-weight: 500; margin: 14px 0;">منصة لتلبية احتياجات البيت اليومية لجمهورية مصر العربية</p>
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
</html>',
  '["merchantName", "storeName", "dashboardUrl"]'::jsonb,
  'merchant'
) ON CONFLICT (slug) DO NOTHING;

-- Store Approved Template
INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'store-approved',
  'تم قبول المتجر',
  'يُرسل عند الموافقة على متجر التاجر',
  'تهانينا - متجرك "{{storeName}}" أصبح جاهزاً',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تم تفعيل متجرك! - إنجزنا</title>
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
                            <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">بوابة الشركاء</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #E0F4FF; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">✅</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">متجرك أصبح جاهزاً! 🎊</h2>

                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 32px 0;">
                                مبروك يا {{merchantName}}!<br>
                                تمت الموافقة على متجرك <strong style="color: #009DE0;">"{{storeName}}"</strong> وأصبح متاحاً للعملاء الآن!
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: right;">
                                        <p style="margin: 0; font-size: 13px; color: #64748B; line-height: 1.7;">
                                            <strong style="color: #0F172A;">🟢 المتجر نشط ومتاح للطلبات</strong>
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <div style="text-align: right; margin-bottom: 24px;">
                                <p style="color: #0F172A; font-size: 15px; font-weight: 600; margin: 0 0 12px 0;">نصائح للبداية:</p>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr><td style="padding: 8px 0; font-size: 14px; color: #475569;">✨ تأكد من تحديث أوقات العمل</td></tr>
                                    <tr><td style="padding: 8px 0; font-size: 14px; color: #475569;">📸 أضف صور جذابة لمنتجاتك</td></tr>
                                    <tr><td style="padding: 8px 0; font-size: 14px; color: #475569;">💰 راجع أسعارك ورسوم التوصيل</td></tr>
                                    <tr><td style="padding: 8px 0; font-size: 14px; color: #475569;">🔔 فعّل الإشعارات لتلقي الطلبات فوراً</td></tr>
                                </table>
                            </div>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 16px 0;">
                                        <a href="{{dashboardUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">لوحة التحكم ←</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="{{storeUrl}}" style="display: inline-block; background-color: #ffffff; color: #009DE0; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; border: 2px solid #009DE0;">شاهد متجرك على الموقع</a>
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

                    <tr>
                        <td align="center" style="background-color: #0F172A; padding: 28px 24px;">
                            <a href="https://www.engezna.com" style="text-decoration: none;">
                                <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا" width="100" style="height: auto; display: block; margin: 0 auto;">
                            </a>
                            <p style="color: #009DE0; font-size: 13px; font-weight: 500; margin: 14px 0;">منصة لتلبية احتياجات البيت اليومية لجمهورية مصر العربية</p>
                            <p style="font-size: 12px; color: #64748B; margin: 10px 0;">لكل محافظات مصر 🇪🇬</p>
                            <p style="font-size: 11px; color: #475569; margin: 14px 0 0 0;">صنع بـ 💚 في مصر</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  '["merchantName", "storeName", "storeUrl", "dashboardUrl"]'::jsonb,
  'merchant'
) ON CONFLICT (slug) DO NOTHING;

-- Store Rejection Template
INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'store-rejection',
  'رفض طلب المتجر',
  'يُرسل عند رفض طلب تسجيل المتجر',
  'تحديث حالة طلب متجرك - إنجزنا',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تحديث حالة طلب المتجر - إنجزنا</title>
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
                            <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">بوابة الشركاء</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #FEF2F2; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">📋</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تحديث حالة طلبك</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                                مرحباً {{merchantName}}، شكراً لاهتمامك بالانضمام لمنصة إنجزنا.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF2F2; border-radius: 12px; margin-bottom: 24px; border-right: 4px solid #EF4444;">
                                <tr>
                                    <td style="padding: 20px; text-align: right;">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #991B1B; font-weight: 600;">
                                            للأسف، لم نتمكن من قبول طلب متجر "{{storeName}}" في الوقت الحالي
                                        </p>
                                        <p style="margin: 0; font-size: 14px; color: #7F1D1D; line-height: 1.7;">
                                            <strong>السبب:</strong> {{rejectionReason}}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <div style="text-align: right; margin-bottom: 24px;">
                                <p style="color: #0F172A; font-size: 15px; font-weight: 600; margin: 0 0 12px 0;">ماذا يمكنك فعله؟</p>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F0F9FF; border-radius: 12px;">
                                    <tr>
                                        <td style="padding: 16px 20px;">
                                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569; line-height: 1.7;">✓ راجع المتطلبات وأكمل البيانات الناقصة</p>
                                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569; line-height: 1.7;">✓ تواصل مع فريق الدعم للاستفسار</p>
                                            <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.7;">✓ أعد تقديم الطلب بعد استيفاء المتطلبات</p>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="{{supportUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">تواصل مع الدعم ←</a>
                                    </td>
                                </tr>
                            </table>

                            <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                            <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                                نحن هنا لمساعدتك! تواصل معنا عبر
                                <a href="https://www.engezna.com/ar/provider/help" style="color: #009DE0; text-decoration: none; font-weight: 500;">مركز مساعدة الشركاء</a>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="background-color: #0F172A; padding: 28px 24px;">
                            <a href="https://www.engezna.com" style="text-decoration: none;">
                                <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا" width="100" style="height: auto; display: block; margin: 0 auto;">
                            </a>
                            <p style="color: #009DE0; font-size: 13px; font-weight: 500; margin: 14px 0;">منصة لتلبية احتياجات البيت اليومية لجمهورية مصر العربية</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  '["merchantName", "storeName", "rejectionReason", "supportUrl"]'::jsonb,
  'merchant'
) ON CONFLICT (slug) DO NOTHING;

-- Order Received Template
INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'order-received',
  'طلب جديد',
  'يُرسل للتاجر عند استلام طلب جديد',
  'طلب جديد #{{orderNumber}} - إنجزنا',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>طلب جديد - إنجزنا</title>
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
                            <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">بوابة الشركاء</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #DCFCE7; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">🔔</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">طلب جديد! 🎉</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                                مرحباً {{merchantName}}، لديك طلب جديد في متجر "{{storeName}}"
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F0FDF4; border-radius: 12px; margin-bottom: 24px; border-right: 4px solid #22C55E;">
                                <tr>
                                    <td style="padding: 20px; text-align: right;">
                                        <p style="margin: 0 0 12px 0; font-size: 18px; color: #166534; font-weight: 700;">طلب #{{orderNumber}}</p>
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>العميل:</strong> {{customerName}}</td></tr>
                                            <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>عدد الأصناف:</strong> {{itemsCount}} صنف</td></tr>
                                            <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>الإجمالي:</strong> <span style="color: #166534; font-weight: 700;">{{formattedAmount}}</span></td></tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: right;">
                                        <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748B; font-weight: 600;">📍 عنوان التوصيل</p>
                                        <p style="margin: 0; font-size: 14px; color: #0F172A; line-height: 1.6;">{{deliveryAddress}}</p>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="{{orderUrl}}" style="display: inline-block; background-color: #22C55E; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">عرض تفاصيل الطلب ←</a>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF3C7; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: center;">
                                        <p style="margin: 0; font-size: 14px; color: #92400E; font-weight: 600;">⏰ يرجى قبول الطلب وبدء التجهيز في أسرع وقت</p>
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

                    <tr>
                        <td align="center" style="background-color: #0F172A; padding: 28px 24px;">
                            <a href="https://www.engezna.com" style="text-decoration: none;">
                                <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا" width="100" style="height: auto; display: block; margin: 0 auto;">
                            </a>
                            <p style="color: #009DE0; font-size: 13px; font-weight: 500; margin: 14px 0;">منصة لتلبية احتياجات البيت اليومية لجمهورية مصر العربية</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  '["merchantName", "storeName", "orderNumber", "customerName", "itemsCount", "formattedAmount", "deliveryAddress", "orderUrl"]'::jsonb,
  'merchant'
) ON CONFLICT (slug) DO NOTHING;

-- Settlement Template
INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'settlement',
  'إشعار التسوية المالية',
  'يُرسل عند تحويل مستحقات التاجر',
  'تسوية جديدة: {{formattedAmount}}',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تسوية مالية - إنجزنا</title>
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
                            <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">بوابة الشركاء</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #E0F4FF; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">💰</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تم تحويل مستحقاتك!</h2>

                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 32px 0;">
                                مرحباً {{merchantName}}!<br>
                                تم تحويل مستحقاتك من متجر <strong style="color: #009DE0;">"{{storeName}}"</strong> بنجاح.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 2px solid #E2E8F0; border-radius: 16px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 28px; text-align: center;">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748B; font-weight: 500;">المبلغ المحوّل</p>
                                        <p style="margin: 0; font-size: 36px; color: #009DE0; font-weight: 700;" dir="ltr">{{formattedAmount}}</p>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: right;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 13px; color: #64748B;">رقم التسوية:</td>
                                                <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600; text-align: left;" dir="ltr">#{{settlementId}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 13px; color: #64748B;">تاريخ التحويل:</td>
                                                <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600; text-align: left;">{{formattedDate}}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 13px; color: #64748B;">عدد الطلبات:</td>
                                                <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600; text-align: left;">{{ordersCount}} طلب</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 13px; color: #64748B;">الفترة:</td>
                                                <td style="padding: 8px 0; font-size: 13px; color: #0F172A; font-weight: 600; text-align: left;">{{period}}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: right;">
                                        <p style="margin: 0; font-size: 13px; color: #64748B; line-height: 1.7;">
                                            <strong style="color: #0F172A;">⏰ ملاحظة:</strong> سيظهر المبلغ في حسابك البنكي خلال ١-٣ أيام عمل حسب البنك الخاص بك.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="{{dashboardUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">عرض التفاصيل ←</a>
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

                    <tr>
                        <td align="center" style="background-color: #0F172A; padding: 28px 24px;">
                            <a href="https://www.engezna.com" style="text-decoration: none;">
                                <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا" width="100" style="height: auto; display: block; margin: 0 auto;">
                            </a>
                            <p style="color: #009DE0; font-size: 13px; font-weight: 500; margin: 14px 0;">منصة لتلبية احتياجات البيت اليومية لجمهورية مصر العربية</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  '["merchantName", "storeName", "formattedAmount", "settlementId", "formattedDate", "ordersCount", "period", "dashboardUrl"]'::jsonb,
  'merchant'
) ON CONFLICT (slug) DO NOTHING;

-- Staff Invitation Template
INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'staff-invitation',
  'دعوة موظف للمتجر',
  'يُرسل عند دعوة موظف جديد للانضمام لفريق المتجر',
  'دعوة للانضمام لفريق {{storeName}} - إنجزنا',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>دعوة للانضمام - إنجزنا</title>
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
                            <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">بوابة الشركاء</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #E0F4FF; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">👋</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">أنت مدعو للانضمام!</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                                مرحباً {{staffName}}، قام {{merchantName}} بدعوتك للانضمام لفريق العمل
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F0F9FF; border-radius: 12px; margin-bottom: 24px; border-right: 4px solid #009DE0;">
                                <tr>
                                    <td style="padding: 20px; text-align: right;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #475569;">
                                                    <strong style="color: #0F172A;">🏪 المتجر:</strong> {{storeName}}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #475569;">
                                                    <strong style="color: #0F172A;">👤 الدور:</strong> <span style="display: inline-block; background-color: #009DE0; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px;">{{roleName}}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #475569;">
                                                    <strong style="color: #0F172A;">📧 الإيميل:</strong> {{email}}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <div style="text-align: right; margin-bottom: 24px;">
                                <p style="color: #0F172A; font-size: 15px; font-weight: 600; margin: 0 0 12px 0;">بعد قبول الدعوة ستتمكن من:</p>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px;">
                                    <tr>
                                        <td style="padding: 16px 20px;">
                                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569; line-height: 1.7;">✓ إدارة الطلبات الواردة</p>
                                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569; line-height: 1.7;">✓ تحديث حالة الطلبات</p>
                                            <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.7;">✓ الوصول للوحة تحكم المتجر</p>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="{{inviteUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">قبول الدعوة ←</a>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF3C7; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: center;">
                                        <p style="margin: 0; font-size: 13px; color: #92400E;">⚠️ هذه الدعوة صالحة لمدة 7 أيام فقط</p>
                                    </td>
                                </tr>
                            </table>

                            <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                            <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                                لم تطلب هذه الدعوة؟ يمكنك تجاهل هذا الإيميل بأمان
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="background-color: #0F172A; padding: 28px 24px;">
                            <a href="https://www.engezna.com" style="text-decoration: none;">
                                <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا" width="100" style="height: auto; display: block; margin: 0 auto;">
                            </a>
                            <p style="color: #009DE0; font-size: 13px; font-weight: 500; margin: 14px 0;">منصة لتلبية احتياجات البيت اليومية لجمهورية مصر العربية</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  '["staffName", "merchantName", "storeName", "roleName", "email", "inviteUrl"]'::jsonb,
  'merchant'
) ON CONFLICT (slug) DO NOTHING;

-- Store Suspended Template
INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'store-suspended',
  'إيقاف المتجر',
  'يُرسل عند إيقاف متجر التاجر مؤقتاً',
  'إشعار مهم - إيقاف المتجر مؤقتاً - إنجزنا',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إشعار مهم - إيقاف المتجر مؤقتاً - إنجزنا</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 36px 24px;">
                            <a href="https://www.engezna.com" style="text-decoration: none;">
                                <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                            </a>
                            <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">إشعار مهم</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #FEF2F2; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">⚠️</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تم إيقاف المتجر مؤقتاً</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                                مرحباً {{merchantName}}، نود إعلامك بأنه تم إيقاف متجرك مؤقتاً
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF2F2; border-radius: 12px; margin-bottom: 24px; border-right: 4px solid #DC2626;">
                                <tr>
                                    <td style="padding: 20px; text-align: right;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #7F1D1D;">
                                                    <strong style="color: #991B1B;">🏪 المتجر:</strong> {{storeName}}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #7F1D1D;">
                                                    <strong style="color: #991B1B;">📅 تاريخ الإيقاف:</strong> {{formattedDate}}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 0 0 0; font-size: 14px; color: #7F1D1D; line-height: 1.7;">
                                                    <strong style="color: #991B1B;">📝 السبب:</strong><br>
                                                    {{suspensionReason}}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <div style="text-align: right; margin-bottom: 24px;">
                                <p style="color: #0F172A; font-size: 15px; font-weight: 600; margin: 0 0 12px 0;">ماذا يعني هذا؟</p>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px;">
                                    <tr>
                                        <td style="padding: 16px 20px;">
                                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569; line-height: 1.7;">⛔ لن يظهر متجرك للعملاء حالياً</p>
                                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569; line-height: 1.7;">⛔ لن تستقبل طلبات جديدة</p>
                                            <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.7;">✓ يمكنك الوصول للوحة التحكم لمعالجة المشكلة</p>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <div style="text-align: right; margin-bottom: 24px;">
                                <p style="color: #0F172A; font-size: 15px; font-weight: 600; margin: 0 0 12px 0;">لإعادة تفعيل المتجر:</p>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F0FDF4; border-radius: 12px;">
                                    <tr>
                                        <td style="padding: 16px 20px;">
                                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #166534; line-height: 1.7;">1. راجع سبب الإيقاف أعلاه</p>
                                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #166534; line-height: 1.7;">2. قم بمعالجة المشكلة المذكورة</p>
                                            <p style="margin: 0; font-size: 14px; color: #166534; line-height: 1.7;">3. تواصل مع فريق الدعم لطلب إعادة التفعيل</p>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="{{supportUrl}}" style="display: inline-block; background-color: #DC2626; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">تواصل مع الدعم ←</a>
                                    </td>
                                </tr>
                            </table>

                            <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                            <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                                نحن هنا لمساعدتك! تواصل معنا عبر
                                <a href="https://www.engezna.com/ar/provider/help" style="color: #009DE0; text-decoration: none; font-weight: 500;">مركز مساعدة الشركاء</a>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="background-color: #0F172A; padding: 28px 24px;">
                            <a href="https://www.engezna.com" style="text-decoration: none;">
                                <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا" width="100" style="height: auto; display: block; margin: 0 auto;">
                            </a>
                            <p style="color: #009DE0; font-size: 13px; font-weight: 500; margin: 14px 0;">منصة لتلبية احتياجات البيت اليومية لجمهورية مصر العربية</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  '["merchantName", "storeName", "formattedDate", "suspensionReason", "supportUrl"]'::jsonb,
  'merchant'
) ON CONFLICT (slug) DO NOTHING;
