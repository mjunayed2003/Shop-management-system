'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { Footer } from '@/components/layout/Footer';
import { AbstractWaveBackground } from '@/components/ui/AbstractWaveBackground';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <div
      className={`relative min-h-screen flex flex-col text-slate-900 dark:text-slate-100 overflow-x-hidden ${
        isHome ? 'bg-transparent' : 'bg-white dark:bg-slate-950'
      }`}
    >
      {/* Full Page Background Image ONLY on http://localhost:3000/ */}
      {isHome && <AbstractWaveBackground variant="hero" />}

      <PublicNavbar />
      <main className="relative z-10 flex-1">{children}</main>
      <Footer />
    </div>
  );
}
