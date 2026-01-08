import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildKashierCheckoutUrl, kashierConfig } from '@/lib/payment/kashier'
import crypto from 'crypto'

/**
 * Payment Initiation API
 *
 * CRITICAL: This API does NOT create orders in the database!
 * Orders are only created after successful payment confirmation.
 *
 * Flow:
 * 1. Receive order data from checkout
 * 2. Generate temporary payment reference
 * 3. Return Kashier checkout URL
 * 4. Order created by payment-result page on success
 */
export async function POST(request: NextRequest) {
  try {
    // Validate Kashier configuration
    if (!kashierConfig.merchantId || !kashierConfig.apiKey || !kashierConfig.secretKey) {
      console.error('Kashier configuration missing:', {
        hasMerchantId: !!kashierConfig.merchantId,
        hasApiKey: !!kashierConfig.apiKey,
        hasSecretKey: !!kashierConfig.secretKey,
      })
      return NextResponse.json(
        { error: 'Payment gateway not configured. Please contact support.' },
        { status: 500 }
      )
    }

    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { orderData } = body

    // Validate order data
    if (!orderData) {
      return NextResponse.json(
        { error: 'Order data is required' },
        { status: 400 }
      )
    }

    if (!orderData.provider_id || !orderData.total || !orderData.cart_items?.length) {
      return NextResponse.json(
        { error: 'Invalid order data: missing required fields' },
        { status: 400 }
      )
    }

    // Verify the user matches the order data
    if (orderData.customer_id !== user.id) {
      return NextResponse.json(
        { error: 'Customer ID mismatch' },
        { status: 403 }
      )
    }

    // Generate a unique temporary payment reference
    // Format: temp_YYYYMMDD_HHMMSS_randomhex
    const now = new Date()
    const dateStr = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
    const randomHex = crypto.randomBytes(4).toString('hex')
    const paymentRef = `temp_${dateStr}_${randomHex}`

    // Get customer profile for payment form
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .single()

    // Build site URL for redirects
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.engezna.com'
    const locale = 'ar' // Default to Arabic

    // Generate Kashier checkout URL
    // IMPORTANT: Using paymentRef as orderId since we don't have a DB order yet
    const checkoutUrl = buildKashierCheckoutUrl({
      orderId: paymentRef,
      amount: orderData.total,
      customerName: profile?.full_name || undefined,
      customerEmail: user.email || undefined,
      customerPhone: profile?.phone || undefined,
      description: `Order from ${orderData.provider_name || 'Engezna'}`,
      // Redirect to payment-result with the payment reference
      redirectUrl: `${siteUrl}/${locale}/payment-result?ref=${paymentRef}`,
      webhookUrl: `${siteUrl}/api/payment/kashier/webhook`,
      language: 'ar',
    })

    // NO DATABASE INSERTION HERE!
    // Order will be created by payment-result page after successful payment

    return NextResponse.json({
      success: true,
      checkoutUrl,
      paymentRef,
      amount: orderData.total,
      currency: kashierConfig.currency,
    })
  } catch (error) {
    console.error('Payment initiation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to initiate payment: ${errorMessage}` },
      { status: 500 }
    )
  }
}
