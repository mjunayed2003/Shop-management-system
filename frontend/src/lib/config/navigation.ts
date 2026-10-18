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
  Truck,
  Building2,
  FileText,
  CreditCard,
  RotateCcw,
  Warehouse,
  ArrowLeftRight,
  Sliders,
  ClipboardCheck,
  AlertOctagon,
  PlusCircle,
  CheckCircle2,
  Printer,
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
    href: '/pos',
    labelKey: 'pos.posTitle',
    icon: ShoppingCart,
  },
  {
    href: '/sales',
    labelKey: 'pos.salesList',
    icon: Receipt,
  },
  {
    href: '/settings/printer',
    labelKey: 'pos.printerSettings',
    icon: Printer,
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
    href: '/purchases',
    labelKey: 'nav.purchases',
    icon: Truck,
    requiredPermission: 'purchases:read',
  },
  {
    href: '/purchases/suppliers',
    labelKey: 'nav.suppliers',
    icon: Building2,
    requiredPermission: 'purchases:read',
  },
  {
    href: '/purchases/orders',
    labelKey: 'nav.purchaseOrders',
    icon: FileText,
    requiredPermission: 'purchases:read',
  },
  {
    href: '/purchases/payments',
    labelKey: 'nav.supplierPayments',
    icon: CreditCard,
    requiredPermission: 'purchases:read',
  },
  {
    href: '/purchases/returns',
    labelKey: 'nav.purchaseReturns',
    icon: RotateCcw,
    requiredPermission: 'purchases:read',
  },
  {
    href: '/inventory/stock',
    labelKey: 'nav.stockOverview',
    icon: Warehouse,
    requiredPermission: 'inventory:read',
  },
  {
    href: '/inventory/transfers',
    labelKey: 'nav.stockTransfers',
    icon: ArrowLeftRight,
    requiredPermission: 'inventory:read',
  },
  {
    href: '/inventory/adjustments',
    labelKey: 'nav.stockAdjustments',
    icon: Sliders,
    requiredPermission: 'inventory:read',
  },
  {
    href: '/inventory/stocktake',
    labelKey: 'nav.stocktake',
    icon: ClipboardCheck,
    requiredPermission: 'inventory:read',
  },
  {
    href: '/inventory/damaged',
    labelKey: 'nav.damagedStock',
    icon: AlertOctagon,
    requiredPermission: 'inventory:read',
  },
  {
    href: '/inventory/opening',
    labelKey: 'nav.openingStock',
    icon: PlusCircle,
    requiredPermission: 'inventory:adjust',
  },
  {
    href: '/inventory/consistency',
    labelKey: 'nav.consistencyCheck',
    icon: CheckCircle2,
    requiredPermission: 'inventory:read',
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

