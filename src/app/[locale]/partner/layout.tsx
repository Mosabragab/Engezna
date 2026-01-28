import type { Metadata } from 'next';

/**
 * SEO Metadata for Partner Landing Page
 * Optimized for both Arabic hamza variations and updated commission info
 */
export const metadata: Metadata = {
  title: 'انضم كشريك | إنجزنا - انجزنا | Partner with Engezna',
  description:
    'سجل متجرك أو مطعمك في منصة إنجزنا (انجزنا). 0% عمولة أول 3 شهور، ثم 7% كحد أقصى. توصيل سريع في جميع محافظات مصر. Register your store on Engezna - 0% commission for first 3 months.',
  keywords: [
    'إنجزنا شريك',
    'انجزنا شريك',
    'تسجيل مطعم',
    'تسجيل متجر',
    'Engezna partner',
    'restaurant registration Egypt',
    '0% commission',
    'بدون عمولة',
    '3 شهور بدون عمولة',
  ],
  openGraph: {
    title: 'انضم كشريك في إنجزنا - انجزنا | 3 شهور بدون عمولة',
    description:
      'سجل متجرك في منصة إنجزنا (انجزنا). 0% عمولة أول 3 شهور، ثم 7% كحد أقصى. Register on Engezna - 0% commission for 3 months.',
    url: 'https://www.engezna.com/ar/partner',
    siteName: 'Engezna - إنجزنا',
    locale: 'ar_EG',
    type: 'website',
    images: [
      {
        url: '/images/og-partner.png',
        width: 1200,
        height: 630,
        alt: 'انضم كشريك في إنجزنا - 3 شهور بدون عمولة',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'انضم كشريك في إنجزنا - انجزنا | 3 شهور بدون عمولة',
    description: 'سجل متجرك في منصة إنجزنا. 0% عمولة أول 3 شهور.',
    images: ['/images/og-partner.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://www.engezna.com/ar/partner',
    languages: {
      ar: 'https://www.engezna.com/ar/partner',
      en: 'https://www.engezna.com/en/partner',
    },
  },
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
