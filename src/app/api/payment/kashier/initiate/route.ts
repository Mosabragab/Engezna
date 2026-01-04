import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildKashierCheckoutUrl, kashierConfig } from '@/lib/payment/kashier'

export async function POST(request: NextRequest) {
  try {
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
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        provider:providers(name_ar, name_en)
      `)
      .eq('id', orderId)
      .eq('customer_id', user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify order is pending and payment method is online
    if (order.payment_method !== 'online') {
      return NextResponse.json(
        { error: 'Order payment method is not online' },
        { status: 400 }
      )
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Order is already paid' },
        { status: 400 }
      )
    }

    // Get customer profile for name and email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .single()

    // Build site URL for redirects
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.engezna.com'
    const locale = 'ar' // Default to Arabic

    // Generate Kashier checkout URL
    const checkoutUrl = buildKashierCheckoutUrl({
      orderId: order.id,
      amount: order.total,
      customerName: profile?.full_name || undefined,
      customerEmail: user.email || undefined,
      customerPhone: profile?.phone || undefined,
      description: `Order from ${order.provider?.name_ar || 'Engezna'}`,
      redirectUrl: `${siteUrl}/${locale}/orders/${order.id}/payment-result`,
      webhookUrl: `${siteUrl}/api/payment/kashier/webhook`,
      language: 'ar',
    })

    // Update order with payment initiation timestamp
    await supabase
      .from('orders')
      .update({
        payment_initiated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    return NextResponse.json({
      success: true,
      checkoutUrl,
      orderId: order.id,
      amount: order.total,
      currency: kashierConfig.currency,
    })
  } catch (error) {
    console.error('Payment initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    )
  }
}
