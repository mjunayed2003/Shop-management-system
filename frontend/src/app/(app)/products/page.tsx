'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { usePermission } from '@/components/shared/PermissionGate';
import { formatBDT } from '@/lib/utils/formatters';
import { downloadCsv, parseCsv } from '@/lib/utils/csv';

import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import {
  Boxes,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Barcode,
  Upload,
  Download,
  Filter,
  Layers,
  Store,
  RefreshCw,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  X,
  ScanLine,
} from 'lucide-react';

export default function ProductsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const currentBranchId = useBranchStore((s) => s.currentBranchId);
  const currentBranch = useBranchStore((s) => s.currentBranch);
  const isOwnerOrAdmin = user?.isOwner;

  const { hasPermission: canCreate } = usePermission('products:create');
  const { hasPermission: canUpdate } = usePermission('products:update');
  const { hasPermission: canDelete } = usePermission('products:delete');
  const { hasPermission: canPrintBarcode } = usePermission('barcode:print');

  // Filters State Keyed by Branch in LocalStorage
  const storageKey = `pos_catalog_filters_${currentBranchId || 'default'}`;

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [gender, setGender] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(''); // 'all' | 'active' | 'inactive'
  const [adminBranchId, setAdminBranchId] = useState<string>(''); // For multi-branch admin filter
  const [sortBy, setSortBy] = useState<'created_at' | 'name' | 'code'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load remembered filters
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.categoryId) setCategoryId(parsed.categoryId);
        if (parsed.brandId) setBrandId(parsed.brandId);
        if (parsed.seasonId) setSeasonId(parsed.seasonId);
        if (parsed.gender) setGender(parsed.gender);
        if (parsed.statusFilter) setStatusFilter(parsed.statusFilter);
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Save filters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ categoryId, brandId, seasonId, gender, statusFilter }),
      );
    } catch {
      // ignore
    }
  }, [storageKey, categoryId, brandId, seasonId, gender, statusFilter]);

  // Master Data Lookups for Filters
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.catalog.categories.list(),
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.catalog.brands.list(),
  });

  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => api.catalog.seasons.list(),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.branches.list(false),
    enabled: Boolean(isOwnerOrAdmin),
  });

  // Query Products List
  const { data: productResponse, isLoading, refetch } = useQuery({
    queryKey: [
      'products',
      {
        branchId: currentBranchId,
        adminBranchId,
        page,
        limit,
        search,
        categoryId,
        brandId,
        seasonId,
        gender,
        statusFilter,
        sortBy,
        sortOrder,
      },
    ],
    queryFn: () =>
      api.catalog.products.list({
        page,
        limit,
        search: search.trim() || undefined,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        seasonId: seasonId || undefined,
        gender: gender || undefined,
        isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
        branchId: isOwnerOrAdmin && adminBranchId ? adminBranchId : undefined,
        sortBy,
        sortOrder,
      }),
  });

  const products = productResponse?.data || [];
  const meta = productResponse?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

  // Modals & Action States
  const [deletingProduct, setDeletingProduct] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<{ row: number; error: string }[]>([]);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importSuccessCount, setImportSuccessCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Soft Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.catalog.products.delete(id),
    onSuccess: () => {
      toast.success('Product soft-deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeletingProduct(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete product.');
      setDeletingProduct(null);
    },
  });

  // Toggle Active Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.catalog.products.update(id, { isActive }),
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? 'Product activated.' : 'Product deactivated.');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update status.');
    },
  });

  // Client-Side CSV Export (with Progress, 1000 row cap, and formula injection protection)
  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      setExportProgress(10);

      // Fetch first page to assess total
      const firstPage = await api.catalog.products.list({
        page: 1,
        limit: 100,
        search: search || undefined,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        seasonId: seasonId || undefined,
        gender: gender || undefined,
        isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
        branchId: isOwnerOrAdmin && adminBranchId ? adminBranchId : undefined,
      });

      const totalItems = Math.min(firstPage.meta.total, 1000); // capped at 1000
      let allItems = [...firstPage.data];

      const totalPages = Math.ceil(totalItems / 100);

      for (let p = 2; p <= totalPages; p++) {
        setExportProgress(Math.round((p / totalPages) * 90));
        const res = await api.catalog.products.list({
          page: p,
          limit: 100,
          search: search || undefined,
          categoryId: categoryId || undefined,
          brandId: brandId || undefined,
          seasonId: seasonId || undefined,
          gender: gender || undefined,
          isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
          branchId: isOwnerOrAdmin && adminBranchId ? adminBranchId : undefined,
        });
        allItems = allItems.concat(res.data);
      }

      setExportProgress(95);

      const headers = [
        'Style Code',
        'Product Name',
        'Category',
        'Brand',
        'Season',
        'Gender',
        'Variants Count',
        'Current Branch Stock',
        'Min Price (BDT)',
        'Max Price (BDT)',
        'Status',
        'Active Branches',
      ];

      const rows = allItems.slice(0, 1000).map((p: any) => [
        p.code,
        p.name,
        p.category?.name || '',
        p.brand?.name || '',
        p.season?.name || '',
        p.gender,
        p.variantsCount || 0,
        p.currentBranchStock || 0,
        p.priceRange?.min || 0,
        p.priceRange?.max || 0,
        p.isActive ? 'Active' : 'Inactive',
        p.branches?.map((b: any) => b.branchName).join('; ') || '',
      ]);

      downloadCsv(`products-export-${Date.now()}`, headers, rows);
      toast.success(`Exported ${rows.length} products to CSV.`);
    } catch (err: any) {
      toast.error(err.message || 'Export failed.');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  // CSV Import File Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const { headers, rows } = parseCsv(content);

      if (rows.length === 0) {
        toast.error('The uploaded CSV is empty or incorrectly formatted.');
        return;
      }

      // Validate required columns
      const validated: any[] = [];
      const errors: { row: number; error: string }[] = [];

      rows.forEach((r: any, idx: number) => {
        const rowNum = idx + 2; // account for header
        const nameVal = r['Product Name'] || r['name'] || r['Name'];
        const codeVal = r['Style Code'] || r['code'] || r['Code'];
        const categoryVal = r['Category'] || r['category'];
        const retailVal = r['Retail Price'] || r['retailPrice'] || r['price'];

        if (!nameVal) {
          errors.push({ row: rowNum, error: 'Missing Product Name' });
          return;
        }
        if (!codeVal) {
          errors.push({ row: rowNum, error: 'Missing Style Code' });
          return;
        }

        validated.push({
          rowNum,
          name: nameVal,
          code: codeVal.toUpperCase(),
          categoryName: categoryVal,
          retailPrice: Number(retailVal) || 0,
        });
      });

      setImportRows(validated);
      setImportErrors(errors);
      setIsImportModalOpen(true);
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Execute Batch Creation
  const handleExecuteImport = async () => {
    if (importRows.length === 0) return;

    // Resolve default category and unit if needed
    const defaultCategory = categories[0]?.id;
    const unitsList: any[] = await queryClient.fetchQuery({
      queryKey: ['units'],
      queryFn: () => api.catalog.units.list(),
    });
    const defaultUnit = unitsList[0]?.id;

    if (!defaultCategory || !defaultUnit) {
      toast.error('Please create at least one Category and Unit before importing products.');
      return;
    }

    setImportProgress({ current: 0, total: importRows.length });
    const batchSize = 5;
    let successCount = 0;
    const finalErrors = [...importErrors];

    for (let i = 0; i < importRows.length; i += batchSize) {
      const batch = importRows.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (row) => {
          try {
            // Find category by name or fallback
            const matchCat = categories.find(
              (c: any) => c.name.toLowerCase() === (row.categoryName || '').toLowerCase(),
            );
            const categoryIdToUse = matchCat ? matchCat.id : defaultCategory;

            await api.catalog.products.create({
              name: row.name,
              code: row.code,
              categoryId: categoryIdToUse,
              unitId: defaultUnit,
              hasVariants: false,
              variants: [
                {
                  sku: row.code,
                  retailPrice: row.retailPrice,
                  wholesalePrice: row.retailPrice,
                  costPrice: 0,
                  reorderLevel: 5,
                },
              ],
            });
            successCount++;
          } catch (err: any) {
            finalErrors.push({
              row: row.rowNum,
              error: err.message || 'Creation failed',
            });
          }
        }),
      );

      setImportProgress({
        current: Math.min(i + batchSize, importRows.length),
        total: importRows.length,
      });
    }

    setImportSuccessCount(successCount);
    setImportErrors(finalErrors);
    queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.success(`Import complete! ${successCount} products added.`);
  };

  // Download Sample Template
  const handleDownloadSampleTemplate = () => {
    const headers = ['Product Name', 'Style Code', 'Category', 'Retail Price'];
    const sampleRows = [
      ['Classic Oxford Shirt', 'OXF-001', 'Shirts', 1850],
      ['Slim Fit Denim Pant', 'DNM-002', 'Pants', 2450],
      ['Embroidered Cotton Panjabi', 'PNJ-003', 'Panjabi', 3200],
    ];
    downloadCsv('product-import-template', headers, sampleRows);
  };

  // DataTable Columns definition
  const columns: Column<any>[] = [
    {
      header: 'Product & Code',
      accessor: (r: any) => (
        <div className="flex items-center gap-3">
          {/* Avatar / Placeholder */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-100 to-teal-50 dark:from-emerald-950 dark:to-teal-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
            {r.name.slice(0, 2)}
          </div>
          <div>
            <Link
              href={`/products/${r.id}`}
              className="font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors line-clamp-1"
            >
              {r.name}
            </Link>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[11px] font-semibold text-slate-500">{r.code}</span>
              {r.trackIndividually && (
                <Badge variant="outline" className="text-[9px] py-0 px-1 border-purple-200 text-purple-700 dark:text-purple-300">
                  Serialized
                </Badge>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Category & Brand',
      accessor: (r: any) => (
        <div>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
            {r.category?.name || '-'}
          </span>
          <span className="text-[11px] text-slate-400 block">{r.brand?.name || 'No Brand'}</span>
        </div>
      ),
    },
    {
      header: 'Gender',
      accessor: (r: any) => (
        <Badge variant="outline" className="text-[10px] font-medium">
          {r.gender || 'UNISEX'}
        </Badge>
      ),
    },
    {
      header: 'Variants',
      accessor: (r: any) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {r.variantsCount || 1} {r.variantsCount === 1 ? 'Variant' : 'Variants'}
        </span>
      ),
    },
    {
      header: 'Current Stock',
      accessor: (r: any) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
            r.currentBranchStock > 0
              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
          }`}
        >
          {r.currentBranchStock || 0} {r.unit?.name || 'Pcs'}
        </span>
      ),
    },
    {
      header: 'Price Range',
      accessor: (r: any) => {
        const min = r.priceRange?.min || 0;
        const max = r.priceRange?.max || 0;
        return (
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
            {min === max ? formatBDT(min) : `${formatBDT(min)} - ${formatBDT(max)}`}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessor: (r: any) => (
        <Badge variant={r.isActive ? 'success' : 'secondary'} className="text-[10px]">
          {r.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    ...(isOwnerOrAdmin
      ? [
          {
            header: 'Branches',
            accessor: (r: any) => (
              <div className="flex flex-wrap gap-1 max-w-[150px]">
                {r.branches && r.branches.length > 0 ? (
                  r.branches.map((b: any) => (
                    <span
                      key={b.branchId}
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      title={b.branchName}
                    >
                      {b.branchCode || b.branchName.slice(0, 3)}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-400 italic">None</span>
                )}
              </div>
            ),
          },
        ]
      : []),
    {
      header: 'Actions',
      align: 'right',
      accessor: (r: any) => (
        <div className="flex items-center justify-end gap-1">
          {/* View Details */}
          <Link
            href={`/products/${r.id}`}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            title="View Product"
          >
            <Eye className="w-4 h-4" />
          </Link>

          {/* Edit */}
          {canUpdate && (
            <Link
              href={`/products/${r.id}/edit`}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              title="Edit Product"
            >
              <Edit2 className="w-4 h-4" />
            </Link>
          )}

          {/* Print Barcodes */}
          {canPrintBarcode && (
            <Link
              href={`/catalog/barcodes?productId=${r.id}`}
              className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-600 dark:text-slate-400 hover:text-emerald-600"
              title="Print Barcode Labels"
            >
              <Barcode className="w-4 h-4" />
            </Link>
          )}

          {/* Delete */}
          {canDelete && (
            <button
              type="button"
              onClick={() => setDeletingProduct(r)}
              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-600 dark:text-slate-400 hover:text-rose-600"
              title="Delete Product"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              {t('catalog.productsTitle')}
            </h1>
            <Badge variant="outline" className="text-xs font-semibold">
              {currentBranch?.name || 'Current Branch'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">{t('catalog.productsSubtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Barcode Scanner Shortcut */}
          <Link href="/catalog/lookup">
            <Button variant="outline" size="sm">
              <ScanLine className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
              Scan Barcode
            </Button>
          </Link>

          {/* CSV Import */}
          {canCreate && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-1.5" />
                {t('catalog.importCsv')}
              </Button>
            </>
          )}

          {/* CSV Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-1.5" />
            {isExporting ? `Exporting (${exportProgress}%)` : t('catalog.exportCsv')}
          </Button>

          {/* Create Product Button */}
          {canCreate && (
            <Link href="/products/new">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                {t('catalog.newProduct')}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {/* Search Box */}
          <div className="md:col-span-2">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder={t('catalog.searchPlaceholder')}
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">{t('catalog.filterCategory')}</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Brand Filter */}
          <select
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">{t('catalog.filterBrand')}</option>
            {brands.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Season Filter */}
          <select
            value={seasonId}
            onChange={(e) => {
              setSeasonId(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">{t('catalog.filterSeason')}</option>
            {seasons.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Gender Filter */}
          <select
            value={gender}
            onChange={(e) => {
              setGender(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">{t('catalog.filterGender')}</option>
            <option value="MEN">Men</option>
            <option value="WOMEN">Women</option>
            <option value="KIDS">Kids</option>
            <option value="UNISEX">Unisex</option>
          </select>
        </div>

        {/* Secondary Row: Status & Admin Branch Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-semibold">Status:</span>
            {['', 'active', 'inactive'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-full font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {st === '' ? 'All' : st === 'active' ? 'Active' : 'Inactive'}
              </button>
            ))}

            {/* Clear Filters Button */}
            {(search || categoryId || brandId || seasonId || gender || statusFilter || adminBranchId) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCategoryId('');
                  setBrandId('');
                  setSeasonId('');
                  setGender('');
                  setStatusFilter('');
                  setAdminBranchId('');
                  setPage(1);
                }}
                className="px-2 py-1 text-slate-500 hover:text-rose-600 underline text-xs"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Admin Multi-Branch Filter */}
          {isOwnerOrAdmin && (
            <div className="flex items-center gap-2">
              <Store className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-slate-500 font-medium">Branch Scope:</span>
              <select
                value={adminBranchId}
                onChange={(e) => {
                  setAdminBranchId(e.target.value);
                  setPage(1);
                }}
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">{t('catalog.allBranchesOption')}</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main DataTable */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm overflow-hidden">
        <DataTable
          data={products}
          keyField="id"
          columns={columns}
          isLoading={isLoading}
          pagination={{
            page: meta.page,
            totalPages: meta.totalPages,
            totalItems: meta.total,
            limit: meta.limit,
            onPageChange: (p: number) => setPage(p),
          }}
          emptyMessage={
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <Boxes className="w-12 h-12 text-slate-300 dark:text-slate-700" />
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {t('catalog.noProductsInBranch')}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  {isOwnerOrAdmin
                    ? t('catalog.existsInOtherBranchesHint')
                    : t('catalog.createFirstProduct')}
                </p>
              </div>
              {canCreate && (
                <Link href="/products/new">
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1.5" />
                    {t('catalog.newProduct')}
                  </Button>
                </Link>
              )}
            </div>
          }
        />
      </div>

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deletingProduct)}
        onClose={() => setDeletingProduct(null)}
        onConfirm={() => deleteMutation.mutate(deletingProduct.id)}
        title="Delete Product"
        description={`Are you sure you want to soft-delete product "${deletingProduct?.name}" (${deletingProduct?.code})? Its variants and branch associations will be deactivated.`}
        confirmText="Soft Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* CSV IMPORT DIALOG */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Product CSV Import Preview
              </h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span>
                  Found <strong>{importRows.length}</strong> valid rows to import.
                </span>
                <button
                  type="button"
                  onClick={handleDownloadSampleTemplate}
                  className="text-emerald-600 hover:underline font-semibold"
                >
                  Download Sample CSV
                </button>
              </div>

              {importErrors.length > 0 && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Errors in CSV:
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {importErrors.slice(0, 5).map((e, i) => (
                      <li key={i}>
                        Row {e.row}: {e.error}
                      </li>
                    ))}
                    {importErrors.length > 5 && (
                      <li>...and {importErrors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2.5">Row</th>
                      <th className="p-2.5">Style Code</th>
                      <th className="p-2.5">Product Name</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5 text-right">Retail Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {importRows.slice(0, 10).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-2.5 text-slate-400">{r.rowNum}</td>
                        <td className="p-2.5 font-mono font-bold">{r.code}</td>
                        <td className="p-2.5">{r.name}</td>
                        <td className="p-2.5 text-slate-500">{r.categoryName || 'Default'}</td>
                        <td className="p-2.5 text-right font-semibold">{formatBDT(r.retailPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {importProgress && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Importing in batches...</span>
                    <span>
                      {importProgress.current} / {importProgress.total}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-300"
                      style={{
                        width: `${Math.round((importProgress.current / importProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={() => setIsImportModalOpen(false)}
                disabled={Boolean(importProgress)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExecuteImport}
                disabled={Boolean(importProgress) || importRows.length === 0}
                isLoading={Boolean(importProgress)}
              >
                Execute Import ({importRows.length} items)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
