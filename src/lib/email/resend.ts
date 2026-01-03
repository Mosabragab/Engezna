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
const SUPPORT_EMAIL = 'support@engezna.com'

// ============================================================================
// Types
// ============================================================================

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

export interface SendEmailResult {
  success: boolean
  data?: { id: string }
  error?: string
}

interface EmailTemplate {
  slug: string
  subject: string
  html_content: string
  is_active: boolean
}

// ============================================================================
// Merchant Email Data Types
// ============================================================================

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

export interface StoreRejectionData {
  to: string
  merchantName: string
  storeName: string
  rejectionReason: string
  supportUrl: string
}

export interface OrderReceivedData {
  to: string
  merchantName: string
  storeName: string
  orderNumber: string
  customerName: string
  itemsCount: number
  totalAmount: number
  deliveryAddress: string
  orderUrl: string
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

export interface StaffInvitationData {
  to: string
  staffName: string
  storeName: string
  merchantName: string
  role: string
  inviteUrl: string
}

export interface StoreSuspendedData {
  to: string
  merchantName: string
  storeName: string
  suspensionReason: string
  suspensionDate: string
  supportUrl: string
}

// ============================================================================
// Customer Email Data Types
// ============================================================================

export interface CustomerOrderConfirmationData {
  to: string
  customerName: string
  orderNumber: string
  storeName: string
  itemsCount: number
  totalAmount: number
  paymentMethod: string
  deliveryAddress: string
  estimatedDelivery: string
  orderUrl: string
}

export interface CustomerOrderDeliveredData {
  to: string
  customerName: string
  orderNumber: string
  storeName: string
  deliveryTime: string
  reviewUrl: string
}

export interface CustomerOrderShippedData {
  to: string
  customerName: string
  orderNumber: string
  storeName: string
  driverName: string
  driverPhone: string
  estimatedArrival: string
  trackingUrl: string
}

export interface CustomerOrderCancelledData {
  to: string
  customerName: string
  orderNumber: string
  storeName: string
  cancellationReason: string
  refundMessage: string
  reorderUrl: string
}

export interface PasswordResetData {
  to: string
  userName: string
  resetUrl: string
  expiryTime: string
}

export interface EmailVerificationData {
  to: string
  userName: string
  verificationUrl: string
}

export interface CustomerWelcomeData {
  to: string
  customerName: string
  browseUrl: string
}

// ============================================================================
// Marketing Email Data Types
// ============================================================================

export interface PromotionalOfferData {
  to: string | string[]
  customerName: string
  offerTitle: string
  discountPercent: number
  couponCode: string
  expiryDate: string
  offerDescription: string
  shopUrl: string
  minimumOrder: string
  unsubscribeUrl: string
}

export interface AbandonedCartData {
  to: string
  customerName: string
  itemsCount: number
  storeName: string
  totalAmount: number
  cartUrl: string
  unsubscribeUrl: string
}

export interface ReviewRequestData {
  to: string
  customerName: string
  storeName: string
  orderNumber: string
  reviewUrl: string
}

// ============================================================================
// Admin Email Data Types
// ============================================================================

export interface AdminNewStoreApplicationData {
  to: string | string[]
  storeName: string
  merchantName: string
  merchantEmail: string
  merchantPhone: string
  city: string
  category: string
  submittedAt: string
  reviewUrl: string
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
 * Returns null if template not found or is_active = false
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
      console.warn(`Template "${slug}" not found in DB or is inactive`)
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

/**
 * Format currency in Egyptian Pounds
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
  }).format(amount)
}

/**
 * Format date in Arabic
 */
function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

// ============================================================================
// Email Sending Function
// ============================================================================

export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const resend = getResendClient()
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo: replyTo || SUPPORT_EMAIL,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data ? { id: data.id } : undefined }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' }
  }
}

/**
 * Generic function to send template-based email
 */
async function sendTemplateEmail(
  slug: string,
  to: string | string[],
  variables: Record<string, string | number>,
  fallbackSubject: string
): Promise<SendEmailResult> {
  const dbTemplate = await getTemplateFromDB(slug)

  if (!dbTemplate) {
    console.warn(`Template "${slug}" not available, email not sent`)
    return { success: false, error: `Template "${slug}" not found or inactive` }
  }

  return sendEmail({
    to,
    subject: replaceVariables(dbTemplate.subject, variables),
    html: replaceVariables(dbTemplate.html_content, variables),
  })
}

// ============================================================================
// Merchant Email Functions
// ============================================================================

/**
 * Send welcome email to new merchant after registration
 */
export async function sendMerchantWelcomeEmail(data: MerchantWelcomeData): Promise<SendEmailResult> {
  const variables = {
    merchantName: data.merchantName,
    storeName: data.storeName,
    dashboardUrl: data.dashboardUrl,
  }

  return sendTemplateEmail(
    'merchant-welcome',
    data.to,
    variables,
    'أهلاً بك في إنجزنا - حسابك جاهز'
  )
}

/**
 * Send store approval notification to merchant
 */
export async function sendStoreApprovedEmail(data: StoreApprovedData): Promise<SendEmailResult> {
  const variables = {
    merchantName: data.merchantName,
    storeName: data.storeName,
    storeUrl: data.storeUrl,
    dashboardUrl: data.dashboardUrl,
  }

  return sendTemplateEmail(
    'store-approved',
    data.to,
    variables,
    `تهانينا - متجرك "${data.storeName}" أصبح جاهزاً`
  )
}

/**
 * Send store rejection notification to merchant
 */
export async function sendStoreRejectionEmail(data: StoreRejectionData): Promise<SendEmailResult> {
  const variables = {
    merchantName: data.merchantName,
    storeName: data.storeName,
    rejectionReason: data.rejectionReason,
    supportUrl: data.supportUrl,
  }

  return sendTemplateEmail(
    'store-rejection',
    data.to,
    variables,
    'تحديث حالة طلب متجرك - إنجزنا'
  )
}

/**
 * Send order received notification to merchant
 */
export async function sendOrderReceivedEmail(data: OrderReceivedData): Promise<SendEmailResult> {
  const formattedAmount = formatCurrency(data.totalAmount)

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

  return sendTemplateEmail(
    'order-received',
    data.to,
    variables,
    `طلب جديد #${data.orderNumber} - إنجزنا`
  )
}

/**
 * Send settlement notification to merchant
 */
export async function sendSettlementEmail(data: SettlementData): Promise<SendEmailResult> {
  const formattedAmount = formatCurrency(data.amount)
  const formattedDate = formatDate(data.settlementDate)

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

  return sendTemplateEmail(
    'settlement',
    data.to,
    variables,
    `تسوية جديدة: ${formattedAmount}`
  )
}

/**
 * Send staff invitation email
 */
export async function sendStaffInvitationEmail(data: StaffInvitationData): Promise<SendEmailResult> {
  const roleNames: Record<string, string> = {
    manager: 'مدير المتجر',
    cashier: 'كاشير',
    kitchen: 'مطبخ',
    staff: 'موظف',
  }

  const roleName = roleNames[data.role] || data.role

  const variables = {
    staffName: data.staffName,
    merchantName: data.merchantName,
    storeName: data.storeName,
    roleName,
    email: data.to,
    inviteUrl: data.inviteUrl,
  }

  return sendTemplateEmail(
    'staff-invitation',
    data.to,
    variables,
    `دعوة للانضمام لفريق ${data.storeName} - إنجزنا`
  )
}

/**
 * Send store suspended notification to merchant
 */
export async function sendStoreSuspendedEmail(data: StoreSuspendedData): Promise<SendEmailResult> {
  const formattedDate = formatDate(data.suspensionDate)

  const variables = {
    merchantName: data.merchantName,
    storeName: data.storeName,
    formattedDate,
    suspensionReason: data.suspensionReason,
    supportUrl: data.supportUrl,
  }

  return sendTemplateEmail(
    'store-suspended',
    data.to,
    variables,
    'إشعار مهم - إيقاف المتجر مؤقتاً - إنجزنا'
  )
}

// ============================================================================
// Customer Email Functions
// ============================================================================

/**
 * Send order confirmation email to customer
 */
export async function sendCustomerOrderConfirmationEmail(data: CustomerOrderConfirmationData): Promise<SendEmailResult> {
  const formattedAmount = formatCurrency(data.totalAmount)

  const variables = {
    customerName: data.customerName,
    orderNumber: data.orderNumber,
    storeName: data.storeName,
    itemsCount: data.itemsCount,
    formattedAmount,
    paymentMethod: data.paymentMethod,
    deliveryAddress: data.deliveryAddress,
    estimatedDelivery: data.estimatedDelivery,
    orderUrl: data.orderUrl,
  }

  return sendTemplateEmail(
    'customer-order-confirmation',
    data.to,
    variables,
    `تم تأكيد طلبك #${data.orderNumber} - إنجزنا`
  )
}

/**
 * Send order delivered notification to customer
 */
export async function sendCustomerOrderDeliveredEmail(data: CustomerOrderDeliveredData): Promise<SendEmailResult> {
  const variables = {
    customerName: data.customerName,
    orderNumber: data.orderNumber,
    storeName: data.storeName,
    deliveryTime: data.deliveryTime,
    reviewUrl: data.reviewUrl,
  }

  return sendTemplateEmail(
    'customer-order-delivered',
    data.to,
    variables,
    `تم توصيل طلبك #${data.orderNumber} بنجاح! - إنجزنا`
  )
}

/**
 * Send order shipped / out for delivery notification to customer
 */
export async function sendCustomerOrderShippedEmail(data: CustomerOrderShippedData): Promise<SendEmailResult> {
  const variables = {
    customerName: data.customerName,
    orderNumber: data.orderNumber,
    storeName: data.storeName,
    driverName: data.driverName,
    driverPhone: data.driverPhone,
    estimatedArrival: data.estimatedArrival,
    trackingUrl: data.trackingUrl,
  }

  return sendTemplateEmail(
    'customer-order-shipped',
    data.to,
    variables,
    `طلبك #${data.orderNumber} في الطريق إليك! - إنجزنا`
  )
}

/**
 * Send order cancelled notification to customer
 */
export async function sendCustomerOrderCancelledEmail(data: CustomerOrderCancelledData): Promise<SendEmailResult> {
  const variables = {
    customerName: data.customerName,
    orderNumber: data.orderNumber,
    storeName: data.storeName,
    cancellationReason: data.cancellationReason,
    refundMessage: data.refundMessage,
    reorderUrl: data.reorderUrl,
  }

  return sendTemplateEmail(
    'customer-order-cancelled',
    data.to,
    variables,
    `تم إلغاء طلبك #${data.orderNumber} - إنجزنا`
  )
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(data: PasswordResetData): Promise<SendEmailResult> {
  const variables = {
    userName: data.userName,
    resetUrl: data.resetUrl,
    expiryTime: data.expiryTime,
  }

  return sendTemplateEmail(
    'password-reset',
    data.to,
    variables,
    'إعادة تعيين كلمة المرور - إنجزنا'
  )
}

/**
 * Send email verification email
 */
export async function sendEmailVerificationEmail(data: EmailVerificationData): Promise<SendEmailResult> {
  const variables = {
    userName: data.userName,
    verificationUrl: data.verificationUrl,
  }

  return sendTemplateEmail(
    'email-verification',
    data.to,
    variables,
    'تأكيد بريدك الإلكتروني - إنجزنا'
  )
}

/**
 * Send welcome email to new customer after email verification
 */
export async function sendCustomerWelcomeEmail(data: CustomerWelcomeData): Promise<SendEmailResult> {
  const variables = {
    customerName: data.customerName,
    browseUrl: data.browseUrl,
  }

  return sendTemplateEmail(
    'customer-welcome',
    data.to,
    variables,
    'أهلاً بك في إنجزنا! 🎉'
  )
}

// ============================================================================
// Marketing Email Functions
// ============================================================================

/**
 * Send promotional offer email
 */
export async function sendPromotionalOfferEmail(data: PromotionalOfferData): Promise<SendEmailResult> {
  const variables = {
    customerName: data.customerName,
    offerTitle: data.offerTitle,
    discountPercent: data.discountPercent,
    couponCode: data.couponCode,
    expiryDate: data.expiryDate,
    offerDescription: data.offerDescription,
    shopUrl: data.shopUrl,
    minimumOrder: data.minimumOrder,
    unsubscribeUrl: data.unsubscribeUrl,
  }

  return sendTemplateEmail(
    'promotional-offer',
    data.to,
    variables,
    `🎁 ${data.offerTitle} - خصم ${data.discountPercent}% لفترة محدودة!`
  )
}

/**
 * Send abandoned cart reminder email
 */
export async function sendAbandonedCartEmail(data: AbandonedCartData): Promise<SendEmailResult> {
  const formattedAmount = formatCurrency(data.totalAmount)

  const variables = {
    customerName: data.customerName,
    itemsCount: data.itemsCount,
    storeName: data.storeName,
    formattedAmount,
    cartUrl: data.cartUrl,
    unsubscribeUrl: data.unsubscribeUrl,
  }

  return sendTemplateEmail(
    'abandoned-cart',
    data.to,
    variables,
    'نسيت شيء؟ 🛒 سلتك في انتظارك!'
  )
}

/**
 * Send review request email after order delivery
 */
export async function sendReviewRequestEmail(data: ReviewRequestData): Promise<SendEmailResult> {
  const variables = {
    customerName: data.customerName,
    storeName: data.storeName,
    orderNumber: data.orderNumber,
    reviewUrl: data.reviewUrl,
  }

  return sendTemplateEmail(
    'review-request',
    data.to,
    variables,
    `كيف كانت تجربتك مع ${data.storeName}؟ ⭐`
  )
}

// ============================================================================
// Admin Email Functions
// ============================================================================

/**
 * Send notification to admin when new store application is submitted
 */
export async function sendAdminNewStoreApplicationEmail(data: AdminNewStoreApplicationData): Promise<SendEmailResult> {
  const variables = {
    storeName: data.storeName,
    merchantName: data.merchantName,
    merchantEmail: data.merchantEmail,
    merchantPhone: data.merchantPhone,
    city: data.city,
    category: data.category,
    submittedAt: data.submittedAt,
    reviewUrl: data.reviewUrl,
  }

  return sendTemplateEmail(
    'admin-new-store-application',
    data.to,
    variables,
    `🆕 طلب متجر جديد: ${data.storeName} - يحتاج مراجعة`
  )
}

// ============================================================================
// Export getter for advanced use cases
// ============================================================================

export { getResendClient, getTemplateFromDB, replaceVariables, formatCurrency, formatDate }
