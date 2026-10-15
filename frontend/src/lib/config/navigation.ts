import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Store,
  ShoppingCart,
  Boxes,
  Receipt,
  BarChart3,
  User,
  Component,
} from 'lucide-react';
import React from 'react';

export interface NavItemConfig {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPermission?: string;
  isDev?: boolean;
}

export const SIDEBAR_NAV_ITEMS: NavItemConfig[] = [
  {
    href: '/dashboard',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/roles',
    labelKey: 'nav.roles',
    icon: ShieldCheck,
    requiredPermission: 'roles:manage',
  },
  {
    href: '/users',
    labelKey: 'nav.users',
    icon: Users,
    requiredPermission: 'users:read',
  },
  {
    href: '/profile',
    labelKey: 'nav.profile',
    icon: User,
  },
  {
    href: '/dev/components',
    labelKey: 'nav.componentDocs',
    icon: Component,
    isDev: true,
  },
];
