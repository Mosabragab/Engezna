import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'الشروط والأحكام | إنجزنا - Terms & Conditions',
  description:
    'الشروط والأحكام لاستخدام تطبيق إنجزنا - السوق المحلي لاحتياجات بيتك اليومية. Terms & Conditions for using Engezna - Your local marketplace for daily home needs.',
  alternates: {
    languages: {
      ar: '/ar/terms',
      en: '/en/terms',
    },
  },
  openGraph: {
    title: 'الشروط والأحكام | إنجزنا',
    description: 'الشروط والأحكام لاستخدام تطبيق إنجزنا - السوق المحلي لاحتياجات بيتك اليومية.',
    type: 'website',
  },
};

interface TermsLayoutProps {
  children: React.ReactNode;
}

export default function TermsLayout({ children }: TermsLayoutProps) {
  return <>{children}</>;
}
