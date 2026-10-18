import type { Metadata } from 'next';
import { Noto_Sans_Bengali, Inter } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/components/providers/AppProviders';

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-noto-bengali',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'দোকান পিওএস - পোশাক রিটেইল শপ ম্যানেজমেন্ট',
  description: 'মাল্টি-টেন্যান্ট, মাল্টি-ব্রাঞ্চ আধুনিক পোশাক খুচরা বিক্রয় ও ইনভেন্টরি সিস্টেম (বাংলাদেশ বাজার)',
  keywords: ['POS', 'Retail POS', 'Clothing POS', 'Bangladesh POS', 'দোকান ম্যানেজমেন্ট', 'ইনভেন্টরি'],
  manifest: '/manifest.json',
  themeColor: '#10b981',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Shop POS',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" suppressHydrationWarning className={`${notoSansBengali.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
