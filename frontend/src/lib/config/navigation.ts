import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Store,
  ShoppingCart,
  Boxes,
  Layers,
  Barcode,
  ScanLine,
  Tag,
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
    href: '/products',
    labelKey: 'nav.products',
    icon: Boxes,
    requiredPermission: 'products:read',
  },
  {
    href: '/catalog/master-data',
    labelKey: 'nav.masterData',
    icon: Layers,
    requiredPermission: 'products:read',
  },
  {
    href: '/catalog/barcodes',
    labelKey: 'nav.barcodes',
    icon: Barcode,
    requiredPermission: 'barcode:print',
  },
  {
    href: '/catalog/lookup',
    labelKey: 'nav.barcodeLookup',
    icon: ScanLine,
    requiredPermission: 'products:read',
  },
  {
    href: '/catalog/price-lists',
    labelKey: 'nav.priceLists',
    icon: Tag,
    requiredPermission: 'products:read',
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

