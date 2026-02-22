import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'طلب خاص | إنجزنا',
  description: 'اطلب أي حاجة من المتاجر المفضلة عندك. ابعت طلبك الخاص واستلمه لحد باب بيتك.',
};

export default function CustomOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
