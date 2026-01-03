import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

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
const FROM_EMAIL = 'Engezna <noreply@engezna.com>'

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

interface EmailTemplate {
  slug: string
  subject: string
  html_content: string
  is_active: boolean
}

// ============================================================================
// Database Template Fetching
// ============================================================================

/**
 * Get Supabase client for fetching templates
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseKey)
}

/**
 * Fetch email template from database by slug
 */
async function getTemplateFromDB(slug: string): Promise<EmailTemplate | null> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      console.warn('Supabase client not available, using code templates')
      return null
    }

    const { data, error } = await supabase
      .from('email_templates')
      .select('slug, subject, html_content, is_active')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      console.warn(`Template "${slug}" not found in DB, using code template`)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching template from DB:', error)
    return null
  }
}

/**
 * Replace {{variables}} in template with actual values
 */
function replaceVariables(template: string, variables: Record<string, string | number>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(regex, String(value))
  }
  return result
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
  // Try to get template from database first
  const dbTemplate = await getTemplateFromDB('merchant-welcome')

  if (dbTemplate) {
    const variables = {
      merchantName: data.merchantName,
      storeName: data.storeName,
      dashboardUrl: data.dashboardUrl,
    }

    return sendEmail({
      to: data.to,
      subject: replaceVariables(dbTemplate.subject, variables),
      html: replaceVariables(dbTemplate.html_content, variables),
    })
  }

  // Fallback to code template
  const { merchantWelcomeTemplate } = await import('./templates/merchant-welcome')

  return sendEmail({
    to: data.to,
    subject: 'أهلاً بك في إنجزنا - حسابك جاهز',
    html: merchantWelcomeTemplate(data),
  })
}

/**
 * Send store approval notification to merchant
 */
export async function sendStoreApprovedEmail(data: StoreApprovedData) {
  const dbTemplate = await getTemplateFromDB('store-approved')

  if (dbTemplate) {
    const variables = {
      merchantName: data.merchantName,
      storeName: data.storeName,
      storeUrl: data.storeUrl,
      dashboardUrl: data.dashboardUrl,
    }

    return sendEmail({
      to: data.to,
      subject: replaceVariables(dbTemplate.subject, variables),
      html: replaceVariables(dbTemplate.html_content, variables),
    })
  }

  const { storeApprovedTemplate } = await import('./templates/store-approved')

  return sendEmail({
    to: data.to,
    subject: `تهانينا - متجرك "${data.storeName}" أصبح جاهزاً`,
    html: storeApprovedTemplate(data),
  })
}

/**
 * Send settlement notification to merchant
 */
export async function sendSettlementEmail(data: SettlementData) {
  const formattedAmount = new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
  }).format(data.amount)

  const formattedDate = new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(data.settlementDate))

  const dbTemplate = await getTemplateFromDB('settlement')

  if (dbTemplate) {
    const variables = {
      merchantName: data.merchantName,
      storeName: data.storeName,
      formattedAmount,
      settlementId: data.settlementId,
      formattedDate,
      ordersCount: data.ordersCount,
      period: data.period,
      dashboardUrl: data.dashboardUrl,
    }

    return sendEmail({
      to: data.to,
      subject: replaceVariables(dbTemplate.subject, variables),
      html: replaceVariables(dbTemplate.html_content, variables),
    })
  }

  const { settlementTemplate } = await import('./templates/settlement')

  return sendEmail({
    to: data.to,
    subject: `تسوية جديدة: ${formattedAmount}`,
    html: settlementTemplate(data),
  })
}

/**
 * Send store rejection notification to merchant
 */
export async function sendStoreRejectionEmail(data: {
  to: string
  merchantName: string
  storeName: string
  rejectionReason: string
  supportUrl: string
}) {
  const dbTemplate = await getTemplateFromDB('store-rejection')

  if (dbTemplate) {
    const variables = {
      merchantName: data.merchantName,
      storeName: data.storeName,
      rejectionReason: data.rejectionReason,
      supportUrl: data.supportUrl,
    }

    return sendEmail({
      to: data.to,
      subject: replaceVariables(dbTemplate.subject, variables),
      html: replaceVariables(dbTemplate.html_content, variables),
    })
  }

  const { storeRejectionTemplate } = await import('./templates/store-rejection')

  return sendEmail({
    to: data.to,
    subject: 'تحديث حالة طلب متجرك - إنجزنا',
    html: storeRejectionTemplate(data),
  })
}

/**
 * Send order received notification to merchant
 */
export async function sendOrderReceivedEmail(data: {
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
}) {
  const formattedAmount = new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
  }).format(data.totalAmount)

  const dbTemplate = await getTemplateFromDB('order-received')

  if (dbTemplate) {
    const variables = {
      merchantName: data.merchantName,
      storeName: data.storeName,
      orderNumber: data.orderNumber,
      customerName: data.customerName,
      itemsCount: data.itemsCount,
      formattedAmount,
      deliveryAddress: data.deliveryAddress,
      orderUrl: data.orderUrl,
    }

    return sendEmail({
      to: data.to,
      subject: replaceVariables(dbTemplate.subject, variables),
      html: replaceVariables(dbTemplate.html_content, variables),
    })
  }

  const { orderReceivedTemplate } = await import('./templates/order-received')

  return sendEmail({
    to: data.to,
    subject: `طلب جديد #${data.orderNumber} - إنجزنا`,
    html: orderReceivedTemplate(data),
  })
}

/**
 * Send staff invitation email
 */
export async function sendStaffInvitationEmail(data: {
  to: string
  staffName: string
  storeName: string
  merchantName: string
  role: string
  inviteUrl: string
}) {
  const roleNames: Record<string, string> = {
    manager: 'مدير المتجر',
    cashier: 'كاشير',
    kitchen: 'مطبخ',
    staff: 'موظف',
  }

  const roleName = roleNames[data.role] || data.role

  const dbTemplate = await getTemplateFromDB('staff-invitation')

  if (dbTemplate) {
    const variables = {
      staffName: data.staffName,
      merchantName: data.merchantName,
      storeName: data.storeName,
      roleName,
      email: data.to,
      inviteUrl: data.inviteUrl,
    }

    return sendEmail({
      to: data.to,
      subject: replaceVariables(dbTemplate.subject, variables),
      html: replaceVariables(dbTemplate.html_content, variables),
    })
  }

  const { staffInvitationTemplate } = await import('./templates/staff-invitation')

  return sendEmail({
    to: data.to,
    subject: `دعوة للانضمام لفريق ${data.storeName} - إنجزنا`,
    html: staffInvitationTemplate(data),
  })
}

/**
 * Send store suspended notification to merchant
 */
export async function sendStoreSuspendedEmail(data: {
  to: string
  merchantName: string
  storeName: string
  suspensionReason: string
  suspensionDate: string
  supportUrl: string
}) {
  const formattedDate = new Date(data.suspensionDate).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const dbTemplate = await getTemplateFromDB('store-suspended')

  if (dbTemplate) {
    const variables = {
      merchantName: data.merchantName,
      storeName: data.storeName,
      formattedDate,
      suspensionReason: data.suspensionReason,
      supportUrl: data.supportUrl,
    }

    return sendEmail({
      to: data.to,
      subject: replaceVariables(dbTemplate.subject, variables),
      html: replaceVariables(dbTemplate.html_content, variables),
    })
  }

  const { storeSuspendedTemplate } = await import('./templates/store-suspended')

  return sendEmail({
    to: data.to,
    subject: 'إشعار مهم - إيقاف المتجر مؤقتاً - إنجزنا',
    html: storeSuspendedTemplate(data),
  })
}

// ============================================================================
// Export getter for advanced use cases
// ============================================================================

export { getResendClient }
