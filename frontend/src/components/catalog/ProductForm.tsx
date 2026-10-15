'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { generateIdempotencyKey } from '@/lib/utils/idempotency';
import { isRetailBelowCost } from '@/lib/utils/money';
import { formatBDT } from '@/lib/utils/formatters';

import { FormFieldWrapper } from '@/components/shared/FormFieldWrapper';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PlanLimitDialog } from '@/components/feedback/PlanLimitDialog';
import { QuickCreateModal, MasterDataType } from './QuickCreateModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import {
  Boxes,
  Plus,
  Trash2,
  Copy,
  Sparkles,
  AlertTriangle,
  Store,
  Layers,
  HelpCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  X,
} from 'lucide-react';

export interface VariantRow {
  id?: string; // only if existing
  sizeId?: string;
  colorId?: string;
  sku: string;
  barcode: string;
  retailPrice: number | string;
  wholesalePrice: number | string;
  costPrice: number | string;
  reorderLevel: number | string;
  isActive?: boolean;
}

interface ProductFormProps {
  mode: 'create' | 'edit';
  initialData?: any;
}

export function ProductForm({ mode, initialData }: ProductFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const currentBranchId = useBranchStore((s) => s.currentBranchId);
  const currentBranch = useBranchStore((s) => s.currentBranch);
  const isOwnerOrAdmin = user?.isOwner;

  // Basic Information Form State
  const [name, setName] = useState(initialData?.name || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [categoryId, setCategoryId] = useState(initialData?.category?.id || initialData?.category_id || '');
  const [brandId, setBrandId] = useState(initialData?.brand?.id || initialData?.brand_id || '');
  const [seasonId, setSeasonId] = useState(initialData?.season?.id || initialData?.season_id || '');
  const [unitId, setUnitId] = useState(initialData?.unit?.id || initialData?.unit_id || '');
  const [gender, setGender] = useState(initialData?.gender || 'UNISEX');
  const [fabric, setFabric] = useState(initialData?.fabric || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [hasVariants, setHasVariants] = useState(initialData ? initialData.hasVariants : true);
  const [trackIndividually, setTrackIndividually] = useState(initialData ? initialData.trackIndividually : false);
  const [confirmTrackChange, setConfirmTrackChange] = useState(false);

  // Branch Selection State (Admin only)
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(() => {
    if (initialData?.branches && Array.isArray(initialData.branches)) {
      return initialData.branches.map((b: any) => b.branchId || b.id);
    }
    return currentBranchId ? [currentBranchId] : [];
  });

  // Variants Matrix State
  const [variants, setVariants] = useState<VariantRow[]>(() => {
    if (initialData?.variants && initialData.variants.length > 0) {
      return initialData.variants.map((v: any) => ({
        id: v.id,
        sizeId: v.size?.id || v.size_id || undefined,
        colorId: v.color?.id || v.color_id || undefined,
        sku: v.sku || '',
        barcode: v.barcode || '',
        retailPrice: v.retailPrice ?? v.retail_price ?? 0,
        wholesalePrice: v.wholesalePrice ?? v.wholesale_price ?? 0,
        costPrice: v.costPrice ?? v.cost_price ?? 0,
        reorderLevel: v.reorderLevel ?? v.reorder_level ?? 5,
        isActive: v.isActive ?? true,
      }));
    }
    return [
      {
        sku: '',
        barcode: initialData?.barcode || '',
        retailPrice: '',
        wholesalePrice: '',
        costPrice: '',
        reorderLevel: 5,
      },
    ];
  });

  // Errors & Warnings State
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [variantRowErrors, setVariantRowErrors] = useState<Record<number, Record<string, string>>>({});
  const [planLimitError, setPlanLimitError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Quick Create Modal State
  const [quickCreateType, setQuickCreateType] = useState<MasterDataType | null>(null);

  // Bulk Generator State
  const [isBulkGeneratorOpen, setIsBulkGeneratorOpen] = useState(false);
  const [bulkSelectedSizes, setBulkSelectedSizes] = useState<string[]>([]);
  const [bulkSelectedColors, setBulkSelectedColors] = useState<string[]>([]);
  const [bulkDefaultRetail, setBulkDefaultRetail] = useState<string>('');
  const [bulkDefaultWholesale, setBulkDefaultWholesale] = useState<string>('');
  const [bulkDefaultCost, setBulkDefaultCost] = useState<string>('');
  const [bulkDefaultReorder, setBulkDefaultReorder] = useState<number>(5);
  const [bulkPreview, setBulkPreview] = useState<VariantRow[]>([]);

  // Master Data Lookups
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

  const { data: sizes = [] } = useQuery({
    queryKey: ['sizes'],
    queryFn: () => api.catalog.sizes.list(),
  });

  const { data: colors = [] } = useQuery({
    queryKey: ['colors'],
    queryFn: () => api.catalog.colors.list(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => api.catalog.units.list(),
  });

  const { data: allBranches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.branches.list(false),
    enabled: Boolean(isOwnerOrAdmin),
  });

  // Pre-select first unit & category if new
  useEffect(() => {
    if (mode === 'create') {
      if (!unitId && units.length > 0) setUnitId(units[0].id);
      if (!categoryId && categories.length > 0) setCategoryId(categories[0].id);
    }
  }, [mode, units, categories, unitId, categoryId]);

  // Unsaved changes beforeunload handler
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Auto Generate Code Helper
  const handleAutoGenerateCode = () => {
    if (name.trim()) {
      const clean = name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 4);
      const rand = Math.floor(1000 + Math.random() * 9000);
      setCode(`${clean || 'PROD'}-${rand}`);
    } else {
      const rand = Math.floor(100000 + Math.random() * 900000);
      setCode(`SKU-${rand}`);
    }
    setIsDirty(true);
  };

  // Add Variant Row
  const handleAddVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      {
        sku: '',
        barcode: '',
        retailPrice: prev[0]?.retailPrice || '',
        wholesalePrice: prev[0]?.wholesalePrice || '',
        costPrice: prev[0]?.costPrice || '',
        reorderLevel: 5,
      },
    ]);
    setIsDirty(true);
  };

  // Duplicate Variant Row
  const handleDuplicateRow = (idx: number) => {
    const target = variants[idx];
    if (!target) return;
    setVariants((prev) => [
      ...prev.slice(0, idx + 1),
      {
        ...target,
        id: undefined,
        sku: '',
        barcode: '',
      },
      ...prev.slice(idx + 1),
    ]);
    setIsDirty(true);
  };

  // Remove Variant Row
  const handleRemoveRow = (idx: number) => {
    if (variants.length <= 1) {
      toast.error('At least one variant row must remain.');
      return;
    }
    setVariants((prev) => prev.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  // Update Variant Row Field
  const updateVariantRow = (idx: number, field: keyof VariantRow, val: any) => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
    setIsDirty(true);
  };

  // Check for duplicate Size + Color combinations within the form
  const duplicateMatrixError = useMemo(() => {
    if (!hasVariants) return null;
    const seen = new Set<string>();
    for (let i = 0; i < variants.length; i++) {
      const row = variants[i];
      if (row.sizeId && row.colorId) {
        const key = `${row.sizeId}:${row.colorId}`;
        if (seen.has(key)) {
          return t('catalog.duplicateVariantError');
        }
        seen.add(key);
      }
    }
    return null;
  }, [variants, hasVariants, t]);

  // Bulk Generator Handler
  const handleGenerateBulkCombinations = () => {
    if (bulkSelectedSizes.length === 0 || bulkSelectedColors.length === 0) {
      toast.error('Please select at least one Size and one Color.');
      return;
    }

    const combinations: VariantRow[] = [];
    bulkSelectedSizes.forEach((szId) => {
      bulkSelectedColors.forEach((colId) => {
        combinations.push({
          sizeId: szId,
          colorId: colId,
          sku: '',
          barcode: '',
          retailPrice: bulkDefaultRetail || 0,
          wholesalePrice: bulkDefaultWholesale || 0,
          costPrice: bulkDefaultCost || 0,
          reorderLevel: bulkDefaultReorder || 5,
        });
      });
    });

    setBulkPreview(combinations);
  };

  const handleApplyBulkVariants = () => {
    if (bulkPreview.length === 0) return;
    setVariants((prev) => {
      // If previous had only 1 blank row, replace it
      if (prev.length === 1 && !prev[0].sizeId && !prev[0].colorId && !prev[0].sku) {
        return bulkPreview;
      }
      return [...prev, ...bulkPreview];
    });
    setIsBulkGeneratorOpen(false);
    setIsDirty(true);
    toast.success(`Added ${bulkPreview.length} generated variants to form.`);
  };

  // Submission Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      setFieldErrors({});
      setVariantRowErrors({});

      // Client validation
      if (!name.trim()) throw new Error('Product Name is required.');
      if (!code.trim()) throw new Error('Product Style Code is required.');
      if (!categoryId) throw new Error('Category is required.');
      if (!unitId) throw new Error('Unit is required.');
      if (duplicateMatrixError) throw new Error(duplicateMatrixError);

      const variantsPayload = variants.map((v) => ({
        sizeId: v.sizeId || undefined,
        colorId: v.colorId || undefined,
        sku: v.sku.trim() || undefined,
        barcode: v.barcode.trim() || undefined,
        retailPrice: Number(v.retailPrice) || 0,
        wholesalePrice: Number(v.wholesalePrice) || 0,
        costPrice: Number(v.costPrice) || 0,
        reorderLevel: Number(v.reorderLevel) || 5,
      }));

      // Validate prices >= 0
      for (let i = 0; i < variantsPayload.length; i++) {
        if (variantsPayload[i].retailPrice < 0) {
          throw new Error(`Row ${i + 1}: Retail price cannot be negative.`);
        }
      }

      if (mode === 'create') {
        return api.catalog.products.create(
          {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            categoryId,
            brandId: brandId || undefined,
            seasonId: seasonId || undefined,
            unitId,
            gender,
            fabric: fabric.trim() || undefined,
            description: description.trim() || undefined,
            hasVariants,
            trackIndividually,
            branchIds: isOwnerOrAdmin && selectedBranchIds.length > 0 ? selectedBranchIds : undefined,
            variants: variantsPayload,
          },
          { idempotencyKey: generateIdempotencyKey('prod-create') },
        );
      } else {
        // Edit mode
        await api.catalog.products.update(initialData.id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          categoryId,
          brandId: brandId || null,
          seasonId: seasonId || null,
          unitId,
          gender,
          fabric: fabric.trim() || null,
          description: description.trim() || null,
          hasVariants,
          trackIndividually,
        });

        // Update/create variants
        for (const v of variants) {
          if (v.id) {
            await api.catalog.variants.update(v.id, {
              sku: v.sku.trim() || undefined,
              barcode: v.barcode.trim() || undefined,
              retailPrice: Number(v.retailPrice) || 0,
              wholesalePrice: Number(v.wholesalePrice) || 0,
              costPrice: Number(v.costPrice) || 0,
              reorderLevel: Number(v.reorderLevel) || 5,
            });
          } else {
            await api.catalog.variants.create(initialData.id, {
              sizeId: v.sizeId || undefined,
              colorId: v.colorId || undefined,
              sku: v.sku.trim() || undefined,
              barcode: v.barcode.trim() || undefined,
              retailPrice: Number(v.retailPrice) || 0,
              wholesalePrice: Number(v.wholesalePrice) || 0,
              costPrice: Number(v.costPrice) || 0,
              reorderLevel: Number(v.reorderLevel) || 5,
            });
          }
        }

        return { id: initialData.id };
      }
    },
    onSuccess: (res: any) => {
      setIsDirty(false);
      toast.success(mode === 'create' ? 'Product created successfully.' : 'Product updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      const targetId = res?.id || res?.product?.id || initialData?.id;
      if (targetId) {
        router.push(`/products/${targetId}`);
      } else {
        router.push('/products');
      }
    },
    onError: (err: any) => {
      if (err.name === 'PlanLimitReachedError' || err.code === 'PLAN_LIMIT_REACHED') {
        setPlanLimitError(err.message);
        return;
      }

      if (err.statusCode === 409) {
        const msg = err.message || '';
        if (msg.toLowerCase().includes('code')) {
          setFieldErrors({ code: msg });
        } else if (msg.toLowerCase().includes('sku')) {
          setFieldErrors({ sku: msg });
        } else if (msg.toLowerCase().includes('barcode')) {
          setFieldErrors({ barcode: msg });
        } else {
          toast.error(msg);
        }
      } else if (err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      } else {
        toast.error(err.message || 'Submission failed.');
      }
    },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              {mode === 'create' ? t('catalog.newProduct') : `Edit Style: ${initialData?.code || name}`}
            </h1>
            <p className="text-xs text-slate-500">
              {mode === 'create'
                ? 'Create a style with size/color combinations, barcodes, and branch availability.'
                : 'Update style information, prices, and variant properties.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" onClick={() => router.back()} disabled={saveMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            isLoading={saveMutation.isPending}
            disabled={Boolean(duplicateMatrixError)}
          >
            {mode === 'create' ? 'Create Product & Variants' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {duplicateMatrixError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{duplicateMatrixError}</span>
        </div>
      )}

      {/* SECTION 1: BASIC GARMENT INFO */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {t('catalog.basicInfo')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Product Name */}
          <div className="lg:col-span-2">
            <FormFieldWrapper label={t('catalog.productName')} required error={fieldErrors.name}>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setIsDirty(true);
                  if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: '' }));
                }}
                placeholder="e.g. Premium Cotton Panjabi - Festive Edit"
              />
            </FormFieldWrapper>
          </div>

          {/* Style Code with Auto Generate */}
          <div>
            <FormFieldWrapper
              label={t('catalog.productCode')}
              required
              error={fieldErrors.code}
              hint="Unique style identifier"
            >
              <div className="flex items-center gap-1.5">
                <Input
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setIsDirty(true);
                    if (fieldErrors.code) setFieldErrors((p) => ({ ...p, code: '' }));
                  }}
                  placeholder="e.g. PNJ-010"
                  className="uppercase font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoGenerateCode}
                  className="shrink-0 text-xs px-2.5"
                  title="Auto generate code from style title"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Auto
                </Button>
              </div>
            </FormFieldWrapper>
          </div>

          {/* Category with Quick Create */}
          <div>
            <FormFieldWrapper label={t('catalog.categories')} required error={fieldErrors.categoryId}>
              <div className="flex items-center gap-1.5">
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Select Category</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickCreateType('category')}
                  className="shrink-0 px-2"
                  title="Quick create Category"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                </Button>
              </div>
            </FormFieldWrapper>
          </div>

          {/* Brand with Quick Create */}
          <div>
            <FormFieldWrapper label={t('catalog.brands')} error={fieldErrors.brandId}>
              <div className="flex items-center gap-1.5">
                <select
                  value={brandId}
                  onChange={(e) => {
                    setBrandId(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">No Brand / In-house</option>
                  {brands.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickCreateType('brand')}
                  className="shrink-0 px-2"
                  title="Quick create Brand"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                </Button>
              </div>
            </FormFieldWrapper>
          </div>

          {/* Season with Quick Create */}
          <div>
            <FormFieldWrapper label={t('catalog.seasons')}>
              <div className="flex items-center gap-1.5">
                <select
                  value={seasonId}
                  onChange={(e) => {
                    setSeasonId(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">No Season / Regular Collection</option>
                  {seasons.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickCreateType('season')}
                  className="shrink-0 px-2"
                  title="Quick create Season"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                </Button>
              </div>
            </FormFieldWrapper>
          </div>

          {/* Unit with Quick Create */}
          <div>
            <FormFieldWrapper label={t('catalog.units')} required error={fieldErrors.unitId}>
              <div className="flex items-center gap-1.5">
                <select
                  value={unitId}
                  onChange={(e) => {
                    setUnitId(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {units.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickCreateType('unit')}
                  className="shrink-0 px-2"
                  title="Quick create Unit"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                </Button>
              </div>
            </FormFieldWrapper>
          </div>

          {/* Gender */}
          <div>
            <FormFieldWrapper label={t('catalog.gender')}>
              <select
                value={gender}
                onChange={(e) => {
                  setGender(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="MEN">Men</option>
                <option value="WOMEN">Women</option>
                <option value="KIDS">Kids</option>
                <option value="UNISEX">Unisex</option>
              </select>
            </FormFieldWrapper>
          </div>

          {/* Fabric */}
          <div>
            <FormFieldWrapper label={t('catalog.fabric')}>
              <Input
                value={fabric}
                onChange={(e) => {
                  setFabric(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="e.g. 100% Jacquard Cotton, Denim"
              />
            </FormFieldWrapper>
          </div>
        </div>

        {/* Description */}
        <FormFieldWrapper label={t('catalog.description')}>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setIsDirty(true);
            }}
            placeholder="Care instructions, silhouette details..."
            rows={2}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </FormFieldWrapper>

        {/* Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Has Variants Toggle */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <input
              type="checkbox"
              id="hasVariants"
              checked={hasVariants}
              onChange={(e) => {
                setHasVariants(e.target.checked);
                setIsDirty(true);
              }}
              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <div>
              <label htmlFor="hasVariants" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                {t('catalog.hasVariants')}
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">{t('catalog.hasVariantsDesc')}</p>
            </div>
          </div>

          {/* Track Individually Toggle */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <input
              type="checkbox"
              id="trackIndividually"
              checked={trackIndividually}
              onChange={(e) => {
                if (mode === 'edit' && initialData) {
                  setConfirmTrackChange(true);
                } else {
                  setTrackIndividually(e.target.checked);
                  setIsDirty(true);
                }
              }}
              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <label htmlFor="trackIndividually" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  {t('catalog.trackIndividually')}
                </label>
                <span title={t('catalog.trackIndividuallyTooltip')} className="cursor-help">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{t('catalog.trackIndividuallyTooltip')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: VARIANTS MATRIX */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {t('catalog.variantsSection')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {hasVariants
                ? 'Configure size, color, SKU, barcode, and pricing for each garment variant.'
                : 'Standard single variant price and barcode settings.'}
            </p>
          </div>

          {hasVariants && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBulkGeneratorOpen(true)}
                className="text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                {t('catalog.bulkGeneratorBtn')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAddVariantRow}
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Row
              </Button>
            </div>
          )}
        </div>

        {/* Variant Rows Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                {hasVariants && <th className="p-2.5 w-28">Size</th>}
                {hasVariants && <th className="p-2.5 w-32">Color</th>}
                <th className="p-2.5 w-36">SKU (Auto if blank)</th>
                <th className="p-2.5 w-36">Barcode (Auto)</th>
                <th className="p-2.5 w-28">Retail (৳)*</th>
                <th className="p-2.5 w-28">Wholesale (৳)</th>
                <th className="p-2.5 w-28">Cost (৳)</th>
                <th className="p-2.5 w-20">Reorder</th>
                {hasVariants && <th className="p-2.5 w-20 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {variants.map((row, idx) => {
                const belowCost = isRetailBelowCost(row.retailPrice, row.costPrice);
                return (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    {/* Size Selector */}
                    {hasVariants && (
                      <td className="p-2">
                        <select
                          value={row.sizeId || ''}
                          onChange={(e) => updateVariantRow(idx, 'sizeId', e.target.value)}
                          className="w-full h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                        >
                          <option value="">Select Size</option>
                          {sizes.map((s: any) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}

                    {/* Color Selector */}
                    {hasVariants && (
                      <td className="p-2">
                        <select
                          value={row.colorId || ''}
                          onChange={(e) => updateVariantRow(idx, 'colorId', e.target.value)}
                          className="w-full h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                        >
                          <option value="">Select Color</option>
                          {colors.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}

                    {/* SKU */}
                    <td className="p-2">
                      <Input
                        value={row.sku}
                        onChange={(e) => updateVariantRow(idx, 'sku', e.target.value)}
                        placeholder="e.g. PNJ-M-BLU"
                        className="h-8 font-mono text-[11px] uppercase"
                      />
                    </td>

                    {/* Barcode */}
                    <td className="p-2">
                      <Input
                        value={row.barcode}
                        onChange={(e) => updateVariantRow(idx, 'barcode', e.target.value)}
                        placeholder="Auto"
                        className="h-8 font-mono text-[11px]"
                      />
                    </td>

                    {/* Retail Price */}
                    <td className="p-2">
                      <div className="relative">
                        <Input
                          type="number"
                          value={row.retailPrice}
                          onChange={(e) => updateVariantRow(idx, 'retailPrice', e.target.value)}
                          placeholder="0"
                          min={0}
                          step="0.01"
                          className={`h-8 font-semibold ${
                            belowCost ? 'border-amber-400 bg-amber-50/30' : ''
                          }`}
                        />
                        {belowCost && (
                          <span
                            title={t('catalog.retailBelowCostWarning')}
                            className="absolute right-2 top-2 text-amber-500 cursor-help"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Wholesale Price */}
                    <td className="p-2">
                      <Input
                        type="number"
                        value={row.wholesalePrice}
                        onChange={(e) => updateVariantRow(idx, 'wholesalePrice', e.target.value)}
                        placeholder="0"
                        min={0}
                        step="0.01"
                        className="h-8 text-slate-600 dark:text-slate-400"
                      />
                    </td>

                    {/* Cost Price */}
                    <td className="p-2">
                      <Input
                        type="number"
                        value={row.costPrice}
                        onChange={(e) => updateVariantRow(idx, 'costPrice', e.target.value)}
                        placeholder="0"
                        min={0}
                        step="0.01"
                        className="h-8 text-slate-600 dark:text-slate-400"
                      />
                    </td>

                    {/* Reorder Level */}
                    <td className="p-2">
                      <Input
                        type="number"
                        value={row.reorderLevel}
                        onChange={(e) => updateVariantRow(idx, 'reorderLevel', e.target.value)}
                        min={0}
                        className="h-8 text-center"
                      />
                    </td>

                    {/* Actions */}
                    {hasVariants && (
                      <td className="p-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(idx)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700"
                            title="Duplicate Row"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                            title="Remove Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: BRANCH AVAILABILITY */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {t('catalog.branchAvailability')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isOwnerOrAdmin
                ? t('catalog.selectBranchesAdmin')
                : `${t('catalog.branchAssignedNotice')} ${currentBranch?.name || ''}`}
            </p>
          </div>

          {isOwnerOrAdmin && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedBranchIds(allBranches.map((b: any) => b.id))}
                className="text-xs"
              >
                {t('catalog.selectAll')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedBranchIds(currentBranchId ? [currentBranchId] : [])}
                className="text-xs"
              >
                {t('catalog.deselectAll')}
              </Button>
            </div>
          )}
        </div>

        {isOwnerOrAdmin ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {allBranches.map((b: any) => {
              const checked = selectedBranchIds.includes(b.id);
              return (
                <label
                  key={b.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    checked
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setIsDirty(true);
                      if (e.target.checked) {
                        setSelectedBranchIds((prev) => [...prev, b.id]);
                      } else {
                        setSelectedBranchIds((prev) => prev.filter((id) => id !== b.id));
                      }
                    }}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-bold">{b.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Code: {b.code}</p>
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              This garment will be active in <strong>{currentBranch?.name}</strong> ({currentBranch?.code}).
            </span>
          </div>
        )}
      </div>

      {/* QUICK CREATE MASTER DATA MODAL */}
      {quickCreateType && (
        <QuickCreateModal
          type={quickCreateType}
          isOpen={Boolean(quickCreateType)}
          onClose={() => setQuickCreateType(null)}
          onSuccess={(item) => {
            if (quickCreateType === 'category') setCategoryId(item.id);
            if (quickCreateType === 'brand') setBrandId(item.id);
            if (quickCreateType === 'season') setSeasonId(item.id);
            if (quickCreateType === 'unit') setUnitId(item.id);
            setQuickCreateType(null);
          }}
          existingCategories={categories}
        />
      )}

      {/* BULK VARIANT GENERATOR MODAL */}
      {isBulkGeneratorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {t('catalog.bulkGeneratorTitle')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{t('catalog.bulkGeneratorDesc')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkGeneratorOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Sizes Selection */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                  {t('catalog.selectSizes')} ({bulkSelectedSizes.length} selected)
                </label>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s: any) => {
                    const sel = bulkSelectedSizes.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setBulkSelectedSizes((prev) =>
                            sel ? prev.filter((id) => id !== s.id) : [...prev, s.id],
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          sel
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colors Selection */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                  {t('catalog.selectColors')} ({bulkSelectedColors.length} selected)
                </label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c: any) => {
                    const sel = bulkSelectedColors.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setBulkSelectedColors((prev) =>
                            sel ? prev.filter((id) => id !== c.id) : [...prev, c.id],
                          );
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          sel
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-sm"
                          style={{ backgroundColor: c.hex_code || '#cbd5e1' }}
                        />
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Default Prices */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  {t('catalog.defaultPrices')}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Retail Price (৳)*
                    </label>
                    <Input
                      type="number"
                      value={bulkDefaultRetail}
                      onChange={(e) => setBulkDefaultRetail(e.target.value)}
                      placeholder="0"
                      min={0}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Wholesale (৳)
                    </label>
                    <Input
                      type="number"
                      value={bulkDefaultWholesale}
                      onChange={(e) => setBulkDefaultWholesale(e.target.value)}
                      placeholder="0"
                      min={0}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Cost Price (৳)
                    </label>
                    <Input
                      type="number"
                      value={bulkDefaultCost}
                      onChange={(e) => setBulkDefaultCost(e.target.value)}
                      placeholder="0"
                      min={0}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Reorder Alert
                    </label>
                    <Input
                      type="number"
                      value={bulkDefaultReorder}
                      onChange={(e) => setBulkDefaultReorder(Number(e.target.value))}
                      min={0}
                      className="h-8"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateBulkCombinations}
                  className="w-full mt-2"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  {t('catalog.generateCombinations')} ({bulkSelectedSizes.length * bulkSelectedColors.length} rows)
                </Button>
              </div>

              {/* Preview Combinations Table */}
              {bulkPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Generated Combinations Preview:</span>
                    <Badge variant="outline">{bulkPreview.length} rows</Badge>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto max-h-56">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-2">Size</th>
                          <th className="p-2">Color</th>
                          <th className="p-2">Retail</th>
                          <th className="p-2">Wholesale</th>
                          <th className="p-2">Cost</th>
                          <th className="p-2 text-right">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {bulkPreview.map((pRow, pIdx) => {
                          const sObj = sizes.find((s: any) => s.id === pRow.sizeId);
                          const cObj = colors.find((c: any) => c.id === pRow.colorId);
                          return (
                            <tr key={pIdx} className="hover:bg-slate-50/50">
                              <td className="p-2 font-bold">{sObj?.name}</td>
                              <td className="p-2 flex items-center gap-1.5">
                                <span
                                  className="w-3 h-3 rounded-full border border-slate-300"
                                  style={{ backgroundColor: cObj?.hex_code || '#cbd5e1' }}
                                />
                                <span>{cObj?.name}</span>
                              </td>
                              <td className="p-2 font-semibold">{formatBDT(pRow.retailPrice)}</td>
                              <td className="p-2 text-slate-500">{formatBDT(pRow.wholesalePrice)}</td>
                              <td className="p-2 text-slate-500">{formatBDT(pRow.costPrice)}</td>
                              <td className="p-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => setBulkPreview((prev) => prev.filter((_, i) => i !== pIdx))}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <Button variant="outline" onClick={() => setIsBulkGeneratorOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleApplyBulkVariants}
                disabled={bulkPreview.length === 0}
              >
                {t('catalog.applyVariants')} ({bulkPreview.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TRACK INDIVIDUALLY CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={confirmTrackChange}
        onClose={() => setConfirmTrackChange(false)}
        onConfirm={() => {
          setTrackIndividually(!trackIndividually);
          setConfirmTrackChange(false);
          setIsDirty(true);
        }}
        title="Warning: Modifying Serialization"
        description="Changing serialization tracking on an existing product that may have stock or registered units will alter barcode lookup and stock ledger behavior. The server will validate if any active units exist."
        confirmText="Confirm Change"
        variant="warning"
      />

      {/* PLAN LIMIT REACHED DIALOG */}
      <PlanLimitDialog
        isOpen={Boolean(planLimitError)}
        onClose={() => setPlanLimitError(null)}
        message={planLimitError || undefined}
        planName={user?.role?.name}
      />
    </div>
  );
}
