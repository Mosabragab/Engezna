'use client'

import { GoogleOAuthProvider as GoogleProvider } from '@react-oauth/google'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export function GoogleOAuthProvider({ children }: Props) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  if (!clientId) {
    console.warn('Google Client ID not configured')
    return <>{children}</>
  }

  return (
    <GoogleProvider clientId={clientId}>
      {children}
    </GoogleProvider>
  )
}
