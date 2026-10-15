'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { usePermission } from '@/components/shared/PermissionGate';
import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { FormFieldWrapper } from '@/components/shared/FormFieldWrapper';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import {
  Layers,
  Tag,
  Sun,
  Maximize2,
  Palette,
  Scale,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  FolderTree,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  X,
  Lock,
} from 'lucide-react';

type MasterTab = 'categories' | 'brands' | 'seasons' | 'sizes' | 'colors' | 'units';

export default function MasterDataPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { hasPermission: canManageCategories } = usePermission('categories:manage');
  const { hasPermission: canManageBrands } = usePermission('brands:manage');
  const { hasPermission: canUpdateProducts } = usePermission('products:update');

  const [activeTab, setActiveTab] = useState<MasterTab>('categories');
  const [search, setSearch] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Category view mode: 'tree' | 'table'
  const [categoryViewMode, setCategoryViewMode] = useState<'tree' | 'table'>('tree');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<number>(10);
  const [hexCode, setHexCode] = useState('#000000');
  const [allowDecimal, setAllowDecimal] = useState(false);

  // Queries
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories', { search }],
    queryFn: () => api.catalog.categories.list({ search: search || undefined, includeInactive: true }),
    enabled: activeTab === 'categories',
  });

  const { data: brands = [], isLoading: loadingBrands } = useQuery({
    queryKey: ['brands', { search }],
    queryFn: () => api.catalog.brands.list({ search: search || undefined }),
    enabled: activeTab === 'brands',
  });

  const { data: seasons = [], isLoading: loadingSeasons } = useQuery({
    queryKey: ['seasons', { search }],
    queryFn: () => api.catalog.seasons.list({ search: search || undefined }),
    enabled: activeTab === 'seasons',
  });

  const { data: sizes = [], isLoading: loadingSizes } = useQuery({
    queryKey: ['sizes'],
    queryFn: () => api.catalog.sizes.list(),
    enabled: activeTab === 'sizes',
  });

  const { data: colors = [], isLoading: loadingColors } = useQuery({
    queryKey: ['colors'],
    queryFn: () => api.catalog.colors.list(),
    enabled: activeTab === 'colors',
  });

  const { data: units = [], isLoading: loadingUnits } = useQuery({
    queryKey: ['units'],
    queryFn: () => api.catalog.units.list(),
    enabled: activeTab === 'units',
  });

  // Filtered lists for simple tabs
  const filteredSizes = useMemo(() => {
    if (!search.trim()) return sizes;
    const q = search.toLowerCase();
    return sizes.filter((s: any) => s.name?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q));
  }, [sizes, search]);

  const filteredColors = useMemo(() => {
    if (!search.trim()) return colors;
    const q = search.toLowerCase();
    return colors.filter((c: any) => c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q));
  }, [colors, search]);

  const filteredUnits = useMemo(() => {
    if (!search.trim()) return units;
    const q = search.toLowerCase();
    return units.filter((u: any) => u.name?.toLowerCase().includes(q) || u.code?.toLowerCase().includes(q));
  }, [units, search]);

  // Category Tree Hierarchy Builder
  const categoryTree = useMemo(() => {
    const map = new Map<string, any>();
    const roots: any[] = [];

    categories.forEach((cat: any) => {
      map.set(cat.id, { ...cat, children: [] });
    });

    categories.forEach((cat: any) => {
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id).children.push(map.get(cat.id));
      } else {
        roots.push(map.get(cat.id));
      }
    });

    return roots;
  }, [categories]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      setFieldErrors({});
      const isEdit = Boolean(editingItem);

      if (activeTab === 'categories') {
        if (isEdit) {
          return api.catalog.categories.update(editingItem.id, {
            name: name.trim(),
            code: code.trim() || undefined,
            parentId: parentId || null,
          });
        }
        return api.catalog.categories.create({
          name: name.trim(),
          code: code.trim() || undefined,
          parentId: parentId || undefined,
        });
      }

      if (activeTab === 'brands') {
        if (isEdit) {
          return api.catalog.brands.update(editingItem.id, {
            name: name.trim(),
            code: code.trim() || undefined,
          });
        }
        return api.catalog.brands.create({
          name: name.trim(),
          code: code.trim() || undefined,
        });
      }

      if (activeTab === 'seasons') {
        if (isEdit) {
          return api.catalog.seasons.update(editingItem.id, {
            name: name.trim(),
            code: code.trim() || undefined,
          });
        }
        return api.catalog.seasons.create({
          name: name.trim(),
          code: code.trim() || undefined,
        });
      }

      if (activeTab === 'sizes') {
        if (isEdit) {
          return api.catalog.sizes.update(editingItem.id, {
            name: name.trim(),
            code: code.trim() || undefined,
            sortOrder: Number(sortOrder),
          });
        }
        return api.catalog.sizes.create({
          name: name.trim(),
          code: code.trim() || undefined,
          sortOrder: Number(sortOrder),
        });
      }

      if (activeTab === 'colors') {
        if (isEdit) {
          return api.catalog.colors.update(editingItem.id, {
            name: name.trim(),
            code: code.trim() || undefined,
            hexCode: hexCode || undefined,
          });
        }
        return api.catalog.colors.create({
          name: name.trim(),
          code: code.trim() || undefined,
          hexCode: hexCode || undefined,
        });
      }

      if (activeTab === 'units') {
        if (isEdit) {
          return api.catalog.units.update(editingItem.id, {
            name: name.trim(),
            code: code.trim() || undefined,
            allowDecimal,
          });
        }
        return api.catalog.units.create({
          name: name.trim(),
          code: code.trim() || undefined,
          allowDecimal,
        });
      }
    },
    onSuccess: () => {
      toast.success(editingItem ? 'Item updated successfully.' : 'Item created successfully.');
      queryClient.invalidateQueries({ queryKey: [activeTab] });
      closeModal();
    },
    onError: (err: any) => {
      if (err.statusCode === 409) {
        setFieldErrors({ code: err.message || 'Code already exists in your business' });
      } else if (err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      } else {
        toast.error(err.message || 'Operation failed');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: any) => {
      switch (activeTab) {
        case 'categories':
          return api.catalog.categories.delete(item.id);
        case 'brands':
          return api.catalog.brands.delete(item.id);
        case 'seasons':
          return api.catalog.seasons.delete(item.id);
        case 'sizes':
          return api.catalog.sizes.delete(item.id);
        case 'colors':
          return api.catalog.colors.delete(item.id);
        case 'units':
          return api.catalog.units.delete(item.id);
      }
    },
    onSuccess: () => {
      toast.success('Item deleted successfully.');
      queryClient.invalidateQueries({ queryKey: [activeTab] });
      setDeletingItem(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete item.');
      setDeletingItem(null);
    },
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setName('');
    setCode('');
    setParentId('');
    setSortOrder(sizes.length > 0 ? Math.max(...sizes.map((s: any) => s.sort_order || 0)) + 10 : 10);
    setHexCode('#000000');
    setAllowDecimal(false);
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    if (item.business_id === null) {
      toast.error(t('catalog.systemReadOnly'));
      return;
    }
    setEditingItem(item);
    setName(item.name || '');
    setCode(item.code || '');
    setParentId(item.parent_id || '');
    setSortOrder(item.sort_order ?? 10);
    setHexCode(item.hex_code || '#000000');
    setAllowDecimal(item.allow_decimal ?? false);
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFieldErrors({});
  };

  const toggleCollapse = (id: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Reorder Sizes
  const handleMoveSize = async (sizeItem: any, direction: 'UP' | 'DOWN') => {
    const sorted = [...sizes].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const idx = sorted.findIndex((s) => s.id === sizeItem.id);
    if (idx === -1) return;
    const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const currentOrder = sizeItem.sort_order || 0;
    const targetOrder = sorted[targetIdx].sort_order || 0;

    try {
      await api.catalog.sizes.update(sizeItem.id, { sortOrder: targetOrder });
      await api.catalog.sizes.update(sorted[targetIdx].id, { sortOrder: currentOrder });
      queryClient.invalidateQueries({ queryKey: ['sizes'] });
      toast.success('Sizes reordered');
    } catch {
      toast.error('Could not reorder sizes');
    }
  };

  const canCreate =
    (activeTab === 'categories' && canManageCategories) ||
    (activeTab === 'brands' && canManageBrands) ||
    (activeTab !== 'categories' && activeTab !== 'brands' && canUpdateProducts);

  const tabsConfig = [
    { id: 'categories', label: t('catalog.categories'), icon: Layers },
    { id: 'brands', label: t('catalog.brands'), icon: Tag },
    { id: 'seasons', label: t('catalog.seasons'), icon: Sun },
    { id: 'sizes', label: t('catalog.sizes'), icon: Maximize2 },
    { id: 'colors', label: t('catalog.colors'), icon: Palette },
    { id: 'units', label: t('catalog.units'), icon: Scale },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {t('catalog.masterDataTitle')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">{t('catalog.masterDataSubtitle')}</p>
        </div>

        {canCreate && (
          <Button onClick={openCreateModal} className="shrink-0">
            <Plus className="w-4 h-4 mr-1.5" />
            {activeTab === 'categories' && t('catalog.addCategory')}
            {activeTab === 'brands' && t('catalog.addBrand')}
            {activeTab === 'seasons' && t('catalog.addSeason')}
            {activeTab === 'sizes' && t('catalog.addSize')}
            {activeTab === 'colors' && t('catalog.addColor')}
            {activeTab === 'units' && t('catalog.addUnit')}
          </Button>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-2xl overflow-x-auto border border-slate-200/80 dark:border-slate-800">
        {tabsConfig.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearch('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm shadow-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:max-w-md">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Search ${activeTab}...`}
          />
        </div>

        {activeTab === 'categories' && (
          <div className="flex items-center gap-2 self-end">
            <button
              type="button"
              onClick={() => setCategoryViewMode('tree')}
              className={`p-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                categoryViewMode === 'tree'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
              }`}
              title="Hierarchical Tree View"
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Tree View</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoryViewMode('table')}
              className={`p-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                categoryViewMode === 'table'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
              }`}
              title="Flat Table View"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm overflow-hidden">
        {/* CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div>
            {loadingCategories ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading categories...</div>
            ) : categoryViewMode === 'tree' ? (
              <div className="space-y-2">
                {categoryTree.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">No categories found.</div>
                ) : (
                  categoryTree.map((node) => (
                    <CategoryTreeNode
                      key={node.id}
                      node={node}
                      level={0}
                      collapsed={collapsedCategories.has(node.id)}
                      onToggleCollapse={() => toggleCollapse(node.id)}
                      onEdit={openEditModal}
                      onDelete={(item) => setDeletingItem(item)}
                      canManage={canManageCategories}
                    />
                  ))
                )}
              </div>
            ) : (
              <DataTable
                data={categories}
                keyField="id"
                columns={[
                  {
                    header: 'Category Name',
                    accessor: (r) => (
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{r.name}</p>
                        {r.parent && (
                          <p className="text-[11px] text-slate-400">Under: {r.parent.name}</p>
                        )}
                      </div>
                    ),
                  },
                  {
                    header: 'Code',
                    accessor: (r) => <span className="font-mono text-xs font-semibold">{r.code}</span>,
                  },
                  {
                    header: 'Status',
                    accessor: (r) => (
                      <Badge variant={r.is_active ? 'success' : 'secondary'}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    ),
                  },
                  {
                    header: 'Actions',
                    align: 'right',
                    accessor: (r) => (
                      <div className="flex items-center justify-end gap-1.5">
                        {canManageCategories && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(r)}
                              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingItem(r)}
                              className="p-1.5 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </div>
        )}

        {/* BRANDS TAB */}
        {activeTab === 'brands' && (
          <DataTable
            data={brands}
            keyField="id"
            isLoading={loadingBrands}
            columns={[
              {
                header: 'Brand Name',
                accessor: (r) => <span className="font-bold text-slate-900 dark:text-slate-100">{r.name}</span>,
              },
              {
                header: 'Code',
                accessor: (r) => <span className="font-mono text-xs font-semibold">{r.code}</span>,
              },
              {
                header: 'Status',
                accessor: (r) => (
                  <Badge variant={r.is_active ? 'success' : 'secondary'}>
                    {r.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                ),
              },
              {
                header: 'Actions',
                align: 'right',
                accessor: (r) => (
                  <div className="flex items-center justify-end gap-1.5">
                    {canManageBrands && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(r)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingItem(r)}
                          className="p-1.5 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}

        {/* SEASONS TAB */}
        {activeTab === 'seasons' && (
          <DataTable
            data={seasons}
            keyField="id"
            isLoading={loadingSeasons}
            columns={[
              {
                header: 'Season / Collection',
                accessor: (r) => <span className="font-bold text-slate-900 dark:text-slate-100">{r.name}</span>,
              },
              {
                header: 'Code',
                accessor: (r) => <span className="font-mono text-xs font-semibold">{r.code}</span>,
              },
              {
                header: 'Status',
                accessor: (r) => (
                  <Badge variant={r.is_active ? 'success' : 'secondary'}>
                    {r.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                ),
              },
              {
                header: 'Actions',
                align: 'right',
                accessor: (r) => (
                  <div className="flex items-center justify-end gap-1.5">
                    {canUpdateProducts && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(r)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingItem(r)}
                          className="p-1.5 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}

        {/* SIZES TAB */}
        {activeTab === 'sizes' && (
          <DataTable
            data={filteredSizes}
            keyField="id"
            isLoading={loadingSizes}
            columns={[
              {
                header: 'Sort',
                accessor: (r) => (
                  <div className="flex items-center gap-1">
                    <span className="w-6 text-center font-mono text-xs font-bold text-slate-500">
                      {r.sort_order}
                    </span>
                    {canUpdateProducts && !r.isSystem && (
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => handleMoveSize(r, 'UP')}
                          className="p-0.5 hover:text-emerald-600 text-slate-400"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSize(r, 'DOWN')}
                          className="p-0.5 hover:text-emerald-600 text-slate-400"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                header: 'Size Name',
                accessor: (r) => (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{r.name}</span>
                    {r.business_id === null && (
                      <Badge variant="outline" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {t('catalog.systemBadge')}
                      </Badge>
                    )}
                  </div>
                ),
              },
              {
                header: 'Code',
                accessor: (r) => <span className="font-mono text-xs font-semibold">{r.code}</span>,
              },
              {
                header: 'Actions',
                align: 'right',
                accessor: (r) => (
                  <div className="flex items-center justify-end gap-1.5">
                    {r.business_id === null ? (
                      <span className="text-[11px] text-slate-400 italic flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Read Only
                      </span>
                    ) : canUpdateProducts ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(r)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingItem(r)}
                          className="p-1.5 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        )}

        {/* COLORS TAB */}
        {activeTab === 'colors' && (
          <DataTable
            data={filteredColors}
            keyField="id"
            isLoading={loadingColors}
            columns={[
              {
                header: 'Swatch',
                accessor: (r) => (
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-700 shadow-sm"
                      style={{ backgroundColor: r.hex_code || '#cbd5e1' }}
                    />
                    <span className="font-bold text-slate-900 dark:text-slate-100">{r.name}</span>
                    {r.business_id === null && (
                      <Badge variant="outline" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {t('catalog.systemBadge')}
                      </Badge>
                    )}
                  </div>
                ),
              },
              {
                header: 'Hex Code',
                accessor: (r: any) => (
                  <span className="font-mono text-xs font-semibold uppercase">{r.hex_code || '-'}</span>
                ),
              },
              {
                header: 'Code',
                accessor: (r: any) => <span className="font-mono text-xs">{r.code}</span>,
              },
              {
                header: 'Actions',
                align: 'right',
                accessor: (r: any) => (
                  <div className="flex items-center justify-end gap-1.5">
                    {r.business_id === null ? (
                      <span className="text-[11px] text-slate-400 italic flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Read Only
                      </span>
                    ) : canUpdateProducts ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(r)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingItem(r)}
                          className="p-1.5 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        )}

        {/* UNITS TAB */}
        {activeTab === 'units' && (
          <DataTable
            data={filteredUnits}
            keyField="id"
            isLoading={loadingUnits}
            columns={[
              {
                header: 'Unit Name',
                accessor: (r: any) => (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{r.name}</span>
                    {r.business_id === null && (
                      <Badge variant="outline" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {t('catalog.systemBadge')}
                      </Badge>
                    )}
                  </div>
                ),
              },
              {
                header: 'Code',
                accessor: (r: any) => <span className="font-mono text-xs font-semibold uppercase">{r.code}</span>,
              },
              {
                header: 'Type',
                accessor: (r: any) => (
                  <Badge variant={r.allow_decimal ? 'outline' : 'secondary'}>
                    {r.allow_decimal ? 'Decimal (e.g. Kg, Mtr)' : 'Discrete (e.g. Pcs, Pair)'}
                  </Badge>
                ),
              },
              {
                header: 'Actions',
                align: 'right',
                accessor: (r: any) => (
                  <div className="flex items-center justify-end gap-1.5">
                    {r.business_id === null ? (
                      <span className="text-[11px] text-slate-400 italic flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Read Only
                      </span>
                    ) : canUpdateProducts ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(r)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingItem(r)}
                          className="p-1.5 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>

      {/* CREATE / EDIT DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {editingItem ? 'Edit Item' : 'New Item'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim()) {
                  setFieldErrors({ name: 'Name is required' });
                  return;
                }
                saveMutation.mutate();
              }}
              className="p-6 space-y-4"
            >
              <FormFieldWrapper label="Name" required error={fieldErrors.name}>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: '' }));
                  }}
                  autoFocus
                />
              </FormFieldWrapper>

              <FormFieldWrapper label="Code (Optional)" error={fieldErrors.code} hint="Leave empty to auto-generate">
                <Input
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (fieldErrors.code) setFieldErrors((p) => ({ ...p, code: '' }));
                  }}
                  className="uppercase font-mono text-xs"
                />
              </FormFieldWrapper>

              {activeTab === 'categories' && (
                <FormFieldWrapper label={t('catalog.parentCategory')}>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">{t('catalog.noParent')}</option>
                    {categories
                      .filter((c: any) => c.id !== editingItem?.id)
                      .map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </FormFieldWrapper>
              )}

              {activeTab === 'colors' && (
                <FormFieldWrapper label={t('catalog.hexCode')}>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={hexCode}
                      onChange={(e) => setHexCode(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent"
                    />
                    <Input
                      value={hexCode}
                      onChange={(e) => setHexCode(e.target.value)}
                      placeholder="#000000"
                      className="uppercase font-mono text-xs max-w-[140px]"
                    />
                    <div
                      className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 shadow-sm"
                      style={{ backgroundColor: hexCode }}
                    />
                  </div>
                </FormFieldWrapper>
              )}

              {activeTab === 'sizes' && (
                <FormFieldWrapper label={t('catalog.sortOrder')}>
                  <Input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    min={0}
                    max={999}
                  />
                </FormFieldWrapper>
              )}

              {activeTab === 'units' && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{t('catalog.allowDecimal')}</p>
                    <p className="text-[11px] text-slate-500">Enable for fractional units (e.g. kg, meter)</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowDecimal}
                    onChange={(e) => setAllowDecimal(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button type="button" variant="outline" onClick={closeModal} disabled={saveMutation.isPending}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={saveMutation.isPending}>
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        onConfirm={() => deleteMutation.mutate(deletingItem)}
        title="Confirm Deletion"
        description={
          activeTab === 'categories'
            ? `Are you sure you want to delete category "${deletingItem?.name}"? If it contains sub-categories or assigned products, the server will reject deletion.`
            : `Are you sure you want to delete "${deletingItem?.name}"?`
        }
        confirmText="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

// Category Hierarchical Tree Node
function CategoryTreeNode({
  node,
  level = 0,
  collapsed,
  onToggleCollapse,
  onEdit,
  onDelete,
  canManage,
}: {
  node: any;
  level: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  canManage: boolean;
}) {
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="space-y-1">
      <div
        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
        style={{ marginLeft: `${level * 24}px` }}
      >
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="w-5" />
          )}

          <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{node.name}</span>
          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {node.code}
          </span>
          {hasChildren && (
            <Badge variant="outline" className="text-[10px]">
              {node.children.length} sub-categories
            </Badge>
          )}
        </div>

        {canManage && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(node)}
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
              title="Edit Category"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(node)}
              className="p-1.5 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600"
              title="Delete Category"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {!collapsed && hasChildren && (
        <div className="space-y-1">
          {node.children.map((child: any) => (
            <CategoryTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              collapsed={collapsed}
              onToggleCollapse={onToggleCollapse}
              onEdit={onEdit}
              onDelete={onDelete}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
