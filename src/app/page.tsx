import Logo from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Logo language="ar" variant="medium" size="md" />
            
            {/* Navigation */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                English
              </Button>
              <Button variant="default" size="sm">
                تسجيل الدخول
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4">
        <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
          {/* Main Logo */}
          <div className="mb-8 space-y-4">
            <Logo language="ar" variant="bold" size="xl" className="mb-2" />
            <Logo language="en" variant="medium" size="lg" className="text-muted-foreground" />
          </div>
          
          {/* Tagline */}
          <p className="mb-8 max-w-2xl text-xl text-muted-foreground" style={{fontFamily: 'var(--font-noto-sans-arabic)'}}>
            انجزنا واطلب - خدمة توصيل سريعة من المطاعم والكافيهات والبقالة
          </p>
          
          {/* CTA Buttons */}
          <div className="flex gap-4">
            <Button size="lg" className="text-lg" style={{fontFamily: 'var(--font-noto-sans-arabic)'}}>
              ابدأ الطلب الآن
            </Button>
            <Button size="lg" variant="outline" className="text-lg" style={{fontFamily: 'var(--font-noto-sans-arabic)'}}>
              للمطاعم والمحلات
            </Button>
          </div>
          
          {/* Status Badge */}
          <div className="mt-12 rounded-full bg-primary/10 px-6 py-2 text-sm font-medium text-primary">
            🚀 قريباً في بني سويف
          </div>
        </div>
      </main>
    </div>
  )
}
