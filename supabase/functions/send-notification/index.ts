import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Firebase project configuration
const FIREBASE_PROJECT_ID = 'engezna-6edd0'

interface NotificationPayload {
  user_id?: string
  user_ids?: string[]
  provider_id?: string
  topic?: string
  title: string
  title_ar?: string
  body: string
  body_ar?: string
  data?: Record<string, string>
  image_url?: string
  click_action?: string
}

interface FCMMessage {
  token?: string
  topic?: string
  notification: {
    title: string
    body: string
    image?: string
  }
  data?: Record<string, string>
  webpush?: {
    fcm_options?: {
      link?: string
    }
    notification?: {
      icon?: string
      badge?: string
      vibrate?: number[]
      requireInteraction?: boolean
    }
  }
  android?: {
    priority: string
    notification: {
      click_action?: string
      icon?: string
      color?: string
    }
  }
  apns?: {
    payload: {
      aps: {
        sound: string
        badge?: number
      }
    }
  }
}

// Get OAuth2 access token using service account
async function getAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable not set')
  }

  const serviceAccount = JSON.parse(serviceAccountJson)

  // Create JWT for OAuth2
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const claims = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  }

  // Encode header and claims
  const encoder = new TextEncoder()
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const claimsB64 = btoa(JSON.stringify(claims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  // Sign with RSA
  const signatureInput = `${headerB64}.${claimsB64}`

  // Import the private key
  const privateKeyPem = serviceAccount.private_key
  const pemHeader = '-----BEGIN PRIVATE KEY-----'
  const pemFooter = '-----END PRIVATE KEY-----'
  const pemContents = privateKeyPem.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '')
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, encoder.encode(signatureInput))

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  const jwt = `${signatureInput}.${signatureB64}`

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

// Send FCM message
async function sendFCMMessage(accessToken: string, message: FCMMessage): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('FCM Error:', error)

    // Check if token is invalid
    if (error.error?.details?.[0]?.errorCode === 'UNREGISTERED') {
      return { success: false, error: 'UNREGISTERED' }
    }

    return { success: false, error: error.error?.message || 'Unknown FCM error' }
  }

  return { success: true }
}

// Mark token as invalid in database
async function markTokenInvalid(supabase: ReturnType<typeof createClient>, token: string) {
  await supabase.rpc('mark_fcm_token_invalid', { p_token: token })
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: NotificationPayload = await req.json()

    // Validate payload
    if (!payload.title || !payload.body) {
      return new Response(JSON.stringify({ error: 'title and body are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get access token
    const accessToken = await getAccessToken()

    const results: { sent: number; failed: number; errors: string[] } = {
      sent: 0,
      failed: 0,
      errors: [],
    }

    // Build base message
    const buildMessage = (token: string, locale: string = 'ar'): FCMMessage => ({
      token,
      notification: {
        title: locale === 'ar' && payload.title_ar ? payload.title_ar : payload.title,
        body: locale === 'ar' && payload.body_ar ? payload.body_ar : payload.body,
        image: payload.image_url,
      },
      data: {
        ...payload.data,
        click_action: payload.click_action || '/',
      },
      webpush: {
        fcm_options: {
          link: payload.click_action || '/',
        },
        notification: {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
        },
      },
      android: {
        priority: 'high',
        notification: {
          click_action: payload.click_action || 'FLUTTER_NOTIFICATION_CLICK',
          icon: 'ic_notification',
          color: '#008B8B',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    })

    // Send to specific user(s)
    if (payload.user_id || payload.user_ids) {
      const userIds = payload.user_ids || [payload.user_id!]

      // Get FCM tokens for users
      const { data: tokens, error: tokensError } = await supabase
        .from('fcm_tokens')
        .select('token, user_id')
        .in('user_id', userIds)
        .eq('is_active', true)

      if (tokensError) {
        console.error('Error fetching tokens:', tokensError)
        return new Response(JSON.stringify({ error: 'Failed to fetch FCM tokens' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!tokens || tokens.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'No active FCM tokens found for specified users',
            results: { sent: 0, failed: 0 },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Send to each token
      for (const { token } of tokens) {
        const message = buildMessage(token)
        const result = await sendFCMMessage(accessToken, message)

        if (result.success) {
          results.sent++
        } else {
          results.failed++
          results.errors.push(result.error || 'Unknown error')

          // Mark invalid tokens
          if (result.error === 'UNREGISTERED') {
            await markTokenInvalid(supabase, token)
          }
        }
      }
    }

    // Send to provider staff
    if (payload.provider_id) {
      const { data: tokens, error: tokensError } = await supabase.rpc('get_provider_staff_tokens', {
        p_provider_id: payload.provider_id,
      })

      if (tokensError) {
        console.error('Error fetching provider tokens:', tokensError)
      } else if (tokens && tokens.length > 0) {
        for (const tokenData of tokens) {
          const message = buildMessage(tokenData.token)
          const result = await sendFCMMessage(accessToken, message)

          if (result.success) {
            results.sent++
          } else {
            results.failed++
            results.errors.push(result.error || 'Unknown error')

            if (result.error === 'UNREGISTERED') {
              await markTokenInvalid(supabase, tokenData.token)
            }
          }
        }
      }
    }

    // Send to topic
    if (payload.topic) {
      const message: FCMMessage = {
        topic: payload.topic,
        notification: {
          title: payload.title,
          body: payload.body,
          image: payload.image_url,
        },
        data: payload.data,
      }

      const result = await sendFCMMessage(accessToken, message)
      if (result.success) {
        results.sent++
      } else {
        results.failed++
        results.errors.push(result.error || 'Unknown error')
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
