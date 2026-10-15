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

  const hasPermission = requireAll
    ? reqArray.every((perm) => permissions.includes(perm))
    : reqArray.some((perm) => permissions.includes(perm));

  return { hasPermission, isOwner: false };
}

export interface PermissionGateProps {
  permission: string | string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  disableOnly?: boolean;
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  requireAll = false,
  fallback = null,
  disableOnly = false,
  children,
}) => {
  const { hasPermission } = usePermission(permission, requireAll);

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
