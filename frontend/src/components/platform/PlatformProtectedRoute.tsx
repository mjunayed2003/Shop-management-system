'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { usePlatformAuthStore, PlatformRole } from '@/lib/store/platform-auth-store';
import { platformApi } from '@/lib/api/platform-client';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface PlatformProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: PlatformRole[];
}

export function PlatformProtectedRoute({
  children,
  allowedRoles,
}: PlatformProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, accessToken, isAuthenticated, clearPlatformAuth, updateActivity, lastActivity } =
    usePlatformAuthStore();
  const [isVerifying, setIsVerifying] = useState(true);

  // 1. Session verification & Idle Timeout (15 minutes)
  useEffect(() => {
    // If on platform login page, no verification needed
    if (pathname === '/platform/login') {
      setIsVerifying(false);
      return;
    }

    if (!accessToken || !admin) {
      router.replace('/platform/login');
      return;
    }

    // Check idle timeout (15 mins = 900,000 ms)
    const now = Date.now();
    const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
    if (now - lastActivity > IDLE_TIMEOUT_MS) {
      clearPlatformAuth();
      router.replace('/platform/login?reason=idle_timeout');
      return;
    }

    // Verify session with /platform/auth/me
    let mounted = true;
    platformApi.auth
      .getMe()
      .then((res) => {
        if (mounted) {
          setIsVerifying(false);
          updateActivity();
        }
      })
      .catch(() => {
        if (mounted) {
          clearPlatformAuth();
          router.replace('/platform/login?reason=session_expired');
        }
      });

    return () => {
      mounted = false;
    };
  }, [accessToken, admin, pathname, router, clearPlatformAuth, updateActivity, lastActivity]);

  // Activity listeners to reset idle timeout
  useEffect(() => {
    const handleUserAction = () => {
      updateActivity();
    };

    window.addEventListener('mousedown', handleUserAction);
    window.addEventListener('keydown', handleUserAction);
    return () => {
      window.removeEventListener('mousedown', handleUserAction);
      window.removeEventListener('keydown', handleUserAction);
    };
  }, [updateActivity]);

  if (pathname === '/platform/login') {
    return <>{children}</>;
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-xs font-mono tracking-wider uppercase">Verifying Platform Admin Session...</p>
      </div>
    );
  }

  // Role check
  if (allowedRoles && allowedRoles.length > 0 && admin) {
    if (!allowedRoles.includes(admin.role)) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-6 text-slate-200">
          <div className="w-16 h-16 rounded-3xl bg-rose-950/60 text-rose-500 flex items-center justify-center mb-4 border border-rose-800">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied (403 Forbidden)</h2>
          <p className="text-xs text-slate-400 max-w-sm mb-6">
            Your platform role <strong>{admin.role}</strong> does not have permission to view this screen.
          </p>
          <button
            onClick={() => router.push('/platform/dashboard')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl"
          >
            Return to Dashboard
          </button>
        </div>
      );
    }
  }

  return <>{children}</>;
}
