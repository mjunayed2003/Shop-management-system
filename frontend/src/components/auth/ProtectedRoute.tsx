'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { usePermission } from '../shared/PermissionGate';
import { ForbiddenPage } from '../feedback/ForbiddenPage';
import { Loader2 } from 'lucide-react';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string | string[];
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { isAuthenticated, isLoadingSession, setAuth, setLoadingSession, clearAuth } = useAuthStore();
  const { setBranches } = useBranchStore();
  const { hasPermission } = usePermission(requiredPermission);

  useEffect(() => {
    // Only attempt session restore if not already authenticated
    if (!isAuthenticated) {
      let isMounted = true;
      setLoadingSession(true);

      const restoreSession = async () => {
        try {
          const res = await fetch('/api/auth/session', { method: 'GET' });
          if (!res.ok) {
            throw new Error('No session');
          }
          const data = await res.json();
          if (isMounted) {
            setAuth({
              user: data.user,
              business: data.business,
              accessToken: data.accessToken,
              permissions: data.user?.permissions || [],
            });
            if (data.branches) {
              setBranches(data.branches);
            }
          }
        } catch {
          if (isMounted) {
            clearAuth();
            const search = typeof window !== 'undefined' ? window.location.search : '';
            const fullPath = `${pathname}${search}`;
            const redirectUrl = `/login?redirect=${encodeURIComponent(fullPath)}`;
            router.replace(redirectUrl);
          }
        } finally {
          if (isMounted) {
            setLoadingSession(false);
          }
        }
      };

      restoreSession();

      return () => {
        isMounted = false;
      };
    }
  }, [isAuthenticated, pathname, router, setAuth, setBranches, clearAuth, setLoadingSession]);

  if (isLoadingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            সেশন যাচাই করা হচ্ছে...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredPermission && !hasPermission) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
