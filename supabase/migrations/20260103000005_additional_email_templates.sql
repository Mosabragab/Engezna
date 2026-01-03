-- Additional Email Templates
-- Customer, Merchant, Support, and Admin templates

-- =====================================================
-- CUSTOMER TEMPLATES
-- =====================================================

-- Customer: Refund Initiated
INSERT INTO email_templates (slug, name, description, subject, html_content, variables, category, is_active)
VALUES (
  'customer-refund-initiated',
  'إشعار بدء الاسترداد',
  'يُرسل للعميل عند بدء طلب استرداد المبلغ',
  'تم استلام طلب الاسترداد - طلب #{{orderNumber}}',
  '<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>طلب الاسترداد قيد المعالجة</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #009DE0 0%, #0080b8 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">إنجزنا</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">طلب الاسترداد قيد المعالجة</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #0F172A; margin: 0 0 20px 0; font-size: 22px;">مرحباً {{userName}} 👋</h2>

              <p style="color: #64748b; font-size: 16px; line-height: 1.8; margin: 0 0 25px 0;">
                تم استلام طلب الاسترداد الخاص بك وهو الآن قيد المراجعة من فريقنا.
              </p>

              <!-- Order Details -->
              <table width="100%" style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">رقم الطلب</p>
                    <p style="margin: 0 0 15px 0; color: #0F172A; font-size: 18px; font-weight: bold;">#{{orderNumber}}</p>
                    <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">مبلغ الاسترداد</p>
                    <p style="margin: 0 0 15px 0; color: #009DE0; font-size: 24px; font-weight: bold;">{{refundAmount}} جنيه</p>
                    <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">السبب</p>
                    <p style="margin: 0; color: #0F172A; font-size: 16px;">{{refundReason}}</p>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 14px; line-height: 1.8; margin: 0 0 20px 0;">
                سيتم مراجعة طلبك خلال 24-48 ساعة وسنُعلمك بالنتيجة عبر البريد الإلكتروني.
              </p>

              <a href="{{trackUrl}}" style="display: inline-block; background: linear-gradient(135deg, #009DE0 0%, #0080b8 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 10px; font-weight: bold; font-size: 16px;">
                متابعة حالة الطلب
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                هذا البريد مرسل تلقائياً من إنجزنا
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["userName", "orderNumber", "refundAmount", "refundReason", "trackUrl"]'::jsonb,
  'customer',
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- Customer: Refund Completed
INSERT INTO email_templates (slug, name, description, subject, html_content, variables, category, is_active)
VALUES (
  'customer-refund-completed',
  'تم اكتمال الاسترداد',
  'يُرسل للعميل عند اكتمال عملية الاسترداد',
  'تم استرداد المبلغ بنجاح - طلب #{{orderNumber}}',
  '<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تم الاسترداد بنجاح</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <div style="width: 60px; height: 60px; background-color: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 30px;">✓</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">تم الاسترداد بنجاح!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #0F172A; margin: 0 0 20px 0; font-size: 22px;">مرحباً {{userName}} 👋</h2>

              <p style="color: #64748b; font-size: 16px; line-height: 1.8; margin: 0 0 25px 0;">
                تم استرداد المبلغ الخاص بطلبك بنجاح. سيظهر المبلغ في حسابك خلال 3-5 أيام عمل.
              </p>

              <!-- Refund Details -->
              <table width="100%" style="background-color: #ecfdf5; border-radius: 12px; padding: 25px; margin-bottom: 25px; border: 1px solid #a7f3d0;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 10px 0; color: #064e3b; font-size: 14px;">المبلغ المسترد</p>
                    <p style="margin: 0; color: #059669; font-size: 32px; font-weight: bold;">{{refundAmount}} جنيه</p>
                  </td>
                </tr>
              </table>

              <table width="100%" style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">رقم الطلب: <strong style="color: #0F172A;">#{{orderNumber}}</strong></p>
                    <p style="margin: 0; color: #64748b; font-size: 14px;">طريقة الاسترداد: <strong style="color: #0F172A;">{{refundMethod}}</strong></p>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 14px; line-height: 1.8; margin: 0;">
                شكراً لصبرك وتفهمك. نأسف على أي إزعاج سببناه لك.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                هذا البريد مرسل تلقائياً من إنجزنا
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["userName", "orderNumber", "refundAmount", "refundMethod"]'::jsonb,
  'customer',
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- =====================================================
-- MERCHANT TEMPLATES
-- =====================================================

-- Merchant: Order Cancelled
INSERT INTO email_templates (slug, name, description, subject, html_content, variables, category, is_active)
VALUES (
  'merchant-order-cancelled',
  'إلغاء طلب للتاجر',
  'يُرسل للتاجر عند إلغاء طلب',
  'تم إلغاء الطلب #{{orderNumber}}',
  '<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تم إلغاء الطلب</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">إنجزنا للتجار</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">تم إلغاء طلب</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #0F172A; margin: 0 0 20px 0; font-size: 22px;">مرحباً {{storeName}} 👋</h2>

              <p style="color: #64748b; font-size: 16px; line-height: 1.8; margin: 0 0 25px 0;">
                نود إعلامك بأن الطلب التالي تم إلغاؤه:
              </p>

              <!-- Order Details -->
              <table width="100%" style="background-color: #fef2f2; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #fecaca;">
                <tr>
                  <td>
                    <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px;">رقم الطلب</p>
                    <p style="margin: 0 0 15px 0; color: #0F172A; font-size: 18px; font-weight: bold;">#{{orderNumber}}</p>
                    <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px;">سبب الإلغاء</p>
                    <p style="margin: 0 0 15px 0; color: #0F172A; font-size: 16px;">{{cancellationReason}}</p>
                    <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px;">تم الإلغاء بواسطة</p>
                    <p style="margin: 0; color: #0F172A; font-size: 16px;">{{cancelledBy}}</p>
                  </td>
                </tr>
              </table>

              <a href="{{dashboardUrl}}" style="display: inline-block; background: linear-gradient(135deg, #009DE0 0%, #0080b8 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 10px; font-weight: bold; font-size: 16px;">
                عرض التفاصيل
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                هذا البريد مرسل تلقائياً من إنجزنا
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["storeName", "orderNumber", "cancellationReason", "cancelledBy", "dashboardUrl"]'::jsonb,
  'merchant',
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- Merchant: Low Rating Alert
INSERT INTO email_templates (slug, name, description, subject, html_content, variables, category, is_active)
VALUES (
  'merchant-low-rating-alert',
  'تنبيه تقييم منخفض',
  'يُرسل للتاجر عند تلقي تقييم منخفض',
  '⚠️ تنبيه: تقييم جديد منخفض لمتجرك',
  '<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تنبيه تقييم منخفض</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">⚠️ تنبيه مهم</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #0F172A; margin: 0 0 20px 0; font-size: 22px;">مرحباً {{storeName}} 👋</h2>

              <p style="color: #64748b; font-size: 16px; line-height: 1.8; margin: 0 0 25px 0;">
                تلقى متجرك تقييماً جديداً قد يحتاج انتباهك:
              </p>

              <!-- Rating Details -->
              <table width="100%" style="background-color: #fffbeb; border-radius: 12px; padding: 25px; margin-bottom: 25px; border: 1px solid #fde68a;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;">التقييم</p>
                    <p style="margin: 0 0 15px 0; color: #d97706; font-size: 36px; font-weight: bold;">{{rating}} ⭐</p>
                    <p style="margin: 0; color: #0F172A; font-size: 14px; font-style: italic;">"{{reviewComment}}"</p>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 14px; line-height: 1.8; margin: 0 0 20px 0;">
                نوصي بمراجعة هذا التقييم والتواصل مع العميل إذا لزم الأمر لتحسين تجربته.
              </p>

              <a href="{{reviewsUrl}}" style="display: inline-block; background: linear-gradient(135deg, #009DE0 0%, #0080b8 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 10px; font-weight: bold; font-size: 16px;">
                عرض التقييمات
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                هذا البريد مرسل تلقائياً من إنجزنا
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["storeName", "rating", "reviewComment", "reviewsUrl"]'::jsonb,
  'merchant',
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- Merchant: New Review
INSERT INTO email_templates (slug, name, description, subject, html_content, variables, category, is_active)
VALUES (
  'merchant-new-review',
  'تقييم جديد',
  'يُرسل للتاجر عند تلقي تقييم جديد',
  '⭐ تقييم جديد لمتجرك {{storeName}}',
  '<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تقييم جديد</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #009DE0 0%, #0080b8 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">إنجزنا للتجار</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">تقييم جديد!</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #0F172A; margin: 0 0 20px 0; font-size: 22px;">مرحباً {{storeName}} 👋</h2>

              <p style="color: #64748b; font-size: 16px; line-height: 1.8; margin: 0 0 25px 0;">
                تلقى متجرك تقييماً جديداً من أحد العملاء:
              </p>

              <!-- Review Details -->
              <table width="100%" style="background-color: #f0f9ff; border-radius: 12px; padding: 25px; margin-bottom: 25px; border: 1px solid #bae6fd;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 10px 0; color: #0369a1; font-size: 14px;">التقييم</p>
                    <p style="margin: 0 0 15px 0; color: #0284c7; font-size: 36px; font-weight: bold;">{{rating}} ⭐</p>
                    <p style="margin: 0 0 10px 0; color: #0369a1; font-size: 14px;">من العميل</p>
                    <p style="margin: 0 0 15px 0; color: #0F172A; font-size: 16px; font-weight: bold;">{{customerName}}</p>
                    <p style="margin: 0; color: #0F172A; font-size: 14px; font-style: italic;">"{{reviewComment}}"</p>
                  </td>
                </tr>
              </table>

              <a href="{{reviewsUrl}}" style="display: inline-block; background: linear-gradient(135deg, #009DE0 0%, #0080b8 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 10px; font-weight: bold; font-size: 16px;">
                عرض جميع التقييمات
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                هذا البريد مرسل تلقائياً من إنجزنا
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["storeName", "rating", "customerName", "reviewComment", "reviewsUrl"]'::jsonb,
  'merchant',
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- Merchant: Store Reactivated
INSERT INTO email_templates (slug, name, description, subject, html_content, variables, category, is_active)
VALUES (
  'merchant-store-reactivated',
  'إعادة تفعيل المتجر',
  'يُرسل للتاجر عند إعادة تفعيل متجره',
  '🎉 تم إعادة تفعيل متجرك على إنجزنا!',
  '<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تم إعادة تفعيل المتجر</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <div style="font-size: 50px; margin-bottom: 10px;">🎉</div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">متجرك نشط مجدداً!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #0F172A; margin: 0 0 20px 0; font-size: 22px;">مرحباً {{storeName}} 👋</h2>

              <p style="color: #64748b; font-size: 16px; line-height: 1.8; margin: 0 0 25px 0;">
                يسعدنا إبلاغك بأن متجرك قد تم إعادة تفعيله بنجاح. يمكنك الآن استقبال الطلبات مجدداً.
              </p>

              <table width="100%" style="background-color: #ecfdf5; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #a7f3d0;">
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: #065f46; font-size: 16px; font-weight: bold;">✓ متجرك جاهز لاستقبال الطلبات</p>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 14px; line-height: 1.8; margin: 0 0 25px 0;">
                تأكد من تحديث قائمة منتجاتك وأوقات العمل لضمان أفضل تجربة لعملائك.
              </p>

              <a href="{{dashboardUrl}}" style="display: inline-block; background: linear-gradient(135deg, #009DE0 0%, #0080b8 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 10px; font-weight: bold; font-size: 16px;">
                الذهاب للوحة التحكم
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                هذا البريد مرسل تلقائياً من إنجزنا
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["storeName", "dashboardUrl"]'::jsonb,
  'merchant',
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- =====================================================
-- SUPPORT TEMPLATES
-- =====================================================

-- Support: Ticket Created
INSERT INTO email_templates (slug, name, description, subject, html_content, variables, category, is_active)
VALUES (
  'ticket-created',
  'تأكيد إنشاء تذكرة دعم',
  'يُرسل للعميل عند إنشاء تذكرة دعم جديدة',
  'تم استلام طلب الدعم #{{ticketNumber}}',
  '<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تم استلام طلب الدعم</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #009DE0 0%, #0080b8 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">إنجزنا</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">تم استلام طلب الدعم</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #0F172A; margin: 0 0 20px 0; font-size: 22px;">مرحباً {{userName}} 👋</h2>

              <p style="color: #64748b; font-size: 16px; line-height: 1.8; margin: 0 0 25px 0;">
                شكراً لتواصلك معنا. تم استلام طلب الدعم الخاص بك وسيقوم فريقنا بالرد عليك في أقرب وقت.
              </p>

              <!-- Ticket Details -->
              <table width="100%" style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">رقم التذكرة</p>
                    <p style="margin: 0 0 15px 0; color: #009DE0; font-size: 20px; font-weight: bold;">#{{ticketNumber}}</p>
                    <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">الموضوع</p>
                    <p style="margin: 0 0 15px 0; color: #0F172A; font-size: 16px; font-weight: bold;">{{ticketSubject}}</p>
                    <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">الحالة</p>
                    <p style="margin: 0; color: #f59e0b; font-size: 14px; font-weight: bold;">قيد الانتظار</p>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 14px; line-height: 1.8; margin: 0 0 20px 0;">
                متوسط وقت الرد: خلال 24 ساعة
              </p>

              <a href="{{ticketUrl}}" style="display: inline-block; background: linear-gradient(135deg, #009DE0 0%, #0080b8 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 10px; font-weight: bold; font-size: 16px;">
                متابعة التذكرة
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                هذا البريد مرسل تلقائياً من إنجزنا
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["userName", "ticketNumber", "ticketSubject", "ticketUrl"]'::jsonb,
  'support',
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- Support: Ticket Replied
INSERT INTO email_templates (slug, name, description, subject, html_content, variables, category, is_active)
VALUES (
  'ticket-replied',
  'رد على تذكرة الدعم',
  'يُرسل للعميل عند الرد على تذكرته',
  'رد جديد على طلب الدعم #{{ticketNumber}}',
  '<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>رد جديد على طلب الدعم</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #009DE0 0%, #0080b8 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">إنجزنا</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">رد جديد على طلب الدعم</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #0F172A; margin: 0 0 20px 0; font-size: 22px;">مرحباً {{userName}} 👋</h2>

              <p style="color: #64748b; font-size: 16px; line-height: 1.8; margin: 0 0 25px 0;">
                تم الرد على طلب الدعم الخاص بك من قبل فريق الدعم:
              </p>

              <!-- Reply Preview -->
              <table width="100%" style="background-color: #f0f9ff; border-radius: 12px; padding: 20px; margin-bottom: 25px; border-right: 4px solid #009DE0;">
                <tr>
                  <td>
                    <p style="margin: 0 0 10px 0; color: #0369a1; font-size: 12px;">{{agentName}} - فريق الدعم</p>
                    <p style="margin: 0; color: #0F172A; font-size: 15px; line-height: 1.7;">{{replyPreview}}</p>
                  </td>
                </tr>
              </table>

              <a href="{{ticketUrl}}" style="display: inline-block; background: linear-gradient(135deg, #009DE0 0%, #0080b8 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 10px; font-weight: bold; font-size: 16px;">
                عرض المحادثة الكاملة
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                هذا البريد مرسل تلقائياً من إنجزنا
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["userName", "ticketNumber", "agentName", "replyPreview", "ticketUrl"]'::jsonb,
  'support',
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- Support: Ticket Resolved
INSERT INTO email_templates (slug, name, description, subject, html_content, variables, category, is_active)
VALUES (
  'ticket-resolved',
  'تم حل التذكرة',
  'يُرسل للعميل عند إغلاق تذكرته',
  '✓ تم حل طلب الدعم #{{ticketNumber}}',
  '<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تم حل طلب الدعم</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <div style="width: 60px; height: 60px; background-color: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 15px; line-height: 60px;">
                <span style="font-size: 30px;">✓</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">تم حل طلب الدعم</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #0F172A; margin: 0 0 20px 0; font-size: 22px;">مرحباً {{userName}} 👋</h2>

              <p style="color: #64748b; font-size: 16px; line-height: 1.8; margin: 0 0 25px 0;">
                تم إغلاق طلب الدعم الخاص بك. نأمل أن نكون قد ساعدناك!
              </p>

              <!-- Ticket Details -->
              <table width="100%" style="background-color: #ecfdf5; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #a7f3d0;">
                <tr>
                  <td>
                    <p style="margin: 0 0 10px 0; color: #065f46; font-size: 14px;">رقم التذكرة</p>
                    <p style="margin: 0 0 15px 0; color: #0F172A; font-size: 18px; font-weight: bold;">#{{ticketNumber}}</p>
                    <p style="margin: 0 0 10px 0; color: #065f46; font-size: 14px;">الحالة</p>
                    <p style="margin: 0; color: #059669; font-size: 14px; font-weight: bold;">✓ تم الحل</p>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 14px; line-height: 1.8; margin: 0 0 20px 0;">
                إذا كنت بحاجة لمزيد من المساعدة، يمكنك إعادة فتح التذكرة أو إنشاء تذكرة جديدة.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="{{ticketUrl}}" style="display: inline-block; background: linear-gradient(135deg, #009DE0 0%, #0080b8 100%); color: #ffffff; text-decoration: none; padding: 14px 25px; border-radius: 10px; font-weight: bold; font-size: 14px; margin-left: 10px;">
                      عرض التذكرة
                    </a>
                    <a href="{{feedbackUrl}}" style="display: inline-block; background-color: #f8fafc; color: #64748b; text-decoration: none; padding: 14px 25px; border-radius: 10px; font-weight: bold; font-size: 14px; border: 1px solid #e2e8f0;">
                      تقييم الخدمة
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                هذا البريد مرسل تلقائياً من إنجزنا
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["userName", "ticketNumber", "ticketUrl", "feedbackUrl"]'::jsonb,
  'support',
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- Support: Dispute Opened
INSERT INTO email_templates (slug, name, description, subject, html_content, variables, category, is_active)
VALUES (
  'dispute-opened',
  'فتح نزاع جديد',
  'يُرسل للأطراف عند فتح نزاع',
  'تم فتح نزاع جديد - الطلب #{{orderNumber}}',
  '<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>نزاع جديد</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">⚠️ نزاع جديد</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #0F172A; margin: 0 0 20px 0; font-size: 22px;">مرحباً {{userName}} 👋</h2>

              <p style="color: #64748b; font-size: 16px; line-height: 1.8; margin: 0 0 25px 0;">
                تم فتح نزاع بخصوص الطلب التالي. سيقوم فريقنا بمراجعة الحالة واتخاذ الإجراء المناسب.
              </p>

              <!-- Dispute Details -->
              <table width="100%" style="background-color: #fffbeb; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #fde68a;">
                <tr>
                  <td>
                    <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;">رقم الطلب</p>
                    <p style="margin: 0 0 15px 0; color: #0F172A; font-size: 18px; font-weight: bold;">#{{orderNumber}}</p>
                    <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;">نوع النزاع</p>
                    <p style="margin: 0 0 15px 0; color: #0F172A; font-size: 16px;">{{disputeType}}</p>
                    <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;">الوصف</p>
                    <p style="margin: 0; color: #0F172A; font-size: 14px; line-height: 1.6;">{{disputeDescription}}</p>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 14px; line-height: 1.8; margin: 0 0 20px 0;">
                سيتم التواصل معك خلال 48 ساعة بخصوص هذا النزاع.
              </p>

              <a href="{{disputeUrl}}" style="display: inline-block; background: linear-gradient(135deg, #009DE0 0%, #0080b8 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 10px; font-weight: bold; font-size: 16px;">
                متابعة النزاع
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                هذا البريد مرسل تلقائياً من إنجزنا
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["userName", "orderNumber", "disputeType", "disputeDescription", "disputeUrl"]'::jsonb,
  'support',
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- Support: Dispute Resolved
INSERT INTO email_templates (slug, name, description, subject, html_content, variables, category, is_active)
VALUES (
  'dispute-resolved',
  'تم حل النزاع',
  'يُرسل للأطراف عند حل النزاع',
  '✓ تم حل النزاع - الطلب #{{orderNumber}}',
  '<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تم حل النزاع</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <div style="width: 60px; height: 60px; background-color: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 15px; line-height: 60px;">
                <span style="font-size: 30px;">✓</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">تم حل النزاع</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #0F172A; margin: 0 0 20px 0; font-size: 22px;">مرحباً {{userName}} 👋</h2>

              <p style="color: #64748b; font-size: 16px; line-height: 1.8; margin: 0 0 25px 0;">
                تم حل النزاع الخاص بطلبك. فيما يلي تفاصيل القرار:
              </p>

              <!-- Resolution Details -->
              <table width="100%" style="background-color: #ecfdf5; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #a7f3d0;">
                <tr>
                  <td>
                    <p style="margin: 0 0 10px 0; color: #065f46; font-size: 14px;">رقم الطلب</p>
                    <p style="margin: 0 0 15px 0; color: #0F172A; font-size: 18px; font-weight: bold;">#{{orderNumber}}</p>
                    <p style="margin: 0 0 10px 0; color: #065f46; font-size: 14px;">القرار</p>
                    <p style="margin: 0 0 15px 0; color: #0F172A; font-size: 16px; font-weight: bold;">{{resolution}}</p>
                    <p style="margin: 0 0 10px 0; color: #065f46; font-size: 14px;">التفاصيل</p>
                    <p style="margin: 0; color: #0F172A; font-size: 14px; line-height: 1.6;">{{resolutionDetails}}</p>
                  </td>
                </tr>
              </table>

              <a href="{{disputeUrl}}" style="display: inline-block; background: linear-gradient(135deg, #009DE0 0%, #0080b8 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 10px; font-weight: bold; font-size: 16px;">
                عرض التفاصيل
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                هذا البريد مرسل تلقائياً من إنجزنا
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["userName", "orderNumber", "resolution", "resolutionDetails", "disputeUrl"]'::jsonb,
  'support',
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- =====================================================
-- ADMIN TEMPLATES
-- =====================================================

-- Admin: Daily Report
INSERT INTO email_templates (slug, name, description, subject, html_content, variables, category, is_active)
VALUES (
  'admin-daily-report',
  'التقرير اليومي',
  'يُرسل للإدارة يومياً مع ملخص الإحصائيات',
  '📊 التقرير اليومي - {{reportDate}}',
  '<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>التقرير اليومي</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">📊 التقرير اليومي</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0; font-size: 16px;">{{reportDate}}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <!-- Stats Grid -->
              <table width="100%" cellpadding="10" cellspacing="0" style="margin-bottom: 25px;">
                <tr>
                  <td width="50%" style="background-color: #f0f9ff; border-radius: 12px; padding: 20px; text-align: center;">
                    <p style="margin: 0 0 5px 0; color: #0369a1; font-size: 12px;">إجمالي الطلبات</p>
                    <p style="margin: 0; color: #0284c7; font-size: 28px; font-weight: bold;">{{totalOrders}}</p>
                  </td>
                  <td width="50%" style="background-color: #ecfdf5; border-radius: 12px; padding: 20px; text-align: center;">
                    <p style="margin: 0 0 5px 0; color: #065f46; font-size: 12px;">الإيرادات</p>
                    <p style="margin: 0; color: #059669; font-size: 28px; font-weight: bold;">{{totalRevenue}} ج</p>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="background-color: #fef3c7; border-radius: 12px; padding: 20px; text-align: center;">
                    <p style="margin: 0 0 5px 0; color: #92400e; font-size: 12px;">عملاء جدد</p>
                    <p style="margin: 0; color: #d97706; font-size: 28px; font-weight: bold;">{{newCustomers}}</p>
                  </td>
                  <td width="50%" style="background-color: #fce7f3; border-radius: 12px; padding: 20px; text-align: center;">
                    <p style="margin: 0 0 5px 0; color: #9d174d; font-size: 12px;">متاجر جديدة</p>
                    <p style="margin: 0; color: #db2777; font-size: 28px; font-weight: bold;">{{newStores}}</p>
                  </td>
                </tr>
              </table>

              <!-- Additional Stats -->
              <table width="100%" style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 15px 0; color: #0F172A; font-size: 16px; font-weight: bold;">إحصائيات إضافية</p>
                    <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">الطلبات الملغاة: <strong style="color: #ef4444;">{{cancelledOrders}}</strong></p>
                    <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">طلبات الاسترداد: <strong style="color: #f59e0b;">{{refundRequests}}</strong></p>
                    <p style="margin: 0; color: #64748b; font-size: 14px;">متوسط قيمة الطلب: <strong style="color: #0F172A;">{{avgOrderValue}} جنيه</strong></p>
                  </td>
                </tr>
              </table>

              <a href="{{dashboardUrl}}" style="display: inline-block; background: linear-gradient(135deg, #009DE0 0%, #0080b8 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 10px; font-weight: bold; font-size: 16px;">
                عرض لوحة التحكم
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                هذا البريد مرسل تلقائياً من نظام إنجزنا
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["reportDate", "totalOrders", "totalRevenue", "newCustomers", "newStores", "cancelledOrders", "refundRequests", "avgOrderValue", "dashboardUrl"]'::jsonb,
  'admin',
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- Admin: Escalation Alert
INSERT INTO email_templates (slug, name, description, subject, html_content, variables, category, is_active)
VALUES (
  'admin-escalation-alert',
  'تنبيه تصعيد عاجل',
  'يُرسل للإدارة عند وجود حالة تحتاج تدخل فوري',
  '🚨 تنبيه عاجل: {{alertType}}',
  '<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تنبيه تصعيد عاجل</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, ''Segoe UI'', Tahoma, Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center;">
              <div style="font-size: 50px; margin-bottom: 10px;">🚨</div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">تنبيه تصعيد عاجل</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #dc2626; margin: 0 0 20px 0; font-size: 22px;">{{alertType}}</h2>

              <p style="color: #64748b; font-size: 16px; line-height: 1.8; margin: 0 0 25px 0;">
                تم تصعيد الحالة التالية وتحتاج إلى تدخل فوري:
              </p>

              <!-- Alert Details -->
              <table width="100%" style="background-color: #fef2f2; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #fecaca;">
                <tr>
                  <td>
                    <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px;">نوع التنبيه</p>
                    <p style="margin: 0 0 15px 0; color: #0F172A; font-size: 16px; font-weight: bold;">{{alertType}}</p>
                    <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px;">التفاصيل</p>
                    <p style="margin: 0 0 15px 0; color: #0F172A; font-size: 14px; line-height: 1.6;">{{alertDetails}}</p>
                    <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px;">الأولوية</p>
                    <p style="margin: 0; color: #dc2626; font-size: 16px; font-weight: bold;">{{priority}}</p>
                  </td>
                </tr>
              </table>

              <a href="{{actionUrl}}" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 10px; font-weight: bold; font-size: 16px;">
                اتخاذ إجراء الآن
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                هذا البريد مرسل تلقائياً من نظام إنجزنا
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["alertType", "alertDetails", "priority", "actionUrl"]'::jsonb,
  'admin',
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables,
  updated_at = NOW();
