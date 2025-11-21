import type { Metadata } from "next";
import { notoSans, notoSansArabic } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Engezna - انجزنا | Food Delivery in Beni Suef",
  description: "انجزنا واطلب - Fast food delivery from restaurants, coffee shops, groceries in Beni Suef",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${notoSans.variable} ${notoSansArabic.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}