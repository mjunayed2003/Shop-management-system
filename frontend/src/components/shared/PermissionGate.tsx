'use client';

import React from 'react';
import { useAuthStore } from '@/lib/store/auth-store';

export function usePermission(requiredPermission?: string | string[], requireAll = false) {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);

  if (!requiredPermission || (Array.isArray(requiredPermission) && requiredPermission.length === 0)) {
    return { hasPermission: true, isOwner: Boolean(user?.isOwner) };
  }

  // Owner has universal access
  if (user?.isOwner || permissions.includes('*')) {
    return { hasPermission: true, isOwner: true };
  }

  const reqArray = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];

  const checkSinglePermission = (req: string): boolean => {
    // 1. Direct match
    if (permissions.includes(req)) return true;

    // 2. Normalization between colon and dot
    const colonVersion = req.replace(/\./g, ':');
    const dotVersion = req.replace(/:/g, '.');
    if (permissions.includes(colonVersion) || permissions.includes(dotVersion)) return true;

    // 3. Wildcard matching: e.g. "purchase.*" or "purchases.*"
    if (req.endsWith('.*') || req.endsWith(':*')) {
      const prefix = req.slice(0, -2);
      const prefixAlt = prefix.endsWith('s') ? prefix.slice(0, -1) : `${prefix}s`;
      return permissions.some((userPerm) => {
        const u = userPerm.replace(/:/g, '.');
        return u.startsWith(`${prefix}.`) || u.startsWith(`${prefixAlt}.`);
      });
    }

    // 4. If checking specific "stock.approve", also check "stock:approve"
    if (req === 'stock.approve' || req === 'stock:approve') {
      return permissions.includes('stock:approve') || permissions.includes('stock.approve');
    }

    // 5. If user has wildcard permissions like "inventory:*"
    return permissions.some((userPerm) => {
      if (userPerm.endsWith(':*') || userPerm.endsWith('.*')) {
        const userPrefix = userPerm.slice(0, -2);
        return colonVersion.startsWith(`${userPrefix}:`) || dotVersion.startsWith(`${userPrefix}.`);
      }
      return false;
    });
  };

  const hasPermission = requireAll
    ? reqArray.every(checkSinglePermission)
    : reqArray.some(checkSinglePermission);

  return { hasPermission, isOwner: false };
}

export interface PermissionGateProps {
  permission?: string | string[];
  permissions?: string | string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  disableOnly?: boolean;
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  disableOnly = false,
  children,
}) => {
  const req = permission || permissions;
  const { hasPermission } = usePermission(req, requireAll);

  if (hasPermission) {
    return <>{children}</>;
  }

  if (disableOnly && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      disabled: true,
      title: 'এই সুবিধাটি ব্যবহারের অনুমতি আপনার অ্যাকাউন্টে নেই।',
      className: `${(children as any).props.className || ''} opacity-40 cursor-not-allowed pointer-events-none`,
    });
  }

  return <>{fallback}</>;
};
