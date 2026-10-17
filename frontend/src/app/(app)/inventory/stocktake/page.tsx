'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Search,
  Barcode,
  Save,
  Clock,
  Sliders,
  Filter,
  ArrowRight,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { QuantityInput } from '@/components/shared/QuantityInput';
import { BarcodeInput } from '@/components/catalog/BarcodeInput';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatBDT, formatDate } from '@/lib/utils/formatters';
import Decimal from 'decimal.js';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

export default function StocktakePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const currentBranchId = useBranchStore((s) => s.currentBranchId);

  const canViewCost = Boolean(
    user?.isOwner ||
      permissions?.includes('products:update') ||
      permissions?.includes('*'),
  );

  // Active stocktake ID
  const [activeStocktakeId, setActiveStocktakeId] = useState<string | null>(null);

  // Setup form states (when no active stocktake)
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [notes, setNotes] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  // Counting view states
  const [viewMode, setViewMode] = useState<'COUNT' | 'REVIEW'>('COUNT');
  const [search, setSearch] = useState('');
  const [filterUncountedOnly, setFilterUncountedOnly] = useState(false);
  const [filterDiscrepancyOnly, setFilterDiscrepancyOnly] = useState(false);

  // Local counts map: itemId -> countedQty
  const [localCounts, setLocalCounts] = useState<Record<string, number>>({});
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>('IDLE');

  // Debounced autosave queue
  const pendingUpdatesRef = useRef<Map<string, number>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modals
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [createAdjustmentOption, setCreateAdjustmentOption] = useState(true);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // 1. Check for active IN_PROGRESS stocktake in this branch
  const { data: stocktakesList, isLoading: isCheckingActive } = useQuery({
    queryKey: ['active-stocktake-check', currentBranchId],
    queryFn: () => api.inventory.stocktakes.list({ limit: 10 }),
  });

  useEffect(() => {
    if (stocktakesList?.data) {
      const active = stocktakesList.data.find((s: any) => s.status === 'IN_PROGRESS');
      if (active) {
        setActiveStocktakeId(active.id);
      } else {
        setActiveStocktakeId(null);
      }
    }
  }, [stocktakesList]);

  // 2. Fetch full active stocktake detail
  const { data: activeStocktake, isLoading: isLoadingStocktake, refetch: refetchActive } = useQuery({
    queryKey: ['active-stocktake-detail', currentBranchId, activeStocktakeId],
    queryFn: () => api.inventory.stocktakes.get(activeStocktakeId!),
    enabled: Boolean(activeStocktakeId),
  });

  // Sync server counted_qty to localCounts on load
  useEffect(() => {
    if (activeStocktake?.items) {
      const counts: Record<string, number> = {};
      activeStocktake.items.forEach((item: any) => {
        if (item.counted_qty !== null && item.counted_qty !== undefined) {
          counts[item.id] = Number(item.counted_qty);
        }
      });
      setLocalCounts(counts);
    }
  }, [activeStocktake]);

  // Fetch categories & brands for start setup
  const { data: categoriesData } = useQuery({
    queryKey: ['categories-stocktake'],
    queryFn: () => api.catalog.categories.list(),
    enabled: !activeStocktakeId,
  });

  const { data: brandsData } = useQuery({
    queryKey: ['brands-stocktake'],
    queryFn: () => api.catalog.brands.list(),
    enabled: !activeStocktakeId,
  });

  // Debounced autosave runner
  const flushPendingCounts = useCallback(async () => {
    if (!activeStocktakeId || pendingUpdatesRef.current.size === 0) return;

    const batch = Array.from(pendingUpdatesRef.current.entries()).map(([itemId, countedQty]) => ({
      itemId,
      countedQty,
    }));
    pendingUpdatesRef.current.clear();

    setSaveStatus('SAVING');
    try {
      await api.inventory.stocktakes.recordCounts(activeStocktakeId, { counts: batch });
      setSaveStatus('SAVED');
    } catch {
      setSaveStatus('ERROR');
      showToast('Autosave failed. Check connection and retry.', 'error');
    }
  }, [activeStocktakeId, showToast]);

  const scheduleAutosave = useCallback(
    (itemId: string, qty: number) => {
      pendingUpdatesRef.current.set(itemId, qty);
      setSaveStatus('SAVING');

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        flushPendingCounts();
      }, 600);
    },
    [flushPendingCounts],
  );

  // Handle Barcode Scan: Built for speed!
  const handleBarcodeScan = (barcode: string) => {
    if (!activeStocktake?.items) return;

    const trimmed = barcode.trim().toLowerCase();
    const item = activeStocktake.items.find(
      (i: any) =>
        i.variant?.barcode?.toLowerCase() === trimmed ||
        i.variant?.sku?.toLowerCase() === trimmed,
    );

    if (item) {
      const currentCount = localCounts[item.id] ?? 0;
      const nextCount = currentCount + 1;

      setLocalCounts((prev) => ({ ...prev, [item.id]: nextCount }));
      scheduleAutosave(item.id, nextCount);

      showToast(`Counted ${item.variant?.sku} (+1) = ${nextCount}`, 'success');
    } else {
      showToast(`Barcode ${barcode} not found in this stocktake scope`, 'error');
    }
  };

  const handleManualCountChange = (itemId: string, qty: number) => {
    setLocalCounts((prev) => ({ ...prev, [itemId]: qty }));
    scheduleAutosave(itemId, qty);
  };

  // Start a new stocktake
  const handleStartStocktake = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsStarting(true);
    try {
      const res = await api.inventory.stocktakes.start({
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        notes: notes.trim() || undefined,
      });

      showToast('Stocktake audit started! Snapshot taken.', 'success');
      setActiveStocktakeId(res.id);
      queryClient.invalidateQueries({ queryKey: ['active-stocktake-check'] });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to start stocktake';
      showToast(msg, 'error');
    } finally {
      setIsStarting(false);
    }
  };

  // Complete stocktake
  const handleComplete = async () => {
    if (!activeStocktakeId) return;

    // Flush any pending unsaved counts first
    await flushPendingCounts();

    setIsCompleting(true);
    try {
      const res = await api.inventory.stocktakes.complete(activeStocktakeId, {
        createAdjustment: createAdjustmentOption,
      });

      showToast('Stocktake completed successfully!', 'success');
      setIsCompleteModalOpen(false);

      if (res.generatedAdjustment?.id) {
        showToast('Generated Stock Adjustment draft from discrepancies!', 'info');
        router.push(`/inventory/adjustments/${res.generatedAdjustment.id}`);
      } else {
        setActiveStocktakeId(null);
        queryClient.invalidateQueries({ queryKey: ['active-stocktake-check'] });
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to complete stocktake', 'error');
    } finally {
      setIsCompleting(false);
    }
  };

  // Cancel stocktake
  const handleCancelStocktake = async () => {
    if (!activeStocktakeId) return;

    try {
      await api.inventory.stocktakes.cancel(activeStocktakeId);
      showToast('Stocktake cancelled.', 'warning');
      setIsCancelModalOpen(false);
      setActiveStocktakeId(null);
      queryClient.invalidateQueries({ queryKey: ['active-stocktake-check'] });
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to cancel stocktake', 'error');
    }
  };

  // -------------------------------------------------------------
  // RENDER: Setup Screen (No active stocktake in progress)
  // -------------------------------------------------------------
  if (!activeStocktakeId && !isCheckingActive) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-primary" />
              {t('inventory.stocktake') || 'Stocktake / Physical Inventory Audit'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('inventory.stocktakeSubtitle') ||
                'Conduct physical counts, audit discrepancies against recorded system balances, and generate adjustments.'}
            </p>
          </div>
        </div>

        {/* Start Stocktake Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Play className="w-5 h-5 ml-0.5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Start New Stocktake</h2>
              <p className="text-xs text-muted-foreground">
                Only one active stocktake can run at a time per branch. A snapshot of current system stock will be recorded.
              </p>
            </div>
          </div>

          <form onSubmit={handleStartStocktake} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Filter by Category (Optional)
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full text-sm bg-background border border-input rounded-md px-3 py-2"
                >
                  <option value="">All Categories (Full Store Audit)</option>
                  {(categoriesData || []).map((cat: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Filter by Brand (Optional)
                </label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full text-sm bg-background border border-input rounded-md px-3 py-2"
                >
                  <option value="">All Brands</option>
                  {(brandsData || []).map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Audit Notes / Scope
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. End-of-month stocktake for Panjabi section..."
                  className="w-full text-sm bg-background border border-input rounded-md px-3 py-2"
                />
              </div>
            </div>

            <Button type="submit" disabled={isStarting} className="gap-2">
              <Play className="w-4 h-4" />
              {isStarting ? 'Taking Stock Snapshot...' : 'Start Stocktake Audit'}
            </Button>
          </form>
        </div>

        {/* History Table */}
        {Boolean(stocktakesList?.data && stocktakesList.data.length > 0) && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Recent Stocktake History
            </h3>
            <div className="divide-y divide-border">
              {(stocktakesList?.data || []).map((stk: any) => (
                <div key={stk.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono font-bold text-foreground">{stk.stocktake_no}</div>
                    <div className="text-muted-foreground">{formatDate(stk.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={
                        stk.status === 'COMPLETED'
                          ? 'text-emerald-500 border-emerald-500/20'
                          : stk.status === 'CANCELLED'
                          ? 'text-muted-foreground'
                          : 'text-amber-500'
                      }
                    >
                      {stk.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE STOCKTAKE COUNTING / REVIEW SCREEN
  // -------------------------------------------------------------
  const allItems = activeStocktake?.items || [];
  const countedCount = allItems.filter(
    (i: any) => localCounts[i.id] !== undefined,
  ).length;
  const progressPct = allItems.length > 0 ? Math.round((countedCount / allItems.length) * 100) : 0;

  // Filter items
  const filteredItems = allItems.filter((item: any) => {
    const isCounted = localCounts[item.id] !== undefined;
    const countedQty = localCounts[item.id] ?? 0;
    const diff = countedQty - Number(item.system_qty);

    if (filterUncountedOnly && isCounted) return false;
    if (filterDiscrepancyOnly && (!isCounted || diff === 0)) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.variant?.product?.name?.toLowerCase().includes(q) ||
      item.variant?.sku?.toLowerCase().includes(q) ||
      item.variant?.barcode?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-primary" />
              {activeStocktake?.stocktake_no || 'Stocktake'}
            </h1>
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs">
              IN PROGRESS
            </Badge>

            {/* Autosave status indicator */}
            <div className="ml-2 flex items-center gap-1.5 text-xs">
              {saveStatus === 'SAVING' ? (
                <span className="text-amber-500 flex items-center gap-1 animate-pulse">
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  Saving counts...
                </span>
              ) : saveStatus === 'SAVED' ? (
                <span className="text-emerald-500 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved
                </span>
              ) : null}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Snapshot: {allItems.length} variants • Started {formatDate(activeStocktake?.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-muted rounded-md p-1 border border-border">
            <button
              type="button"
              onClick={() => setViewMode('COUNT')}
              className={`px-3 py-1 text-xs font-medium rounded ${
                viewMode === 'COUNT' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
              }`}
            >
              Counting Mode
            </button>
            <button
              type="button"
              onClick={() => setViewMode('REVIEW')}
              className={`px-3 py-1 text-xs font-medium rounded ${
                viewMode === 'REVIEW' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
              }`}
            >
              Review & Discrepancies
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCancelModalOpen(true)}
            className="text-destructive hover:bg-destructive/10"
          >
            Cancel Stocktake
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCompleteModalOpen(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete Audit
          </Button>
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">
            Counting Progress: {countedCount} of {allItems.length} lines counted ({progressPct}%)
          </span>
          <span className="text-muted-foreground font-mono">
            {allItems.length - countedCount} uncounted
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Toolbar: Barcode Input & Filters */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('purchasing.scanBarcode') || 'Barcode Scan (Instant Increment +1)'}
            </label>
            <BarcodeInput
              onScan={handleBarcodeScan}
              autoFocus
              placeholder="Scan barcode to increment counted quantity..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Search Variant / SKU
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by product name, SKU..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
          <button
            type="button"
            onClick={() => {
              setFilterUncountedOnly((p) => !p);
              if (!filterUncountedOnly) setFilterDiscrepancyOnly(false);
            }}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filterUncountedOnly
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Show Only Uncounted
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterDiscrepancyOnly((p) => !p);
              if (!filterDiscrepancyOnly) setFilterUncountedOnly(false);
            }}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filterDiscrepancyOnly
                ? 'bg-amber-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Show Only Discrepancies
          </button>

          <span className="ml-auto text-xs text-muted-foreground">
            Showing {filteredItems.length} lines
          </span>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left">Product / Variant</th>
                <th className="px-4 py-3 text-right w-28">System Qty</th>
                <th className="px-4 py-3 text-left w-36">Physical Count</th>
                <th className="px-4 py-3 text-right w-28">Discrepancy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.map((item: any) => {
                const system = Number(item.system_qty);
                const hasCount = localCounts[item.id] !== undefined;
                const counted = localCounts[item.id] ?? 0;
                const diff = hasCount ? counted - system : null;

                return (
                  <tr
                    key={item.id}
                    className={
                      hasCount && diff !== 0
                        ? 'bg-amber-500/5 hover:bg-amber-500/10'
                        : hasCount
                        ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                        : 'hover:bg-muted/20'
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {item.variant?.product?.name || 'Product'}
                      </div>
                      <div className="text-xs text-muted-foreground flex gap-2">
                        <span>SKU: {item.variant?.sku}</span>
                        {item.variant?.barcode && <span>• Barcode: {item.variant.barcode}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-right text-muted-foreground">
                      {system}
                    </td>
                    <td className="px-4 py-3">
                      <QuantityInput
                        value={hasCount ? counted : 0}
                        onChange={(qty) => handleManualCountChange(item.id, qty)}
                        trackIndividually={Boolean(item.variant?.product?.track_individually)}
                        min={0}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {diff === null ? (
                        <span className="text-xs text-muted-foreground italic">Uncounted</span>
                      ) : diff === 0 ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-500/20 text-[10px]">
                          Matched
                        </Badge>
                      ) : (
                        <Badge
                          variant={diff > 0 ? 'secondary' : 'destructive'}
                          className="font-mono text-xs font-bold"
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete Stocktake Modal */}
      <ConfirmDialog
        open={isCompleteModalOpen}
        onOpenChange={setIsCompleteModalOpen}
        title="Complete Stocktake Audit"
        description="Are you sure you want to complete this stocktake? All physical counts will be permanently finalized."
        confirmText="Finalize Stocktake"
        onConfirm={handleComplete}
        loading={isCompleting}
      >
        <div className="mt-4 p-3 bg-muted/40 rounded-lg border border-border space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
            <input
              type="checkbox"
              checked={createAdjustmentOption}
              onChange={(e) => setCreateAdjustmentOption(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary"
            />
            <span>Automatically generate DRAFT stock adjustment from discrepancies</span>
          </label>
          <p className="text-[11px] text-muted-foreground ml-5">
            If checked, a draft stock adjustment will be created containing all line discrepancies for review and approval.
          </p>
        </div>
      </ConfirmDialog>

      {/* Cancel Confirmation Modal */}
      <ConfirmDialog
        open={isCancelModalOpen}
        onOpenChange={setIsCancelModalOpen}
        title="Cancel Active Stocktake"
        description="Are you sure you want to cancel this stocktake? All uncommitted physical counts for this session will be discarded."
        confirmText="Cancel Stocktake"
        variant="destructive"
        onConfirm={handleCancelStocktake}
      />
    </div>
  );
}
