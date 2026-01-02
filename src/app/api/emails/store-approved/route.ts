import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendStoreApprovedEmail } from '@/lib/email/resend'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify the request is from an authenticated admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { storeId } = body

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 })
    }

    // Get store data
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, slug, owner_id')
      .eq('id', storeId)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // Get merchant profile separately
    const { data: merchantProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', store.owner_id)
      .single()

    if (profileError || !merchantProfile) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    if (!merchantProfile.email) {
      return NextResponse.json({ error: 'Merchant has no email' }, { status: 400 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.engezna.com'

    // Send store approved email
    const result = await sendStoreApprovedEmail({
      to: merchantProfile.email,
      merchantName: merchantProfile.full_name || 'التاجر',
      storeName: store.name,
      storeUrl: `${siteUrl}/ar/store/${store.slug}`,
      dashboardUrl: `${siteUrl}/ar/provider/dashboard`,
    })

    if (!result.success) {
      console.error('Failed to send store approved email:', result.error)
      return NextResponse.json({ error: 'Failed to send email', details: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Store approved email sent successfully' })
  } catch (error) {
    console.error('Error in store-approved API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
