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

// Global in-memory verification cache: session is validated ONCE per browser lifecycle
// Prevents spamming GET /platform/auth/me on every page click or route transition
let hasVerifiedSession = false;
let verifySessionPromise: Promise<any> | null = null;

export function resetPlatformSessionCache() {
  hasVerifiedSession = false;
  verifySessionPromise = null;
}

export function PlatformProtectedRoute({
  children,
  allowedRoles,
}: PlatformProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, accessToken, clearPlatformAuth, updateActivity } = usePlatformAuthStore();

  // If already verified in this session, don't show loading spinner
  const [isVerifying, setIsVerifying] = useState(() => !hasVerifiedSession && pathname !== '/platform/login');

  // 1. Initial Session Verification (Runs ONLY ONCE on mount or when token changes - NOT on every pathname change!)
  useEffect(() => {
    if (pathname === '/platform/login') {
      setIsVerifying(false);
      return;
    }

    if (!accessToken || !admin) {
      hasVerifiedSession = false;
      setIsVerifying(false);
      router.replace('/platform/login');
      return;
    }

    // If session is already verified in this browser lifecycle, do NOT call /platform/auth/me!
    if (hasVerifiedSession) {
      setIsVerifying(false);
      return;
    }

    // Check idle timeout (15 mins = 900,000 ms)
    const now = Date.now();
    const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
    const lastActivity = usePlatformAuthStore.getState().lastActivity;
    if (now - lastActivity > IDLE_TIMEOUT_MS) {
      hasVerifiedSession = false;
      clearPlatformAuth();
      router.replace('/platform/login?reason=idle_timeout');
      return;
    }

    // Validate token with server ONCE on initial load (deduplicated across React StrictMode runs)
    let mounted = true;
    if (!verifySessionPromise) {
      verifySessionPromise = platformApi.auth.getMe();
    }

    verifySessionPromise
      .then(() => {
        hasVerifiedSession = true;
        if (mounted) {
          setIsVerifying(false);
        }
      })
      .catch(() => {
        hasVerifiedSession = false;
        verifySessionPromise = null;
        if (mounted) {
          clearPlatformAuth();
          router.replace('/platform/login?reason=session_expired');
        }
      });

    return () => {
      mounted = false;
    };
  }, [accessToken, admin, router, clearPlatformAuth]);

  // 2. Auth check on route changes (instant check in memory - zero network requests!)
  useEffect(() => {
    if (pathname === '/platform/login') return;
    if (!accessToken || !admin) {
      hasVerifiedSession = false;
      router.replace('/platform/login');
    }
  }, [pathname, accessToken, admin, router]);

  // 3. Periodic idle timeout check (every 30 seconds - zero network requests!)
  useEffect(() => {
    if (pathname === '/platform/login') return;

    const interval = setInterval(() => {
      const now = Date.now();
      const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
      const lastAct = usePlatformAuthStore.getState().lastActivity;
      if (now - lastAct > IDLE_TIMEOUT_MS) {
        hasVerifiedSession = false;
        clearPlatformAuth();
        router.replace('/platform/login?reason=idle_timeout');
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [pathname, router, clearPlatformAuth]);

  // 4. User interaction listeners to update lastActivity timestamp
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-600 dark:text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400 mb-3" />
        <p className="text-xs font-mono tracking-wider uppercase">Verifying Platform Admin Session...</p>
      </div>
    );
  }

  // Role check
  if (allowedRoles && allowedRoles.length > 0 && admin) {
    if (!allowedRoles.includes(admin.role)) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-center p-6 text-slate-800 dark:text-slate-200">
          <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-500 flex items-center justify-center mb-4 border border-rose-200 dark:border-rose-800">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied (403 Forbidden)</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6">
            Your platform role <strong>{admin.role}</strong> does not have permission to view this screen.
          </p>
          <button
            onClick={() => router.push('/platform/dashboard')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      );
    }
  }

  return <>{children}</>;
}
