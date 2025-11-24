'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import Link from 'next/link'

// Form validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  console.log('📺 Login page rendered')
  const t = useTranslations('auth.login')
  const locale = useLocale()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    console.log('🔑 Login form submitted:', { email: data.email }) // Debug log
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      console.log('📡 Supabase client created') // Debug log
      
      // Sign in with email and password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email.toLowerCase().trim(),
        password: data.password,
      })

      console.log('🔐 Auth response:', { user: authData?.user?.email, error: authError?.message }) // Debug log

      if (authError) {
        console.error('❌ Auth error:', authError)
        // Provide more specific error messages
        if (authError.message.includes('Invalid login credentials')) {
          setError('البريد الإلكتروني أو كلمة المرور غير صحيحة / Invalid email or password')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('يرجى تأكيد بريدك الإلكتروني أولاً / Please confirm your email first')
        } else {
          setError(authError.message)
        }
        return
      }

      if (authData.user) {
        console.log('✅ User authenticated:', authData.user.email) // Debug log
        
        // Fetch user profile to get role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', authData.user.id)
          .single()

        console.log('👤 Profile fetch result:', { profile, error: profileError }) // Debug log

        // Don't fail login if profile fetch fails - just redirect to homepage
        let redirectPath = `/${locale}`
        
        if (profile?.role) {
          console.log('🎭 User role:', profile.role) // Debug log
          switch (profile.role) {
            case 'admin':
              redirectPath = `/${locale}/_admin`
              break
            case 'provider_owner':
              redirectPath = `/${locale}/_provider`
              break
            case 'customer':
            default:
              redirectPath = `/${locale}/providers` // Redirect customers to providers page
              break
          }
        }

        console.log('🚀 Redirecting to:', redirectPath) // Debug log
        
        // Use window.location for more reliable redirect
        setTimeout(() => {
          console.log('🚀 Executing redirect to:', redirectPath)
          window.location.href = redirectPath
        }, 1000) // Give time to see success message
      }
    } catch (err) {
      console.error('💥 Unexpected error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('title')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                {...register('email')}
                disabled={isLoading}
                className={errors.email ? 'border-destructive' : ''}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('passwordPlaceholder')}
                {...register('password')}
                disabled={isLoading}
                className={errors.password ? 'border-destructive' : ''}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-end">
              <Link
                href={`/${locale}/auth/forgot-password`}
                className="text-sm text-primary hover:underline"
              >
                {t('forgotPassword')}
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? t('loggingIn') : t('loginButton')}
            </Button>

            {/* Debug Test Button - Remove after fixing */}
            <Button
              type="button"
              variant="outline"
              className="w-full mt-2"
              onClick={async () => {
                console.log('🟢 Direct test button clicked!')
                setError(null)
                
                // Test with known credentials
                const testCredentials = {
                  email: 'customer@test.com',
                  password: 'Test123!' // You might need to set a password for test users
                }
                
                console.log('🧪 Testing with:', testCredentials.email)
                
                try {
                  const supabase = createClient()
                  const { data: authData, error } = await supabase.auth.signInWithPassword(testCredentials)
                  
                  console.log('🧪 Test Result:', { user: authData?.user?.email, error: error?.message })
                  
                  if (error) {
                    setError(`Test failed: ${error.message}`)
                  } else {
                    setError(`Test success! User: ${authData?.user?.email}`)
                    // Redirect to providers page after successful test
                    setTimeout(() => {
                      window.location.href = `/${locale}/providers`
                    }, 1500)
                  }
                } catch (err) {
                  console.error('🧪 Test error:', err)
                  setError(`Test error: ${err}`)
                }
              }}
            >
              🧪 Test Login (customer@test.com)
            </Button>
            
            {/* Manual Login Test */}
            <Button
              type="button"
              variant="secondary"
              className="w-full mt-2"
              onClick={() => {
                // Pre-fill the form with test credentials
                const emailInput = document.querySelector('#email') as HTMLInputElement
                const passwordInput = document.querySelector('#password') as HTMLInputElement
                
                if (emailInput) emailInput.value = 'customer@test.com'
                if (passwordInput) passwordInput.value = 'Test123!'
                
                console.log('📋 Pre-filled form with test credentials')
              }}
            >
              📋 Fill Test Credentials
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            {t('noAccount')}{' '}
            <Link
              href={`/${locale}/auth/signup`}
              className="text-primary hover:underline font-medium"
            >
              {t('signupLink')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
