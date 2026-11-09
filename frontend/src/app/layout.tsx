import type { Metadata, Viewport } from 'next';
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
  title: 'Shop POS - Clothing Retail Management',
  description: 'Multi-tenant, multi-branch modern apparel retail sales and inventory system',
  keywords: ['POS', 'Retail POS', 'Clothing POS', 'Bangladesh POS', 'Shop Management', 'Inventory'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Shop POS',
  },
};

export const viewport: Viewport = {
  themeColor: '#0284c7',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${notoSansBengali.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
