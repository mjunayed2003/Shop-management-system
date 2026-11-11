import React from 'react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { Footer } from '@/components/layout/Footer';
import { AbstractWaveBackground } from '@/components/ui/AbstractWaveBackground';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col bg-transparent text-slate-900 dark:text-slate-100 overflow-x-hidden">
      {/* Universal Abstract Wave Background for all public pages */}
      <AbstractWaveBackground variant="hero" />

      <PublicNavbar />
      <main className="relative z-10 flex-1">{children}</main>
      <Footer />
    </div>
  );
}
