import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية | إنجزنا - Privacy Policy',
  description:
    'سياسة الخصوصية لتطبيق إنجزنا - تعرّف على كيفية جمع واستخدام وحماية بياناتك الشخصية. Privacy Policy for Engezna - Learn how we collect, use, and protect your personal data.',
  alternates: {
    languages: {
      ar: '/ar/privacy',
      en: '/en/privacy',
    },
  },
  openGraph: {
    title: 'سياسة الخصوصية | إنجزنا',
    description: 'تعرّف على كيفية جمع واستخدام وحماية بياناتك الشخصية في إنجزنا.',
    type: 'website',
  },
};

interface PrivacyLayoutProps {
  children: React.ReactNode;
}

export default function PrivacyLayout({ children }: PrivacyLayoutProps) {
  return <>{children}</>;
}
