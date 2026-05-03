-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Phase 16 follow-up — Gift system email templates
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-04-29
--
-- Seeds 3 celebratory customer emails into the existing email_templates table
-- so the marketing team can edit subject/HTML/variables from
-- /admin/email-templates without code changes:
--
--   1. gift-stamp-complete  — sent when a customer completes a stamp card
--   2. gift-loyalty-tier-up — sent when a customer's loyalty tier upgrades
--   3. gift-referral-reward — sent to the referrer when their referee's first
--      qualifying order completes
--
-- All 3 reuse the same visual language as the other customer emails
-- (gradient header, RTL Arabic, mobile-friendly tables) and use ON CONFLICT
-- DO UPDATE so re-running the migration is safe.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 1. gift-stamp-complete                                                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category, is_active)
VALUES (
  'gift-stamp-complete',
  'إكمال بطاقة الأختام',
  'يُرسل عند اكتمال بطاقة الأختام (الصندوق الذهبي يكون متاحًا في صفحة الهدايا)',
  '🏆 بطاقة الأختام اكتملت — صندوق ذهبي بانتظارك!',
  '<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>بطاقة الأختام اكتملت</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,''Segoe UI'',Tahoma,Arial,sans-serif;background-color:#f5f5f5;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:bold;">إنجزنا</h1>
              <p style="color:rgba(255,255,255,0.9);margin:10px 0 0 0;font-size:14px;">بطاقة أختامك اكتملت 🏆</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 30px;">
              <h2 style="color:#0F172A;margin:0 0 20px 0;font-size:22px;">مبارك يا {{userName}}! 🎉</h2>
              <p style="color:#64748b;font-size:16px;line-height:1.8;margin:0 0 25px 0;">
                أكملت بطاقة الأختام بنجاح. صندوق ذهبي بقيمة <strong style="color:#d97706;">{{goldenBoxEgp}} جنيه</strong> ينتظرك في صفحة الهدايا.
              </p>
              <table width="100%" style="background-color:#fffbeb;border-radius:12px;padding:20px;margin-bottom:25px;border:1px solid #fde68a;">
                <tr>
                  <td>
                    <p style="margin:0 0 10px 0;color:#92400e;font-size:14px;font-weight:bold;">قيمة الصندوق الذهبي</p>
                    <p style="margin:0;color:#d97706;font-size:32px;font-weight:bold;">{{goldenBoxEgp}} ج.م 🎁</p>
                  </td>
                </tr>
              </table>
              <p style="color:#64748b;font-size:14px;line-height:1.8;margin:0 0 25px 0;">
                افتح الصندوق دلوقتي قبل ما تنتهي صلاحيته خلال {{expiryDays}} أيام.
              </p>
              <a href="{{rewardsUrl}}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:#ffffff;text-decoration:none;padding:14px 35px;border-radius:10px;font-weight:bold;font-size:16px;">
                افتح صندوقك الذهبي
              </a>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;padding:25px 30px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">إنجزنا — منصة احتياجات البيت اليومية</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["userName","goldenBoxEgp","expiryDays","rewardsUrl"]'::jsonb,
  'customer',
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  available_variables = EXCLUDED.available_variables,
  category = EXCLUDED.category;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 2. gift-loyalty-tier-up                                                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category, is_active)
VALUES (
  'gift-loyalty-tier-up',
  'ترقية مستوى الولاء',
  'يُرسل عند ترقية العميل لمستوى ولاء أعلى (silver / gold / platinum)',
  '🏆 وصلت للمستوى {{newTierAr}} — ترقية جديدة في إنجزنا',
  '<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ترقية مستوى الولاء</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,''Segoe UI'',Tahoma,Arial,sans-serif;background-color:#f5f5f5;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%);padding:30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:bold;">إنجزنا</h1>
              <p style="color:rgba(255,255,255,0.9);margin:10px 0 0 0;font-size:14px;">ترقية مستوى الولاء 🏆</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 30px;">
              <h2 style="color:#0F172A;margin:0 0 20px 0;font-size:22px;">مبروك يا {{userName}}! ✨</h2>
              <p style="color:#64748b;font-size:16px;line-height:1.8;margin:0 0 25px 0;">
                وصلت لمستوى ولاء جديد. مكافآتك زادت ومميزاتك توسّعت.
              </p>
              <table width="100%" style="background-color:#faf5ff;border-radius:12px;padding:25px;margin-bottom:25px;border:1px solid #e9d5ff;text-align:center;">
                <tr>
                  <td>
                    <p style="margin:0 0 8px 0;color:#7c3aed;font-size:14px;font-weight:bold;">المستوى الجديد</p>
                    <p style="margin:0 0 15px 0;color:#5b21b6;font-size:32px;font-weight:bold;">{{newTierAr}} 🏆</p>
                    <p style="margin:0;color:#7c3aed;font-size:14px;">رصيد نقاط الولاء: <strong>{{pointsBalance}} نقطة</strong></p>
                  </td>
                </tr>
              </table>
              <p style="color:#64748b;font-size:14px;line-height:1.8;margin:0 0 25px 0;">
                نقاط الولاء قابلة للاستبدال على طلباتك القادمة. كل {{pointsPerEgp}} نقطة = جنيه خصم.
              </p>
              <a href="{{rewardsUrl}}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%);color:#ffffff;text-decoration:none;padding:14px 35px;border-radius:10px;font-weight:bold;font-size:16px;">
                شاهد مكافآتك
              </a>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;padding:25px 30px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">إنجزنا — منصة احتياجات البيت اليومية</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["userName","newTierAr","pointsBalance","pointsPerEgp","rewardsUrl"]'::jsonb,
  'customer',
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  available_variables = EXCLUDED.available_variables,
  category = EXCLUDED.category;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 3. gift-referral-reward                                                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

INSERT INTO email_templates (slug, name, description, subject, html_content, available_variables, category, is_active)
VALUES (
  'gift-referral-reward',
  'مكافأة إحالة ناجحة',
  'يُرسل للمُحيل عندما يكمل صديقه أول طلب مؤهَّل (حسب §13.1 من الخطة)',
  '🎉 مكافأة إحالتك وصلت — {{rewardEgp}} ج.م في صندوقك',
  '<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>مكافأة الإحالة</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,''Segoe UI'',Tahoma,Arial,sans-serif;background-color:#f5f5f5;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:bold;">إنجزنا</h1>
              <p style="color:rgba(255,255,255,0.9);margin:10px 0 0 0;font-size:14px;">إحالتك نجحت 🎉</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 30px;">
              <h2 style="color:#0F172A;margin:0 0 20px 0;font-size:22px;">شكرًا يا {{userName}}! 🤝</h2>
              <p style="color:#64748b;font-size:16px;line-height:1.8;margin:0 0 25px 0;">
                صاحبك <strong>{{refereeName}}</strong> أتمّ أول طلب على إنجزنا. مكافأتك جاهزة في صندوق الهدايا.
              </p>
              <table width="100%" style="background-color:#ecfdf5;border-radius:12px;padding:25px;margin-bottom:25px;border:1px solid #a7f3d0;text-align:center;">
                <tr>
                  <td>
                    <p style="margin:0 0 8px 0;color:#059669;font-size:14px;font-weight:bold;">قيمة المكافأة</p>
                    <p style="margin:0;color:#10b981;font-size:36px;font-weight:bold;">{{rewardEgp}} ج.م</p>
                  </td>
                </tr>
              </table>
              <p style="color:#64748b;font-size:14px;line-height:1.8;margin:0 0 25px 0;">
                المكافأة صالحة لمدة {{expiryDays}} أيام، استخدمها على طلبك الجاي بقيمة {{minOrderEgp}} ج.م أو أكثر.
              </p>
              <a href="{{rewardsUrl}}" style="display:inline-block;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#ffffff;text-decoration:none;padding:14px 35px;border-radius:10px;font-weight:bold;font-size:16px;">
                افتح صندوق الهدايا
              </a>
              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:25px 0 0 0;text-align:center;">
                💡 شارك رابط إحالتك مع أصحاب جداد واكسب المزيد!
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;padding:25px 30px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">إنجزنا — منصة احتياجات البيت اليومية</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["userName","refereeName","rewardEgp","expiryDays","minOrderEgp","rewardsUrl"]'::jsonb,
  'customer',
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  available_variables = EXCLUDED.available_variables,
  category = EXCLUDED.category;
