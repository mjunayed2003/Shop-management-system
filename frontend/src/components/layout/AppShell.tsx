'use client';

import React, { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppTopBar } from './AppTopBar';
import { Breadcrumbs } from './Breadcrumbs';
import { SuspendedNotice } from '../feedback/SuspendedNotice';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { PwaUpdatePrompt } from '../pwa/PwaUpdatePrompt';

export function AppShell({
  children,
  requiredPermission,
}: {
  children: React.ReactNode;
  requiredPermission?: string | string[];
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <ProtectedRoute requiredPermission={requiredPermission}>
      <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block shrink-0">
          <AppSidebar />
        </div>

        {/* Mobile Sidebar Overlay & Drawer */}
        {mobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative w-64 max-w-[85vw] h-full z-10 animate-slideRight">
              <AppSidebar onCloseMobile={() => setMobileSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Content Viewport */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <AppTopBar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            <Breadcrumbs />
            {children}
          </main>
        </div>

        {/* Lock screen if business subscription is SUSPENDED */}
        <SuspendedNotice />

        {/* PWA Update & Install Prompt */}
        <PwaUpdatePrompt />
      </div>
    </ProtectedRoute>
  );
}
