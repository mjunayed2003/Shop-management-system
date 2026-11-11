'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PlatformProtectedRoute } from './PlatformProtectedRoute';
import { PlatformSidebar } from './PlatformSidebar';
import { PlatformTopBar } from './PlatformTopBar';

const AbstractWaveBackground = dynamic(
  () => import('@/components/ui/AbstractWaveBackground').then((mod) => mod.AbstractWaveBackground),
  { ssr: false }
);

export function PlatformLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // If on login page, render standalone login card with full background
  if (pathname === '/platform/login') {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <AbstractWaveBackground variant="hero" />
        <div className="relative z-10">{children}</div>
      </div>
    );
  }

  return (
    <PlatformProtectedRoute>
      <div className="relative h-screen flex bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans overflow-hidden">
        {/* Desktop Platform Sidebar */}
        <div className="hidden lg:block shrink-0 h-full">
          <PlatformSidebar />
        </div>

        {/* Mobile Platform Drawer */}
        {mobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative w-64 max-w-[85vw] h-full z-10 animate-slideRight">
              <PlatformSidebar onCloseMobile={() => setMobileSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Platform Content Viewport */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-transparent relative z-10">
          <PlatformTopBar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-[1600px] w-full mx-auto space-y-6">
            {children}
          </main>
        </div>
      </div>
    </PlatformProtectedRoute>
  );
}
