'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  AlertOctagon,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Trash2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { QuantityInput } from '@/components/shared/QuantityInput';
import { BarcodeInput } from '@/components/catalog/BarcodeInput';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatDate, formatBDT } from '@/lib/utils/formatters';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

export default function DamagedStockPage() {
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

  const canApproveOrWriteOff = Boolean(
    user?.isOwner ||
      permissions?.includes('stock:approve') ||
      permissions?.includes('stock.approve') ||
      permissions?.includes('stock.*') ||
      permissions?.includes('*'),
  );

  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [reportQty, setReportQty] = useState<number>(1);
  const [reportReason, setReportReason] = useState<string>('');
  const [variantSearch, setVariantSearch] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Action Dialogs
  const [approveTarget, setApproveTarget] = useState<any | null>(null);
  const [writeOffTarget, setWriteOffTarget] = useState<any | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['damaged-stock-list', currentBranchId, status, page, limit],
    queryFn: () =>
      api.inventory.damagedStock.list({
        page,
        limit,
        status: status || undefined,
      }),
  });

  // Variant search for reporting
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['variants-damaged-search', currentBranchId, variantSearch],
    queryFn: () =>
      api.catalog.products.list({
        search: variantSearch,
        limit: 10,
      }),
    enabled: isReportModalOpen && variantSearch.trim().length >= 2,
  });

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const res = await api.catalog.barcodes.lookup(barcode);
      if (res?.variant) {
        setSelectedVariant(res.variant);
        showToast(`Selected ${res.variant.sku}`, 'info');
      } else {
        showToast('Barcode not found', 'error');
      }
    } catch {
      showToast('Barcode lookup failed', 'error');
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) {
      showToast('Please select a product variant', 'error');
      return;
    }
    if (reportQty <= 0) {
      showToast('Quantity must be greater than zero', 'error');
      return;
    }
    if (!reportReason.trim()) {
      showToast('Please specify the damage reason', 'error');
      return;
    }

    setIsSubmittingReport(true);
    try {
      await api.inventory.damagedStock.report({
        variantId: selectedVariant.id,
        quantity: reportQty,
        reason: reportReason.trim(),
      });
      showToast('Damaged stock report submitted (PENDING approval)', 'success');
      setIsReportModalOpen(false);
      setSelectedVariant(null);
      setReportQty(1);
      setReportReason('');
      refetch();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Report failed', 'error');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleApprove = async () => {
    if (!approveTarget) return;
    setIsActionLoading(true);
    try {
      await api.inventory.damagedStock.approve(approveTarget.id);
      showToast(`Damaged report ${approveTarget.damage_no} approved`, 'success');
      setApproveTarget(null);
      refetch();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Approve failed', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleWriteOff = async () => {
    if (!writeOffTarget) return;
    setIsActionLoading(true);
    try {
      await api.inventory.damagedStock.writeOff(writeOffTarget.id);
      showToast(`Damaged stock ${writeOffTarget.damage_no} written off! Inventory reduced.`, 'success');
      setWriteOffTarget(null);
      refetch();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Write-off failed', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const rawData = data?.data || [];

  // Total loss calculation for filtered records
  const totalReportedLoss = rawData.reduce(
    (acc: number, item: any) => acc + Number(item.total_loss || 0),
    0,
  );

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 gap-1 text-xs">
            <Clock className="w-3 h-3" />
            Pending Approval
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="outline" className="text-blue-500 border-blue-500/30 bg-blue-500/10 gap-1 text-xs">
            <ShieldCheck className="w-3 h-3" />
            Approved
          </Badge>
        );
      case 'WRITTEN_OFF':
        return (
          <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 gap-1 text-xs">
            <Flame className="w-3 h-3" />
            Written Off
          </Badge>
        );
      default:
        return <Badge variant="secondary">{statusStr}</Badge>;
    }
  };

  const columns = [
    {
      header: t('inventory.reportNo') || 'Report No',
      cell: (row: any) => (
        <div className="space-y-1">
          <span className="font-mono font-medium text-foreground">{row.damage_no}</span>
          <div className="text-xs text-muted-foreground">{formatDate(row.created_at)}</div>
        </div>
      ),
    },
    {
      header: t('common.product') || 'Product / Variant',
      cell: (row: any) => (
        <div>
          <div className="font-medium text-foreground">
            {row.variant?.product?.name || row.variant?.name || 'Product'}
          </div>
          <div className="text-xs text-muted-foreground flex gap-2">
            <span>SKU: {row.variant?.sku}</span>
            {row.variant?.barcode && <span>• Barcode: {row.variant.barcode}</span>}
          </div>
        </div>
      ),
    },
    {
      header: t('inventory.damagedQuantity') || 'Damaged Qty',
      cell: (row: any) => (
        <span className="font-mono font-semibold text-destructive">{row.quantity}</span>
      ),
    },
    ...(canViewCost
      ? [
          {
            header: t('inventory.totalLoss') || 'Total Loss',
            cell: (row: any) => (
              <span className="font-mono text-xs font-semibold text-destructive">
                {formatBDT(Number(row.total_loss || 0))}
              </span>
            ),
          },
        ]
      : []),
    {
      header: t('common.reason') || 'Damage Reason',
      cell: (row: any) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{row.reason}</span>
      ),
    },
    {
      header: t('common.status') || 'Status',
      cell: (row: any) => getStatusBadge(row.status),
    },
    {
      header: t('common.actions') || 'Actions',
      cell: (row: any) => {
        if (!canApproveOrWriteOff) return null;

        if (row.status === 'PENDING') {
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setApproveTarget(row)}
              className="text-xs h-7 gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve
            </Button>
          );
        }

        if (row.status === 'APPROVED') {
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setWriteOffTarget(row)}
              className="text-xs h-7 gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <Flame className="w-3.5 h-3.5" />
              Write Off
            </Button>
          );
        }

        return <span className="text-xs text-muted-foreground italic">Completed</span>;
      },
      className: 'text-right',
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-destructive" />
            {t('inventory.damagedStock') || 'Damaged Stock'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('inventory.damagedStockSubtitle') ||
              'Record and audit stock damage, write-offs, and spoiled inventory with cost tracking.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            {t('common.refresh') || 'Refresh'}
          </Button>

          <PermissionGate permissions={['inventory:adjust', 'stock.*']}>
            <Button size="sm" onClick={() => setIsReportModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {t('inventory.reportDamage') || 'Report Damaged Stock'}
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total Damaged Reports</div>
            <div className="text-xl font-bold font-mono">{rawData.length}</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Pending Approval</div>
            <div className="text-xl font-bold font-mono text-amber-500">
              {rawData.filter((r: any) => r.status === 'PENDING').length}
            </div>
          </div>
        </div>

        {canViewCost && (
          <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Loss Value</div>
              <div className="text-xl font-bold font-mono text-destructive">
                {formatBDT(totalReportedLoss)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-xs bg-background border border-input rounded-md px-3 py-1.5"
        >
          <option value="">{t('common.allStatuses') || 'All Statuses'}</option>
          <option value="PENDING">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="WRITTEN_OFF">Written Off</option>
        </select>
      </div>

      {/* DataTable */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={rawData}
          isLoading={isLoading}
          emptyMessage={t('inventory.noDamagedStockFound') || 'No damaged stock records found.'}
        />
      </div>

      {/* Report Damage Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-destructive" />
                Report Damaged Stock
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setIsReportModalOpen(false)}>
                ✕
              </Button>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              {/* Barcode Quick Scan */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Scan Barcode (Select Variant)
                </label>
                <BarcodeInput onScan={handleBarcodeScan} autoFocus placeholder="Scan barcode..." />
              </div>

              {/* Or Variant Search */}
              <div className="relative">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Or Search Product / Variant
                </label>
                <input
                  type="text"
                  value={variantSearch}
                  onChange={(e) => setVariantSearch(e.target.value)}
                  placeholder="Search by product name, SKU..."
                  className="w-full text-xs bg-background border border-input rounded-md px-3 py-2"
                />

                {variantSearch.trim().length >= 2 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-3 text-xs text-muted-foreground text-center">
                        Searching...
                      </div>
                    ) : searchResults?.data?.length ? (
                      searchResults.data.flatMap((product: any) =>
                        (product.variants || []).map((v: any) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setSelectedVariant({ ...v, product });
                              setVariantSearch('');
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-muted border-b border-border/50 last:border-0 text-xs flex justify-between"
                          >
                            <div>
                              <div className="font-medium text-foreground">{product.name}</div>
                              <div className="text-muted-foreground">SKU: {v.sku}</div>
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              Select
                            </Badge>
                          </button>
                        )),
                      )
                    ) : (
                      <div className="p-3 text-xs text-muted-foreground text-center">
                        No variants found.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Variant Display */}
              {selectedVariant && (
                <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs space-y-1">
                  <div className="font-semibold text-foreground">
                    {selectedVariant.product?.name || selectedVariant.name || 'Selected Product'}
                  </div>
                  <div className="text-muted-foreground">SKU: {selectedVariant.sku}</div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Damaged Quantity *
                </label>
                <QuantityInput
                  value={reportQty}
                  onChange={setReportQty}
                  trackIndividually={Boolean(selectedVariant?.product?.track_individually)}
                  min={1}
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Damage Reason *
                </label>
                <textarea
                  rows={2}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="e.g. Broken packaging, liquid spill, or torn fabric..."
                  required
                  className="w-full text-xs bg-background border border-input rounded-md px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsReportModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingReport || !selectedVariant}
                  className="gap-2"
                >
                  {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Confirmation */}
      <ConfirmDialog
        open={Boolean(approveTarget)}
        onOpenChange={(open: boolean) => !open && setApproveTarget(null)}
        title="Approve Damaged Stock Report"
        description={`Are you sure you want to approve report ${approveTarget?.damage_no}? This confirms that ${approveTarget?.quantity} piece(s) are officially marked as damaged.`}
        confirmText="Confirm Approval"
        onConfirm={handleApprove}
        loading={isActionLoading}
      />

      {/* Write-Off Confirmation */}
      <ConfirmDialog
        open={Boolean(writeOffTarget)}
        onOpenChange={(open: boolean) => !open && setWriteOffTarget(null)}
        title="Write Off Damaged Stock"
        description={`Writing off ${writeOffTarget?.damage_no} will permanently execute a DAMAGE stock-out movement at exact current WAC, reducing branch inventory balance.`}
        confirmText="Confirm Write-Off"
        variant="destructive"
        onConfirm={handleWriteOff}
        loading={isActionLoading}
      />
    </div>
  );
}
