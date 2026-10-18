'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { PlatformProtectedRoute } from './PlatformProtectedRoute';
import { PlatformSidebar } from './PlatformSidebar';
import { PlatformTopBar } from './PlatformTopBar';

export function PlatformLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // If on login page, render standalone login card without admin shell
  if (pathname === '/platform/login') {
    return <>{children}</>;
  }

  return (
    <PlatformProtectedRoute>
      <div className="min-h-screen flex bg-slate-900 text-slate-100 antialiased font-sans">
        {/* Desktop Platform Sidebar */}
        <div className="hidden lg:block shrink-0">
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
        <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-slate-900">
          <PlatformTopBar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {children}
          </main>
        </div>
      </div>
    </PlatformProtectedRoute>
  );
}
