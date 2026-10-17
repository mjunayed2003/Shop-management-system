'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Warehouse,
  FileSpreadsheet,
  AlertTriangle,
  History,
  TrendingDown,
  Layers,
  BarChart3,
  Building,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { PermissionGate, usePermission } from '@/components/shared/PermissionGate';
import { BarcodeInput } from '@/components/catalog/BarcodeInput';
import { MovementHistoryDrawer } from '@/components/inventory/MovementHistoryDrawer';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatBDT } from '@/lib/utils/formatters';
import { downloadCsv } from '@/lib/utils/csv';
import Decimal from 'decimal.js';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

export default function StockOverviewPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const branches = useBranchStore((s) => s.branches);
  const currentBranchId = useBranchStore((s) => s.currentBranchId);
  const isAllBranchAdmin = Boolean(user?.isOwner || branches.length > 1);

  // Cost visibility rule: hidden unless owner or products:update permission
  const canViewCost = Boolean(
    user?.isOwner ||
      permissions?.includes('products:update') ||
      permissions?.includes('*'),
  );

  // Tab: CURRENT_BRANCH or ALL_BRANCHES_MATRIX (admin only)
  const [viewMode, setViewMode] = useState<'CURRENT' | 'ALL_BRANCHES'>('CURRENT');

  // Filters for current branch stock
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [brandId, setBrandId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [gender, setGender] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [zeroStockOnly, setZeroStockOnly] = useState(false);

  // Grouping for matrix view: 'NONE' | 'BRAND' | 'CATEGORY'
  const [matrixGrouping, setMatrixGrouping] = useState<'NONE' | 'BRAND' | 'CATEGORY'>('NONE');

  // Drawer state
  const [drawerVariant, setDrawerVariant] = useState<any | null>(null);

  // Categories & Brands for filters
  const { data: categoriesData } = useQuery({
    queryKey: ['categories-stock-filter'],
    queryFn: () => api.catalog.categories.list(),
  });

  const { data: brandsData } = useQuery({
    queryKey: ['brands-stock-filter'],
    queryFn: () => api.catalog.brands.list(),
  });

  // Current branch stock query
  const queryKey = [
    'current-stock',
    currentBranchId,
    page,
    limit,
    search,
    brandId,
    categoryId,
    seasonId,
    gender,
    lowStockOnly,
    zeroStockOnly,
  ];

  const { data: stockData, isLoading: isLoadingStock } = useQuery({
    queryKey,
    queryFn: () =>
      api.inventory.stock.list({
        page,
        limit,
        search: search || undefined,
        brandId: brandId || undefined,
        categoryId: categoryId || undefined,
        seasonId: seasonId || undefined,
        gender: gender || undefined,
        lowStockOnly: lowStockOnly || undefined,
        zeroStockOnly: zeroStockOnly || undefined,
      }),
    enabled: viewMode === 'CURRENT',
  });

  // All branches summary query (Admin only)
  const { data: matrixData, isLoading: isLoadingMatrix } = useQuery({
    queryKey: ['all-branches-stock-summary'],
    queryFn: () => api.inventory.stock.summary(),
    enabled: viewMode === 'ALL_BRANCHES' && isAllBranchAdmin,
  });

  const handleBarcodeScan = (barcode: string) => {
    setSearch(barcode);
    setPage(1);
  };

  const handleExportCsv = () => {
    if (!stockData?.data || stockData.data.length === 0) return;

    const headers = [
      'SKU',
      'Barcode',
      'Product Name',
      'Size',
      'Color',
      'Brand',
      'Category',
      'On Hand Qty',
      'Allocated Qty',
      'Available Qty',
      'Reorder Level',
      'Status',
    ];

    if (canViewCost) {
      headers.push('Avg Cost Price', 'Stock Value');
    }

    const rows = stockData.data.map((item: any) => {
      const v = item.variant;
      const qty = Number(item.quantity);
      const allocated = Number(item.allocated_quantity || 0);
      const available = qty - allocated;
      const reorderLevel = v?.reorder_level || 0;

      let status = 'OK';
      if (qty < 0) status = 'Negative';
      else if (qty === 0) status = 'Zero';
      else if (available <= reorderLevel) status = 'Low';

      const row: (string | number)[] = [
        v?.sku || '',
        v?.barcode || '',
        v?.product?.name || '',
        v?.size?.name || '',
        v?.color?.name || '',
        v?.product?.brand?.name || '',
        v?.product?.category?.name || '',
        qty,
        allocated,
        available,
        reorderLevel,
        status,
      ];

      if (canViewCost) {
        row.push(Number(item.avg_cost_price || 0), Number(item.total_cost_value || 0));
      }

      return row;
    });

    downloadCsv('branch_stock_overview.csv', headers, rows);
  };

  // Stock status chip helper
  const getStatusChip = (quantity: number, allocated: number, reorderLevel: number) => {
    const available = quantity - allocated;
    if (quantity < 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
          Negative
        </span>
      );
    }
    if (quantity === 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
          Zero
        </span>
      );
    }
    if (available <= reorderLevel) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
          Low Stock
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
        In Stock
      </span>
    );
  };

  const columns = [
    {
      key: 'product',
      header: 'Garment / Variant',
      render: (item: any) => {
        const v = item.variant;
        return (
          <div>
            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block">
              {v?.product?.name}
            </span>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <span>SKU: {v?.sku}</span>
              {v?.barcode && <span>| {v.barcode}</span>}
            </div>
          </div>
        );
      },
    },
    {
      key: 'variant',
      header: 'Attributes',
      render: (item: any) => {
        const v = item.variant;
        return (
          <div className="text-xs text-slate-600 dark:text-slate-400">
            <span>
              {v?.size?.name || '-'} / {v?.color?.name || '-'}
            </span>
            {(v?.product?.brand?.name || v?.product?.category?.name) && (
              <span className="block text-[10px] text-slate-400">
                {v.product.brand?.name} • {v.product.category?.name}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'quantity',
      header: 'On Hand',
      render: (item: any) => (
        <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 text-right block">
          {Number(item.quantity)}
        </span>
      ),
    },
    {
      key: 'allocated',
      header: 'Allocated',
      render: (item: any) => (
        <span className="font-mono text-xs text-slate-500 text-right block">
          {Number(item.allocated_quantity || 0)}
        </span>
      ),
    },
    {
      key: 'available',
      header: 'Available',
      render: (item: any) => {
        const qty = Number(item.quantity);
        const allocated = Number(item.allocated_quantity || 0);
        const available = qty - allocated;
        return (
          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 text-right block">
            {available}
          </span>
        );
      },
    },
    // Permission-Gated Cost Columns
    ...(canViewCost
      ? [
          {
            key: 'avg_cost',
            header: 'Avg Cost (WAC)',
            render: (item: any) => (
              <span className="font-mono text-xs text-slate-700 dark:text-slate-300 text-right block">
                {formatBDT(item.avg_cost_price)}
              </span>
            ),
          },
          {
            key: 'cost_value',
            header: 'Stock Value',
            render: (item: any) => (
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 text-right block">
                {formatBDT(
                  new Decimal(item.quantity || 0)
                    .times(new Decimal(item.avg_cost_price || 0))
                    .toNumber(),
                )}
              </span>
            ),
          },
        ]
      : []),
    {
      key: 'reorder',
      header: 'Reorder Lvl',
      render: (item: any) => (
        <span className="font-mono text-xs text-slate-500 text-center block">
          {item.variant?.reorder_level || 0}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) =>
        getStatusChip(
          Number(item.quantity),
          Number(item.allocated_quantity || 0),
          Number(item.variant?.reorder_level || 0),
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (item: any) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() =>
              setDrawerVariant({
                id: item.variant?.id,
                sku: item.variant?.sku,
                productName: item.variant?.product?.name,
              })
            }
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Stock Movement Ledger"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{t('inventory.stockOverview')}</span>
              {viewMode === 'ALL_BRANCHES' && (
                <Badge className="bg-indigo-600 text-white text-xs">
                  {t('inventory.multiBranchBadge')}
                </Badge>
              )}
            </h1>
            <p className="text-xs text-slate-500">
              Live inventory balances, allocated quantities, and WAC stock valuation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin Toggle for ALL-BRANCHES Matrix */}
          {isAllBranchAdmin && (
            <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('CURRENT')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  viewMode === 'CURRENT'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Current Branch
              </button>
              <button
                type="button"
                onClick={() => setViewMode('ALL_BRANCHES')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  viewMode === 'ALL_BRANCHES'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All Branches Matrix
              </button>
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleExportCsv}
            className="gap-1.5 text-xs h-9"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push('/inventory/stock/low-stock')}
            className="gap-1.5 text-xs h-9 text-amber-700 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950"
          >
            <TrendingDown className="w-4 h-4" />
            <span>Low Stock Reorders</span>
          </Button>

          {canViewCost && (
            <Button
              variant="outline"
              onClick={() => router.push('/inventory/stock/valuation')}
              className="gap-1.5 text-xs h-9"
            >
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Valuation Report</span>
            </Button>
          )}
        </div>
      </div>

      {viewMode === 'CURRENT' ? (
        <>
          {/* Filters Bar */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <SearchInput
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                placeholder="Search variant name, SKU, barcode..."
              />

              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="">All Categories</option>
                {categoriesData?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={brandId}
                onChange={(e) => {
                  setBrandId(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="">All Brands</option>
                {brandsData?.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={gender}
                onChange={(e) => {
                  setGender(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="">All Genders</option>
                <option value="MEN">Men</option>
                <option value="WOMEN">Women</option>
                <option value="KIDS">Kids</option>
                <option value="UNISEX">Unisex</option>
              </select>

              {/* Barcode Fast Lookup Scanner */}
              <BarcodeInput
                onScan={handleBarcodeScan}
                placeholder="Scan barcode..."
                autoFocus={false}
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-600 dark:text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => {
                    setLowStockOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  Low Stock Items Only
                </span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={zeroStockOnly}
                  onChange={(e) => {
                    setZeroStockOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium text-rose-700 dark:text-rose-400">
                  Zero Stock Only
                </span>
              </label>
            </div>
          </div>

          {/* Current Branch Stock Table */}
          <DataTable
            columns={columns}
            data={stockData?.data || []}
            isLoading={isLoadingStock}
            total={stockData?.meta?.total || 0}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
            emptyMessage="No stock records found for the selected filters."
          />

          {/* Totals Footer Row */}
          {stockData?.data && stockData.data.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
              <span className="text-slate-500 uppercase tracking-wider">
                Filtered Set Totals ({stockData.meta?.total || 0} variants)
              </span>

              <div className="flex items-center gap-6">
                <div>
                  <span className="text-slate-500 mr-2">Total On Hand Qty:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {stockData.data.reduce(
                      (acc: number, item: any) => acc + Number(item.quantity),
                      0,
                    )}{' '}
                    units
                  </span>
                </div>

                {canViewCost && (
                  <div>
                    <span className="text-slate-500 mr-2">Total Cost Value:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatBDT(
                        stockData.data.reduce(
                          (acc: Decimal, item: any) =>
                            acc.plus(
                              new Decimal(item.quantity || 0).times(
                                new Decimal(item.avg_cost_price || 0),
                              ),
                            ),
                          new Decimal(0),
                        ).toNumber(),
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* ALL BRANCHES MATRIX VIEW (Admin Only) */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Cross-Branch Stock Matrix
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time variant quantity matrix across all showroom locations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Group by:</span>
              <button
                type="button"
                onClick={() => setMatrixGrouping('NONE')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  matrixGrouping === 'NONE'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                }`}
              >
                None
              </button>
              <button
                type="button"
                onClick={() => setMatrixGrouping('BRAND')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  matrixGrouping === 'BRAND'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                }`}
              >
                By Brand
              </button>
              <button
                type="button"
                onClick={() => setMatrixGrouping('CATEGORY')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  matrixGrouping === 'CATEGORY'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                }`}
              >
                By Category
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Variant / SKU</th>
                    <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Attributes</th>
                    {branches.map((b) => (
                      <th
                        key={b.id}
                        className="p-3 font-semibold text-slate-600 dark:text-slate-400 text-center"
                      >
                        {b.name}
                        {b.code && (
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {b.code}
                          </span>
                        )}
                      </th>
                    ))}
                    <th className="p-3 font-semibold text-slate-900 dark:text-slate-100 text-right">
                      Total Units
                    </th>
                    {canViewCost && (
                      <th className="p-3 font-semibold text-slate-900 dark:text-slate-100 text-right">
                        Total Value
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(!matrixData?.variants || matrixData.variants.length === 0) ? (
                    <tr>
                      <td colSpan={branches.length + 4} className="p-8 text-center text-slate-400">
                        No cross-branch records found.
                      </td>
                    </tr>
                  ) : (
                    matrixData.variants.map((v: any) => {
                      const totalQty = branches.reduce((sum, b) => {
                        const bStock = v.branches?.[b.id] || 0;
                        return sum + bStock;
                      }, 0);

                      const totalValue = canViewCost
                        ? new Decimal(totalQty).times(new Decimal(v.avgCost || 0)).toNumber()
                        : 0;

                      return (
                        <tr key={v.id} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                              {v.productName}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">
                              SKU: {v.sku}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            {v.size || '-'} / {v.color || '-'}
                            <span className="block text-[10px] text-slate-400">
                              {v.brand || ''} • {v.category || ''}
                            </span>
                          </td>
                          {branches.map((b) => {
                            const bStock = v.branches?.[b.id] || 0;
                            return (
                              <td
                                key={b.id}
                                className="p-3 text-center font-mono font-bold"
                              >
                                <span
                                  className={
                                    bStock > 0
                                      ? 'text-slate-900 dark:text-slate-100'
                                      : 'text-slate-400'
                                  }
                                >
                                  {bStock}
                                </span>
                              </td>
                            );
                          })}
                          <td className="p-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                            {totalQty}
                          </td>
                          {canViewCost && (
                            <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                              {formatBDT(totalValue)}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Movement Ledger Drawer */}
      <MovementHistoryDrawer
        isOpen={Boolean(drawerVariant)}
        onClose={() => setDrawerVariant(null)}
        variantId={drawerVariant?.id}
        sku={drawerVariant?.sku}
        productName={drawerVariant?.productName}
      />
    </div>
  );
}
