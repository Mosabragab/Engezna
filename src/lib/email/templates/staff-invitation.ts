export interface StaffInvitationData {
  to: string;
  staffName: string;
  storeName: string;
  merchantName: string;
  role: string;
  inviteUrl: string;
}

export function staffInvitationTemplate(data: StaffInvitationData): string {
  const roleNames: Record<string, string> = {
    manager: 'مدير المتجر',
    cashier: 'كاشير',
    kitchen: 'مطبخ',
    staff: 'موظف',
  };

  const roleName = roleNames[data.role] || data.role;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>دعوة للانضمام لفريق ${data.storeName} - إنجزنا</title>
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
                                <img src="https://pub-d5c502abfebf4696b788ed0496257a40.r2.dev/engezna-transparent-white-transparent.png" alt="إنجزنا | Engezna" width="140" style="height: auto; display: block; margin: 0 auto;">
                            </a>
                            <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">بوابة الشركاء</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <!-- Icon -->
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #E0F4FF; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">👋</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">أنت مدعو للانضمام!</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                                مرحباً ${data.staffName}، قام ${data.merchantName} بدعوتك للانضمام لفريق العمل
                            </p>

                            <!-- Invitation Info -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F0F9FF; border-radius: 12px; margin-bottom: 24px; border-right: 4px solid #009DE0;">
                                <tr>
                                    <td style="padding: 20px; text-align: right;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #475569;">
                                                    <strong style="color: #0F172A;">🏪 المتجر:</strong> ${data.storeName}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #475569;">
                                                    <strong style="color: #0F172A;">👤 الدور:</strong> <span style="display: inline-block; background-color: #009DE0; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px;">${roleName}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; font-size: 14px; color: #475569;">
                                                    <strong style="color: #0F172A;">📧 الإيميل:</strong> ${data.to}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- What you can do -->
                            <div style="text-align: right; margin-bottom: 24px;">
                                <p style="color: #0F172A; font-size: 15px; font-weight: 600; margin: 0 0 12px 0;">بعد قبول الدعوة ستتمكن من:</p>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px;">
                                    <tr>
                                        <td style="padding: 16px 20px;">
                                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569; line-height: 1.7;">
                                                ✓ إدارة الطلبات الواردة
                                            </p>
                                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569; line-height: 1.7;">
                                                ✓ تحديث حالة الطلبات
                                            </p>
                                            <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.7;">
                                                ✓ الوصول للوحة تحكم المتجر
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Button -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="${data.inviteUrl}" style="display: inline-block; background-color: #009DE0; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">قبول الدعوة ←</a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Note -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF3C7; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: center;">
                                        <p style="margin: 0; font-size: 13px; color: #92400E;">
                                            ⚠️ هذه الدعوة صالحة لمدة 7 أيام فقط
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Divider -->
                            <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                            <!-- Help -->
                            <p style="font-size: 13px; color: #64748B; line-height: 1.7; margin: 0;">
                                لم تطلب هذه الدعوة؟ يمكنك تجاهل هذا الإيميل بأمان
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
</html>`;
}
