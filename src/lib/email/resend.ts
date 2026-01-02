import { Resend } from 'resend'

// Lazy initialization - only create client when needed (not at build time)
let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

// Email sender configuration
const FROM_EMAIL = 'إنجزنا | Engezna <noreply@engezna.com>'

// ============================================================================
// Types
// ============================================================================

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

export interface MerchantWelcomeData {
  to: string
  merchantName: string
  storeName: string
  dashboardUrl: string
}

export interface StoreApprovedData {
  to: string
  merchantName: string
  storeName: string
  storeUrl: string
  dashboardUrl: string
}

export interface SettlementData {
  to: string
  merchantName: string
  storeName: string
  amount: number
  settlementId: string
  settlementDate: string
  ordersCount: number
  period: string
  dashboardUrl: string
}

// ============================================================================
// Email Sending Function
// ============================================================================

export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions) {
  try {
    const resend = getResendClient()
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo: replyTo || 'support@engezna.com',
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' }
  }
}

// ============================================================================
// Merchant Email Functions
// ============================================================================

/**
 * Send welcome email to new merchant after registration
 */
export async function sendMerchantWelcomeEmail(data: MerchantWelcomeData) {
  const { merchantWelcomeTemplate } = await import('./templates/merchant-welcome')

  return sendEmail({
    to: data.to,
    subject: 'أهلاً بك في إنجزنا! 🎉 حسابك جاهز',
    html: merchantWelcomeTemplate(data),
  })
}

/**
 * Send store approval notification to merchant
 */
export async function sendStoreApprovedEmail(data: StoreApprovedData) {
  const { storeApprovedTemplate } = await import('./templates/store-approved')

  return sendEmail({
    to: data.to,
    subject: `تهانينا! 🎊 متجرك "${data.storeName}" أصبح جاهزاً`,
    html: storeApprovedTemplate(data),
  })
}

/**
 * Send settlement notification to merchant
 */
export async function sendSettlementEmail(data: SettlementData) {
  const { settlementTemplate } = await import('./templates/settlement')

  return sendEmail({
    to: data.to,
    subject: `💰 تسوية جديدة: ${data.amount.toLocaleString('ar-EG')} ج.م`,
    html: settlementTemplate(data),
  })
}

// ============================================================================
// Export getter for advanced use cases
// ============================================================================

export { getResendClient }
