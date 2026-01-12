'use client'

import { GoogleOAuthProvider as GoogleProvider } from '@react-oauth/google'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export function GoogleOAuthProvider({ children }: Props) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  if (!clientId) {
    // In test/CI environment where Google Client ID is not configured,
    // use a dummy client ID to prevent useGoogleLogin hook from crashing.
    // Google login will fail gracefully but the page will render.
    console.warn('Google Client ID not configured - using dummy ID for testing')
    return (
      <GoogleProvider clientId="dummy-client-id-for-testing.apps.googleusercontent.com">
        {children}
      </GoogleProvider>
    )
  }

  return (
    <GoogleProvider clientId={clientId}>
      {children}
    </GoogleProvider>
  )
}
