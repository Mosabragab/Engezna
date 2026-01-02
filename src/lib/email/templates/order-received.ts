export interface OrderReceivedData {
  to: string
  merchantName: string
  storeName: string
  orderId: string
  orderNumber: string
  customerName: string
  itemsCount: number
  totalAmount: number
  deliveryAddress: string
  orderUrl: string
}

export function orderReceivedTemplate(data: OrderReceivedData): string {
  const formattedAmount = new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
  }).format(data.totalAmount)

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>طلب جديد #${data.orderNumber} - إنجزنا</title>
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
                                <h1 style="color: #ffffff; font-size: 36px; font-weight: 700; margin: 0; font-family: -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif;">إنجزنا</h1>
                            </a>
                            <p style="color: rgba(255,255,255,0.95); margin: 16px 0 0 0; font-size: 15px; font-weight: 500;">بوابة الشركاء</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 28px; text-align: center; background-color: #ffffff;">
                            <!-- Icon -->
                            <div style="display: inline-block; width: 72px; height: 72px; background-color: #DCFCE7; border-radius: 50%; line-height: 72px; font-size: 32px; margin-bottom: 24px;">🔔</div>

                            <h2 style="color: #0F172A; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.4;">طلب جديد! 🎉</h2>
                            <p style="color: #475569; font-size: 15px; line-height: 1.75; margin: 0 0 24px 0;">
                                مرحباً ${data.merchantName}، لديك طلب جديد في متجر "${data.storeName}"
                            </p>

                            <!-- Order Info -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F0FDF4; border-radius: 12px; margin-bottom: 24px; border-right: 4px solid #22C55E;">
                                <tr>
                                    <td style="padding: 20px; text-align: right;">
                                        <p style="margin: 0 0 12px 0; font-size: 18px; color: #166534; font-weight: 700;">
                                            طلب #${data.orderNumber}
                                        </p>
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding: 4px 0; font-size: 14px; color: #475569;">
                                                    <strong>العميل:</strong> ${data.customerName}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 4px 0; font-size: 14px; color: #475569;">
                                                    <strong>عدد الأصناف:</strong> ${data.itemsCount} صنف
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 4px 0; font-size: 14px; color: #475569;">
                                                    <strong>الإجمالي:</strong> <span style="color: #166534; font-weight: 700;">${formattedAmount}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Delivery Address -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: right;">
                                        <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748B; font-weight: 600;">
                                            📍 عنوان التوصيل
                                        </p>
                                        <p style="margin: 0; font-size: 14px; color: #0F172A; line-height: 1.6;">
                                            ${data.deliveryAddress}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Button -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="${data.orderUrl}" style="display: inline-block; background-color: #22C55E; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 16px;">عرض تفاصيل الطلب ←</a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Urgent Notice -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FEF3C7; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px; text-align: center;">
                                        <p style="margin: 0; font-size: 14px; color: #92400E; font-weight: 600;">
                                            ⏰ يرجى قبول الطلب وبدء التجهيز في أسرع وقت
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Divider -->
                            <div style="height: 1px; background-color: #E2E8F0; margin: 24px 0;"></div>

                            <!-- Help -->
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
                                <p style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; font-family: -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif;">إنجزنا</p>
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
</html>`
}
