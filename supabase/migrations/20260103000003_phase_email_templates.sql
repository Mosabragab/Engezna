-- ============================================================================
-- Phase 1, 2, 3 Email Templates
-- Additional templates for customers, admin, and marketing
-- ============================================================================

-- ============================================================================
-- PHASE 1: Critical Customer Templates
-- ============================================================================

-- Customer Order Confirmation
INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'customer-order-confirmation',
  'تأكيد طلب العميل',
  'يُرسل للعميل عند تأكيد الطلب بنجاح',
  'تم تأكيد طلبك #{{orderNumber}} - إنجزنا',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تم تأكيد طلبك - إنجزنا</title>
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
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #DCFCE7; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">✅</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تم تأكيد طلبك!</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                                شكراً {{customerName}}! تم استلام طلبك بنجاح وجاري تجهيزه.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F0FDF4; border-radius: 12px; margin-bottom: 24px; border-right: 4px solid #22C55E;">
                                <tr>
                                    <td style="padding: 20px; text-align: right;">
                                        <p style="margin: 0 0 12px 0; font-size: 18px; color: #166534; font-weight: 700;">طلب #{{orderNumber}}</p>
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>المتجر:</strong> {{storeName}}</td></tr>
                                            <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>عدد الأصناف:</strong> {{itemsCount}} صنف</td></tr>
                                            <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>الإجمالي:</strong> <span style="color: #166534; font-weight: 700;">{{formattedAmount}}</span></td></tr>
                                            <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>طريقة الدفع:</strong> {{paymentMethod}}</td></tr>
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

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #E0F4FF; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: center;">
                                        <p style="margin: 0; font-size: 14px; color: #0369A1;">⏱️ الوقت المتوقع للتوصيل: <strong>{{estimatedDelivery}}</strong></p>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="{{orderUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">تتبع طلبك ←</a>
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
                            <p style="color: #009DE0; font-size: 13px; font-weight: 500; margin: 14px 0;">منصة لتلبية احتياجات البيت اليومية لجمهورية مصر العربية</p>
                            <p style="font-size: 11px; color: #64748B; margin: 14px 0 0 0;">
                                <a href="https://www.engezna.com/ar/privacy" style="color: #009DE0; text-decoration: none; margin: 0 6px;">سياسة الخصوصية</a> •
                                <a href="https://www.engezna.com/ar/terms" style="color: #009DE0; text-decoration: none; margin: 0 6px;">الشروط والأحكام</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  '["customerName", "orderNumber", "storeName", "itemsCount", "formattedAmount", "paymentMethod", "deliveryAddress", "estimatedDelivery", "orderUrl"]'::jsonb,
  'customer'
) ON CONFLICT (slug) DO NOTHING;

-- Customer Order Delivered
INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'customer-order-delivered',
  'تم توصيل الطلب',
  'يُرسل للعميل عند توصيل الطلب بنجاح',
  'تم توصيل طلبك #{{orderNumber}} بنجاح! - إنجزنا',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تم توصيل طلبك - إنجزنا</title>
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
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #DCFCE7; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">🎉</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تم توصيل طلبك بنجاح!</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                                مرحباً {{customerName}}! يسعدنا إخبارك بأن طلبك قد تم توصيله.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F0FDF4; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 20px; text-align: right;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr><td style="padding: 4px 0; font-size: 14px; color: #166534;"><strong>رقم الطلب:</strong> #{{orderNumber}}</td></tr>
                                            <tr><td style="padding: 4px 0; font-size: 14px; color: #166534;"><strong>المتجر:</strong> {{storeName}}</td></tr>
                                            <tr><td style="padding: 4px 0; font-size: 14px; color: #166534;"><strong>وقت التوصيل:</strong> {{deliveryTime}}</td></tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF3C7; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 20px; text-align: center;">
                                        <p style="margin: 0 0 12px 0; font-size: 16px; color: #92400E; font-weight: 600;">⭐ شاركنا تجربتك!</p>
                                        <p style="margin: 0; font-size: 14px; color: #A16207;">رأيك يهمنا ويساعدنا على تحسين خدماتنا</p>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="{{reviewUrl}}" style="display: inline-block; background-color: #F59E0B; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">قيّم تجربتك ←</a>
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
                            <p style="color: #009DE0; font-size: 13px; font-weight: 500; margin: 14px 0;">منصة لتلبية احتياجات البيت اليومية لجمهورية مصر العربية</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  '["customerName", "orderNumber", "storeName", "deliveryTime", "reviewUrl"]'::jsonb,
  'customer'
) ON CONFLICT (slug) DO NOTHING;

-- Password Reset Template
INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'password-reset',
  'إعادة تعيين كلمة المرور',
  'يُرسل عند طلب إعادة تعيين كلمة المرور',
  'إعادة تعيين كلمة المرور - إنجزنا',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إعادة تعيين كلمة المرور - إنجزنا</title>
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
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #E0F4FF; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">🔐</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">إعادة تعيين كلمة المرور</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                                مرحباً {{userName}}، تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 24px 0;">
                                        <a href="{{resetUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">إعادة تعيين كلمة المرور ←</a>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF3C7; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: center;">
                                        <p style="margin: 0; font-size: 13px; color: #92400E;">⏰ هذا الرابط صالح لمدة {{expiryTime}} فقط</p>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: right;">
                                        <p style="margin: 0; font-size: 13px; color: #64748B; line-height: 1.7;">
                                            <strong style="color: #0F172A;">🛡️ نصائح أمان:</strong><br>
                                            • لا تشارك هذا الرابط مع أي شخص<br>
                                            • اختر كلمة مرور قوية ومختلفة<br>
                                            • إذا لم تطلب هذا، تجاهل هذا الإيميل
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                            <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                                إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا الإيميل بأمان.
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
  '["userName", "resetUrl", "expiryTime"]'::jsonb,
  'customer'
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- PHASE 2: Important Templates
-- ============================================================================

-- Customer Order Shipped / Out for Delivery
INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'customer-order-shipped',
  'الطلب في الطريق',
  'يُرسل للعميل عندما يكون الطلب في طريقه للتوصيل',
  'طلبك #{{orderNumber}} في الطريق إليك! - إنجزنا',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>طلبك في الطريق - إنجزنا</title>
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
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #E0F4FF; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">🚗</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">طلبك في الطريق!</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                                مرحباً {{customerName}}! السائق {{driverName}} في طريقه إليك الآن.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F0F9FF; border-radius: 12px; margin-bottom: 24px; border-right: 4px solid #009DE0;">
                                <tr>
                                    <td style="padding: 20px; text-align: right;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>رقم الطلب:</strong> #{{orderNumber}}</td></tr>
                                            <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>المتجر:</strong> {{storeName}}</td></tr>
                                            <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>السائق:</strong> {{driverName}}</td></tr>
                                            <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>رقم الهاتف:</strong> <a href="tel:{{driverPhone}}" style="color: #009DE0; text-decoration: none;">{{driverPhone}}</a></td></tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #DCFCE7; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: center;">
                                        <p style="margin: 0; font-size: 16px; color: #166534; font-weight: 600;">⏱️ الوصول المتوقع: {{estimatedArrival}}</p>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="{{trackingUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">تتبع الطلب مباشرة ←</a>
                                    </td>
                                </tr>
                            </table>

                            <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                            <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                                يمكنك التواصل مع السائق مباشرة في حال الحاجة
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
  '["customerName", "orderNumber", "storeName", "driverName", "driverPhone", "estimatedArrival", "trackingUrl"]'::jsonb,
  'customer'
) ON CONFLICT (slug) DO NOTHING;

-- Customer Order Cancelled
INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'customer-order-cancelled',
  'إلغاء طلب العميل',
  'يُرسل للعميل عند إلغاء الطلب',
  'تم إلغاء طلبك #{{orderNumber}} - إنجزنا',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تم إلغاء الطلب - إنجزنا</title>
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
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #FEF2F2; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">❌</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تم إلغاء الطلب</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                                مرحباً {{customerName}}، نأسف لإعلامك بأنه تم إلغاء طلبك.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF2F2; border-radius: 12px; margin-bottom: 24px; border-right: 4px solid #EF4444;">
                                <tr>
                                    <td style="padding: 20px; text-align: right;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr><td style="padding: 4px 0; font-size: 14px; color: #7F1D1D;"><strong>رقم الطلب:</strong> #{{orderNumber}}</td></tr>
                                            <tr><td style="padding: 4px 0; font-size: 14px; color: #7F1D1D;"><strong>المتجر:</strong> {{storeName}}</td></tr>
                                            <tr><td style="padding: 8px 0; font-size: 14px; color: #7F1D1D; line-height: 1.6;"><strong>سبب الإلغاء:</strong><br>{{cancellationReason}}</td></tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F0FDF4; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: center;">
                                        <p style="margin: 0; font-size: 14px; color: #166534;">💰 {{refundMessage}}</p>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="{{reorderUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">اطلب مرة أخرى ←</a>
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
                            <p style="color: #009DE0; font-size: 13px; font-weight: 500; margin: 14px 0;">منصة لتلبية احتياجات البيت اليومية لجمهورية مصر العربية</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  '["customerName", "orderNumber", "storeName", "cancellationReason", "refundMessage", "reorderUrl"]'::jsonb,
  'customer'
) ON CONFLICT (slug) DO NOTHING;

-- Email Verification
INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'email-verification',
  'تأكيد البريد الإلكتروني',
  'يُرسل للتحقق من البريد الإلكتروني عند التسجيل',
  'تأكيد بريدك الإلكتروني - إنجزنا',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تأكيد البريد الإلكتروني - إنجزنا</title>
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
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #E0F4FF; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">📧</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">تأكيد بريدك الإلكتروني</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                                أهلاً {{userName}}! شكراً لتسجيلك في إنجزنا.<br>
                                يرجى تأكيد بريدك الإلكتروني لإكمال التسجيل.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 24px 0;">
                                        <a href="{{verificationUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">تأكيد البريد الإلكتروني ←</a>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: center;">
                                        <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748B;">أو انسخ هذا الرابط:</p>
                                        <p style="margin: 0; font-size: 12px; color: #009DE0; word-break: break-all;">{{verificationUrl}}</p>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF3C7; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: center;">
                                        <p style="margin: 0; font-size: 13px; color: #92400E;">⏰ هذا الرابط صالح لمدة 24 ساعة</p>
                                    </td>
                                </tr>
                            </table>

                            <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                            <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                                إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذا الإيميل بأمان.
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
  '["userName", "verificationUrl"]'::jsonb,
  'customer'
) ON CONFLICT (slug) DO NOTHING;

-- Customer Welcome
INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'customer-welcome',
  'ترحيب بالعميل الجديد',
  'يُرسل عند تسجيل عميل جديد وتأكيد بريده',
  'أهلاً بك في إنجزنا! 🎉',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>أهلاً بك في إنجزنا</title>
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
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #E0F4FF; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">👋</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">أهلاً بك {{customerName}}!</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 32px 0;">
                                نحن سعداء بانضمامك لعائلة إنجزنا! 🚀<br>
                                اكتشف أفضل المتاجر والمطاعم في مدينتك.
                            </p>

                            <div style="text-align: right; margin-bottom: 24px;">
                                <p style="color: #0F172A; font-size: 15px; font-weight: 600; margin: 0 0 12px 0;">ماذا يمكنك فعله؟</p>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px;">
                                    <tr>
                                        <td style="padding: 16px 20px;">
                                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569; line-height: 1.7;">🛒 تصفح آلاف المنتجات من أفضل المتاجر</p>
                                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569; line-height: 1.7;">🍔 اطلب من مطاعمك المفضلة</p>
                                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569; line-height: 1.7;">📍 تتبع طلبك لحظة بلحظة</p>
                                            <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.7;">💳 ادفع بطريقتك المفضلة</p>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="{{browseUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">ابدأ التسوق الآن ←</a>
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
                            <p style="color: #009DE0; font-size: 13px; font-weight: 500; margin: 14px 0;">منصة لتلبية احتياجات البيت اليومية لجمهورية مصر العربية</p>
                            <p style="font-size: 12px; color: #64748B; margin: 10px 0;">لكل محافظات مصر 🇪🇬</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  '["customerName", "browseUrl"]'::jsonb,
  'customer'
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- PHASE 3: Marketing & Promotional Templates
-- ============================================================================

-- Promotional Offer
INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'promotional-offer',
  'عرض ترويجي',
  'يُرسل للعملاء مع عروض خاصة وكوبونات',
  '🎁 {{offerTitle}} - خصم {{discountPercent}}% لفترة محدودة!',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>عرض خاص - إنجزنا</title>
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
                            <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 18px; font-weight: 700;">عرض حصري!</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #FEF3C7; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">🎁</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">{{offerTitle}}</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                                مرحباً {{customerName}}! لدينا عرض خاص لك.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-radius: 16px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 28px; text-align: center;">
                                        <p style="margin: 0 0 8px 0; font-size: 48px; color: #D97706; font-weight: 700;">{{discountPercent}}%</p>
                                        <p style="margin: 0; font-size: 18px; color: #92400E; font-weight: 600;">خصم على طلبك القادم</p>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 20px; text-align: center;">
                                        <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748B;">كود الخصم:</p>
                                        <p style="margin: 0; font-size: 24px; color: #009DE0; font-weight: 700; letter-spacing: 4px;">{{couponCode}}</p>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF2F2; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: center;">
                                        <p style="margin: 0; font-size: 14px; color: #DC2626; font-weight: 600;">⏰ ينتهي العرض: {{expiryDate}}</p>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #475569; font-size: 14px; line-height: 1.75; margin: 0 0 24px 0; text-align: right;">
                                {{offerDescription}}
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="{{shopUrl}}" style="display: inline-block; background-color: #F59E0B; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">تسوق الآن ←</a>
                                    </td>
                                </tr>
                            </table>

                            <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                            <p style="font-size: 12px; color: #94A3B8; line-height: 1.7; margin: 0;">
                                * العرض صالح على الطلبات بحد أدنى {{minimumOrder}}. لا يمكن دمجه مع عروض أخرى.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="background-color: #0F172A; padding: 28px 24px;">
                            <a href="https://www.engezna.com" style="text-decoration: none;">
                                <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا" width="100" style="height: auto; display: block; margin: 0 auto;">
                            </a>
                            <p style="color: #009DE0; font-size: 13px; font-weight: 500; margin: 14px 0;">منصة لتلبية احتياجات البيت اليومية لجمهورية مصر العربية</p>
                            <p style="font-size: 11px; color: #64748B; margin: 14px 0 0 0;">
                                <a href="{{unsubscribeUrl}}" style="color: #64748B; text-decoration: underline;">إلغاء الاشتراك من الرسائل الترويجية</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  '["customerName", "offerTitle", "discountPercent", "couponCode", "expiryDate", "offerDescription", "shopUrl", "minimumOrder", "unsubscribeUrl"]'::jsonb,
  'marketing'
) ON CONFLICT (slug) DO NOTHING;

-- Abandoned Cart Reminder
INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'abandoned-cart',
  'تذكير بالسلة المتروكة',
  'يُرسل للعملاء الذين تركوا منتجات في سلة التسوق',
  'نسيت شيء؟ 🛒 سلتك في انتظارك!',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>سلتك في انتظارك - إنجزنا</title>
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
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #E0F4FF; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">🛒</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">نسيت شيء؟</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                                مرحباً {{customerName}}! لاحظنا أنك تركت بعض المنتجات في سلتك.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 20px; text-align: right;">
                                        <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748B;">في سلتك:</p>
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding: 4px 0; font-size: 14px; color: #0F172A;"><strong>{{itemsCount}}</strong> منتج من <strong>{{storeName}}</strong></td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 4px 0; font-size: 16px; color: #009DE0; font-weight: 700;">الإجمالي: {{formattedAmount}}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #DCFCE7; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: center;">
                                        <p style="margin: 0; font-size: 14px; color: #166534; font-weight: 600;">🎁 أكمل طلبك الآن واحصل على توصيل مجاني!</p>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="{{cartUrl}}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">أكمل طلبك الآن ←</a>
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
                            <p style="color: #009DE0; font-size: 13px; font-weight: 500; margin: 14px 0;">منصة لتلبية احتياجات البيت اليومية لجمهورية مصر العربية</p>
                            <p style="font-size: 11px; color: #64748B; margin: 14px 0 0 0;">
                                <a href="{{unsubscribeUrl}}" style="color: #64748B; text-decoration: underline;">إلغاء الاشتراك من التذكيرات</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  '["customerName", "itemsCount", "storeName", "formattedAmount", "cartUrl", "unsubscribeUrl"]'::jsonb,
  'marketing'
) ON CONFLICT (slug) DO NOTHING;

-- Review Request
INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'review-request',
  'طلب تقييم الطلب',
  'يُرسل بعد توصيل الطلب لطلب تقييم من العميل',
  'كيف كانت تجربتك مع {{storeName}}؟ ⭐',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>شاركنا رأيك - إنجزنا</title>
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
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #FEF3C7; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">⭐</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">كيف كانت تجربتك؟</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                                مرحباً {{customerName}}! نأمل أنك استمتعت بطلبك من <strong>{{storeName}}</strong>.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 20px; text-align: center;">
                                        <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748B;">طلب #{{orderNumber}}</p>
                                        <p style="margin: 0; font-size: 36px;">⭐ ⭐ ⭐ ⭐ ⭐</p>
                                        <p style="margin: 8px 0 0 0; font-size: 13px; color: #94A3B8;">اضغط على النجوم لتقييم تجربتك</p>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 16px 0;">
                                        <a href="{{reviewUrl}}" style="display: inline-block; background-color: #F59E0B; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">قيّم تجربتك ←</a>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #E0F4FF; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: center;">
                                        <p style="margin: 0; font-size: 14px; color: #0369A1;">💬 رأيك يساعد المتاجر على تحسين خدماتها ويساعد عملاء آخرين</p>
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
                            <p style="color: #009DE0; font-size: 13px; font-weight: 500; margin: 14px 0;">منصة لتلبية احتياجات البيت اليومية لجمهورية مصر العربية</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  '["customerName", "storeName", "orderNumber", "reviewUrl"]'::jsonb,
  'marketing'
) ON CONFLICT (slug) DO NOTHING;

-- Admin: New Store Application
INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category)
VALUES (
  'admin-new-store-application',
  'طلب تسجيل متجر جديد',
  'يُرسل للإدارة عند تقديم طلب متجر جديد',
  '🆕 طلب متجر جديد: {{storeName}} - يحتاج مراجعة',
  E'<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>طلب متجر جديد - إنجزنا</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #F1F5F9; direction: rtl;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); padding: 36px 24px;">
                            <a href="https://www.engezna.com" style="text-decoration: none;">
                                <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                            </a>
                            <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">لوحة تحكم الإدارة</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #EEF2FF; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">🏪</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">طلب متجر جديد</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                                تم تقديم طلب تسجيل متجر جديد ويحتاج مراجعتك.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px; border-right: 4px solid #6366F1;">
                                <tr>
                                    <td style="padding: 20px; text-align: right;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr><td style="padding: 8px 0; font-size: 14px; color: #475569;"><strong style="color: #0F172A;">🏪 اسم المتجر:</strong> {{storeName}}</td></tr>
                                            <tr><td style="padding: 8px 0; font-size: 14px; color: #475569;"><strong style="color: #0F172A;">👤 صاحب المتجر:</strong> {{merchantName}}</td></tr>
                                            <tr><td style="padding: 8px 0; font-size: 14px; color: #475569;"><strong style="color: #0F172A;">📧 البريد:</strong> {{merchantEmail}}</td></tr>
                                            <tr><td style="padding: 8px 0; font-size: 14px; color: #475569;"><strong style="color: #0F172A;">📱 الهاتف:</strong> {{merchantPhone}}</td></tr>
                                            <tr><td style="padding: 8px 0; font-size: 14px; color: #475569;"><strong style="color: #0F172A;">📍 المدينة:</strong> {{city}}</td></tr>
                                            <tr><td style="padding: 8px 0; font-size: 14px; color: #475569;"><strong style="color: #0F172A;">🏷️ التصنيف:</strong> {{category}}</td></tr>
                                            <tr><td style="padding: 8px 0; font-size: 14px; color: #475569;"><strong style="color: #0F172A;">📅 تاريخ التقديم:</strong> {{submittedAt}}</td></tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="{{reviewUrl}}" style="display: inline-block; background-color: #6366F1; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">مراجعة الطلب ←</a>
                                    </td>
                                </tr>
                            </table>

                            <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                            <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                                هذا إشعار آلي من نظام إنجزنا للإدارة
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
  '["storeName", "merchantName", "merchantEmail", "merchantPhone", "city", "category", "submittedAt", "reviewUrl"]'::jsonb,
  'admin'
) ON CONFLICT (slug) DO NOTHING;
