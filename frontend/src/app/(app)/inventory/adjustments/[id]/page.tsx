'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Sliders,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  FileText,
  DollarSign,
  Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatDate, formatBDT } from '@/lib/utils/formatters';
import Decimal from 'decimal.js';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

export default function StockAdjustmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const adjustmentId = params.id as string;
  const { t } = useTranslation();
  const { showToast } = useToast();

  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const currentBranchId = useBranchStore((s) => s.currentBranchId);

  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const { data: adjustment, isLoading, refetch } = useQuery({
    queryKey: ['stock-adjustment-detail', currentBranchId, adjustmentId],
    queryFn: () => api.inventory.adjustments.get(adjustmentId),
    enabled: Boolean(adjustmentId),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-card border border-border rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!adjustment) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Adjustment Not Found</h2>
        <Button asChild variant="outline">
          <Link href="/inventory/adjustments">Back to Adjustments</Link>
        </Button>
      </div>
    );
  }

  const canViewCost = Boolean(
    user?.isOwner ||
      permissions?.includes('products:update') ||
      permissions?.includes('*'),
  );

  const hasApprovePermission = Boolean(
    user?.isOwner ||
      permissions?.includes('stock:approve') ||
      permissions?.includes('stock.approve') ||
      permissions?.includes('stock.*') ||
      permissions?.includes('*'),
  );

  // CRITICAL RULE: Creator cannot approve their own adjustment unless they are a business owner
  const isCreator = adjustment.created_by === user?.id;
  const canApprove =
    adjustment.status === 'DRAFT' &&
    hasApprovePermission &&
    (!isCreator || Boolean(user?.isOwner));

  const canCancel =
    adjustment.status === 'DRAFT' &&
    (hasApprovePermission ||
      permissions?.includes('inventory:adjust') ||
      permissions?.includes('stock.*') ||
      user?.isOwner);

  const handleApprove = async () => {
    setIsActionLoading(true);
    try {
      await api.inventory.adjustments.approve(adjustment.id);
      showToast('Stock adjustment approved! Inventory movements applied.', 'success');
      setIsApproveOpen(false);
      refetch();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Approval failed', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsActionLoading(true);
    try {
      await api.inventory.adjustments.cancel(adjustment.id);
      showToast('Adjustment cancelled.', 'info');
      setIsCancelOpen(false);
      refetch();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Cancel failed', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Calculate total value impact with decimal.js
  const totalValueImpact = (adjustment.items || []).reduce((acc: Decimal, item: any) => {
    const diff = new Decimal(item.difference_qty || 0);
    const cost = new Decimal(item.unit_cost || 0);
    return acc.plus(diff.times(cost));
  }, new Decimal(0));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/inventory/adjustments">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {adjustment.adjustment_no}
              </h1>
              <Badge
                variant="outline"
                className={`text-xs ${
                  adjustment.status === 'APPROVED'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                    : adjustment.status === 'CANCELLED'
                    ? 'border-border bg-muted/40 text-muted-foreground'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-500'
                }`}
              >
                {adjustment.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Created on {formatDate(adjustment.created_at)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canApprove && (
            <Button
              size="sm"
              onClick={() => setIsApproveOpen(true)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve Adjustment
            </Button>
          )}

          {canCancel && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCancelOpen(true)}
              className="gap-2 text-destructive hover:bg-destructive/10"
            >
              <Ban className="w-4 h-4" />
              Cancel Adjustment
            </Button>
          )}
        </div>
      </div>

      {/* Warning when creator is viewing but cannot approve */}
      {adjustment.status === 'DRAFT' && isCreator && !user?.isOwner && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            You created this adjustment. To prevent conflicts of interest, another authorized staff member or business owner must approve it.
          </span>
        </div>
      )}

      {/* Metadata cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 space-y-1">
          <div className="text-xs text-muted-foreground">Reason</div>
          <div className="font-semibold text-foreground text-sm">
            {adjustment.reason?.replace(/_/g, ' ')}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-1">
          <div className="text-xs text-muted-foreground">Created By</div>
          <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            {adjustment.creator?.name || 'Staff'}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-1">
          <div className="text-xs text-muted-foreground">Approver / Audit</div>
          <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
            {adjustment.status === 'APPROVED' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{adjustment.approver?.name || 'Authorized Staff'}</span>
              </>
            ) : (
              <span className="text-muted-foreground font-normal">Pending Approval</span>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {adjustment.notes && (
        <div className="bg-muted/40 border border-border rounded-lg p-4 text-xs">
          <span className="font-semibold text-foreground">Notes: </span>
          <span className="text-muted-foreground">{adjustment.notes}</span>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <span className="font-semibold text-sm">
            Adjustment Line Items ({adjustment.items?.length || 0})
          </span>

          {canViewCost && (
            <div className="text-xs font-mono">
              Net Value Impact:{' '}
              <span
                className={`font-bold ${
                  totalValueImpact.isNegative()
                    ? 'text-destructive'
                    : totalValueImpact.isPositive()
                    ? 'text-emerald-500'
                    : 'text-foreground'
                }`}
              >
                {formatBDT(totalValueImpact.toNumber())}
              </span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Product / Variant</th>
                <th className="px-4 py-3 text-right w-28">System Qty</th>
                <th className="px-4 py-3 text-right w-28">Physical Qty</th>
                <th className="px-4 py-3 text-right w-28">Difference</th>
                {canViewCost && <th className="px-4 py-3 text-right w-36">Value Impact</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(adjustment.items || []).map((item: any, idx: number) => {
                const diff = Number(item.difference_qty);
                const cost = Number(item.unit_cost || 0);
                const itemValueImpact = diff * cost;

                return (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {item.variant?.product?.name || item.variant?.name || 'Product'}
                      </div>
                      <div className="text-xs text-muted-foreground flex gap-2">
                        <span>SKU: {item.variant?.sku}</span>
                        {item.variant?.barcode && <span>• Barcode: {item.variant.barcode}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-right text-muted-foreground">
                      {item.system_qty}
                    </td>
                    <td className="px-4 py-3 font-mono text-right font-medium">
                      {item.physical_qty}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {diff === 0 ? (
                        <span className="text-xs text-muted-foreground">0</span>
                      ) : (
                        <Badge
                          variant={diff > 0 ? 'secondary' : 'destructive'}
                          className="font-mono text-xs"
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </Badge>
                      )}
                    </td>
                    {canViewCost && (
                      <td className="px-4 py-3 font-mono text-right text-xs">
                        <span
                          className={
                            diff < 0
                              ? 'text-destructive font-semibold'
                              : diff > 0
                              ? 'text-emerald-500 font-semibold'
                              : 'text-muted-foreground'
                          }
                        >
                          {formatBDT(itemValueImpact)}
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve Confirmation Dialog */}
      <ConfirmDialog
        open={isApproveOpen}
        onOpenChange={setIsApproveOpen}
        title="Approve Stock Adjustment"
        description="Are you sure you want to approve this adjustment? This will permanently post stock movements, update inventory balances, and create an immutable audit record."
        confirmText="Confirm Approval"
        onConfirm={handleApprove}
        loading={isActionLoading}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        title="Cancel Stock Adjustment"
        description="Are you sure you want to cancel this draft adjustment? No stock changes have taken place."
        confirmText="Cancel Adjustment"
        variant="destructive"
        onConfirm={handleCancel}
        loading={isActionLoading}
      />
    </div>
  );
}
