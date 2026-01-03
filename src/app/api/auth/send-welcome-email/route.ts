import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendCustomerWelcomeEmail } from '@/lib/email/resend'

// Create Supabase admin client with service role key
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name, welcome_email_sent')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check if welcome email was already sent
    if (profile.welcome_email_sent) {
      return NextResponse.json({ success: true, message: 'Welcome email already sent' })
    }

    // Get site URL for links
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.engezna.com'

    // Send welcome email
    const firstName = profile.full_name?.split(' ')[0] || 'عميلنا الكريم'
    const emailResult = await sendCustomerWelcomeEmail({
      to: profile.email,
      userName: firstName,
      browseUrl: `${siteUrl}/ar`,
      supportUrl: `${siteUrl}/ar/support`,
    })

    if (emailResult.success) {
      // Mark welcome email as sent
      await supabase
        .from('profiles')
        .update({ welcome_email_sent: true })
        .eq('id', userId)
    }

    return NextResponse.json({
      success: emailResult.success,
      message: emailResult.success ? 'Welcome email sent' : 'Failed to send welcome email',
    })

  } catch (error) {
    console.error('Send welcome email error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
