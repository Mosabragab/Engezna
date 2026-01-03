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
const FROM_EMAIL = 'إنجزنا <noreply@engezna.com>'
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
  userName: string
  browseUrl: string
  supportUrl?: string
}

export interface CustomerRefundInitiatedData {
  to: string
  userName: string
  orderNumber: string
  refundAmount: number
  refundReason: string
  trackUrl: string
}

export interface CustomerRefundCompletedData {
  to: string
  userName: string
  orderNumber: string
  refundAmount: number
  refundMethod: string
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

export interface AdminDailyReportData {
  to: string | string[]
  reportDate: string
  totalOrders: number
  totalRevenue: number
  newCustomers: number
  newStores: number
  cancelledOrders: number
  refundRequests: number
  avgOrderValue: number
  dashboardUrl: string
}

export interface AdminEscalationAlertData {
  to: string | string[]
  alertType: string
  alertDetails: string
  priority: string
  actionUrl: string
}

// ============================================================================
// Merchant Additional Email Data Types
// ============================================================================

export interface MerchantOrderCancelledData {
  to: string
  storeName: string
  orderNumber: string
  cancellationReason: string
  cancelledBy: string
  dashboardUrl: string
}

export interface MerchantLowRatingAlertData {
  to: string
  storeName: string
  rating: number
  reviewComment: string
  reviewsUrl: string
}

export interface MerchantNewReviewData {
  to: string
  storeName: string
  rating: number
  customerName: string
  reviewComment: string
  reviewsUrl: string
}

export interface MerchantStoreReactivatedData {
  to: string
  storeName: string
  dashboardUrl: string
}

// ============================================================================
// Support Email Data Types
// ============================================================================

export interface TicketCreatedData {
  to: string
  userName: string
  ticketNumber: string
  ticketSubject: string
  ticketUrl: string
}

export interface TicketRepliedData {
  to: string
  userName: string
  ticketNumber: string
  agentName: string
  replyPreview: string
  ticketUrl: string
}

export interface TicketResolvedData {
  to: string
  userName: string
  ticketNumber: string
  ticketUrl: string
  feedbackUrl: string
}

export interface DisputeOpenedData {
  to: string
  userName: string
  orderNumber: string
  disputeType: string
  disputeDescription: string
  disputeUrl: string
}

export interface DisputeResolvedData {
  to: string
  userName: string
  orderNumber: string
  resolution: string
  resolutionDetails: string
  disputeUrl: string
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
      console.error('[getTemplateFromDB] Supabase client not available - check SUPABASE_SERVICE_ROLE_KEY env var')
      return null
    }

    console.log(`[getTemplateFromDB] Querying template: ${slug}`)
    const { data, error } = await supabase
      .from('email_templates')
      .select('slug, subject, html_content, is_active')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error(`[getTemplateFromDB] Query error for "${slug}":`, error.message)
      return null
    }

    if (!data) {
      console.warn(`[getTemplateFromDB] Template "${slug}" not found in DB or is inactive`)
      return null
    }

    console.log(`[getTemplateFromDB] Template "${slug}" found successfully`)
    return data
  } catch (error) {
    console.error('[getTemplateFromDB] Error:', error)
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
  console.log(`[sendTemplateEmail] Fetching template: ${slug}`)
  const dbTemplate = await getTemplateFromDB(slug)

  if (!dbTemplate) {
    console.error(`[sendTemplateEmail] Template "${slug}" not available, email not sent`)
    return { success: false, error: `Template "${slug}" not found or inactive` }
  }

  console.log(`[sendTemplateEmail] Template found, sending email to: ${to}`)
  const result = await sendEmail({
    to,
    subject: replaceVariables(dbTemplate.subject, variables),
    html: replaceVariables(dbTemplate.html_content, variables),
  })
  console.log(`[sendTemplateEmail] Email send result:`, result)
  return result
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
    // Template uses {{customerName}} - map from userName for consistency
    customerName: data.userName,
    userName: data.userName,
    browseUrl: data.browseUrl,
    supportUrl: data.supportUrl || data.browseUrl + '/support',
  }

  return sendTemplateEmail(
    'customer-welcome',
    data.to,
    variables,
    'أهلاً بك في إنجزنا! 🎉'
  )
}

/**
 * Send refund initiated notification to customer
 */
export async function sendCustomerRefundInitiatedEmail(data: CustomerRefundInitiatedData): Promise<SendEmailResult> {
  const formattedAmount = formatCurrency(data.refundAmount)

  const variables = {
    userName: data.userName,
    orderNumber: data.orderNumber,
    refundAmount: formattedAmount,
    refundReason: data.refundReason,
    trackUrl: data.trackUrl,
  }

  return sendTemplateEmail(
    'customer-refund-initiated',
    data.to,
    variables,
    `تم استلام طلب الاسترداد - طلب #${data.orderNumber}`
  )
}

/**
 * Send refund completed notification to customer
 */
export async function sendCustomerRefundCompletedEmail(data: CustomerRefundCompletedData): Promise<SendEmailResult> {
  const formattedAmount = formatCurrency(data.refundAmount)

  const variables = {
    userName: data.userName,
    orderNumber: data.orderNumber,
    refundAmount: formattedAmount,
    refundMethod: data.refundMethod,
  }

  return sendTemplateEmail(
    'customer-refund-completed',
    data.to,
    variables,
    `تم استرداد المبلغ بنجاح - طلب #${data.orderNumber}`
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

/**
 * Send daily report to admin
 */
export async function sendAdminDailyReportEmail(data: AdminDailyReportData): Promise<SendEmailResult> {
  const formattedRevenue = formatCurrency(data.totalRevenue)
  const formattedAvgOrder = formatCurrency(data.avgOrderValue)

  const variables = {
    reportDate: data.reportDate,
    totalOrders: data.totalOrders,
    totalRevenue: formattedRevenue,
    newCustomers: data.newCustomers,
    newStores: data.newStores,
    cancelledOrders: data.cancelledOrders,
    refundRequests: data.refundRequests,
    avgOrderValue: formattedAvgOrder,
    dashboardUrl: data.dashboardUrl,
  }

  return sendTemplateEmail(
    'admin-daily-report',
    data.to,
    variables,
    `📊 التقرير اليومي - ${data.reportDate}`
  )
}

/**
 * Send escalation alert to admin
 */
export async function sendAdminEscalationAlertEmail(data: AdminEscalationAlertData): Promise<SendEmailResult> {
  const variables = {
    alertType: data.alertType,
    alertDetails: data.alertDetails,
    priority: data.priority,
    actionUrl: data.actionUrl,
  }

  return sendTemplateEmail(
    'admin-escalation-alert',
    data.to,
    variables,
    `🚨 تنبيه عاجل: ${data.alertType}`
  )
}

// ============================================================================
// Merchant Additional Email Functions
// ============================================================================

/**
 * Send order cancelled notification to merchant
 */
export async function sendMerchantOrderCancelledEmail(data: MerchantOrderCancelledData): Promise<SendEmailResult> {
  const variables = {
    storeName: data.storeName,
    orderNumber: data.orderNumber,
    cancellationReason: data.cancellationReason,
    cancelledBy: data.cancelledBy,
    dashboardUrl: data.dashboardUrl,
  }

  return sendTemplateEmail(
    'merchant-order-cancelled',
    data.to,
    variables,
    `تم إلغاء الطلب #${data.orderNumber}`
  )
}

/**
 * Send low rating alert to merchant
 */
export async function sendMerchantLowRatingAlertEmail(data: MerchantLowRatingAlertData): Promise<SendEmailResult> {
  const variables = {
    storeName: data.storeName,
    rating: data.rating,
    reviewComment: data.reviewComment,
    reviewsUrl: data.reviewsUrl,
  }

  return sendTemplateEmail(
    'merchant-low-rating-alert',
    data.to,
    variables,
    '⚠️ تنبيه: تقييم جديد منخفض لمتجرك'
  )
}

/**
 * Send new review notification to merchant
 */
export async function sendMerchantNewReviewEmail(data: MerchantNewReviewData): Promise<SendEmailResult> {
  const variables = {
    storeName: data.storeName,
    rating: data.rating,
    customerName: data.customerName,
    reviewComment: data.reviewComment,
    reviewsUrl: data.reviewsUrl,
  }

  return sendTemplateEmail(
    'merchant-new-review',
    data.to,
    variables,
    `⭐ تقييم جديد لمتجرك ${data.storeName}`
  )
}

/**
 * Send store reactivated notification to merchant
 */
export async function sendMerchantStoreReactivatedEmail(data: MerchantStoreReactivatedData): Promise<SendEmailResult> {
  const variables = {
    storeName: data.storeName,
    dashboardUrl: data.dashboardUrl,
  }

  return sendTemplateEmail(
    'merchant-store-reactivated',
    data.to,
    variables,
    '🎉 تم إعادة تفعيل متجرك على إنجزنا!'
  )
}

// ============================================================================
// Support Email Functions
// ============================================================================

/**
 * Send ticket created confirmation to user
 */
export async function sendTicketCreatedEmail(data: TicketCreatedData): Promise<SendEmailResult> {
  const variables = {
    userName: data.userName,
    ticketNumber: data.ticketNumber,
    ticketSubject: data.ticketSubject,
    ticketUrl: data.ticketUrl,
  }

  return sendTemplateEmail(
    'ticket-created',
    data.to,
    variables,
    `تم استلام طلب الدعم #${data.ticketNumber}`
  )
}

/**
 * Send ticket reply notification to user
 */
export async function sendTicketRepliedEmail(data: TicketRepliedData): Promise<SendEmailResult> {
  const variables = {
    userName: data.userName,
    ticketNumber: data.ticketNumber,
    agentName: data.agentName,
    replyPreview: data.replyPreview,
    ticketUrl: data.ticketUrl,
  }

  return sendTemplateEmail(
    'ticket-replied',
    data.to,
    variables,
    `رد جديد على طلب الدعم #${data.ticketNumber}`
  )
}

/**
 * Send ticket resolved notification to user
 */
export async function sendTicketResolvedEmail(data: TicketResolvedData): Promise<SendEmailResult> {
  const variables = {
    userName: data.userName,
    ticketNumber: data.ticketNumber,
    ticketUrl: data.ticketUrl,
    feedbackUrl: data.feedbackUrl,
  }

  return sendTemplateEmail(
    'ticket-resolved',
    data.to,
    variables,
    `✓ تم حل طلب الدعم #${data.ticketNumber}`
  )
}

/**
 * Send dispute opened notification
 */
export async function sendDisputeOpenedEmail(data: DisputeOpenedData): Promise<SendEmailResult> {
  const variables = {
    userName: data.userName,
    orderNumber: data.orderNumber,
    disputeType: data.disputeType,
    disputeDescription: data.disputeDescription,
    disputeUrl: data.disputeUrl,
  }

  return sendTemplateEmail(
    'dispute-opened',
    data.to,
    variables,
    `تم فتح نزاع جديد - الطلب #${data.orderNumber}`
  )
}

/**
 * Send dispute resolved notification
 */
export async function sendDisputeResolvedEmail(data: DisputeResolvedData): Promise<SendEmailResult> {
  const variables = {
    userName: data.userName,
    orderNumber: data.orderNumber,
    resolution: data.resolution,
    resolutionDetails: data.resolutionDetails,
    disputeUrl: data.disputeUrl,
  }

  return sendTemplateEmail(
    'dispute-resolved',
    data.to,
    variables,
    `✓ تم حل النزاع - الطلب #${data.orderNumber}`
  )
}

// ============================================================================
// Export getter for advanced use cases
// ============================================================================

export { getResendClient, getTemplateFromDB, replaceVariables, formatCurrency, formatDate }
