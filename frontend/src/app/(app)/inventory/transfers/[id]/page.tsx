'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  ArrowLeft,
  Printer,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  Calendar,
  User,
  Clock,
  Send,
  Ban,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { QuantityInput } from '@/components/shared/QuantityInput';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { api } from '@/lib/api/endpoints';
import { formatDate } from '@/lib/utils/formatters';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

export default function StockTransferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const transferId = params.id as string;
  const { t } = useTranslation();
  const { showToast } = useToast();

  const user = useAuthStore((s) => s.user);
  const currentBranchId = useBranchStore((s) => s.currentBranchId);

  // Modals & Action States
  const [isDispatchConfirmOpen, setIsDispatchConfirmOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receiveItemInputs, setReceiveItemInputs] = useState<
    Record<string, { receivedQty: number; discrepancyNote: string }>
  >({});

  const [isActionLoading, setIsActionLoading] = useState(false);

  const { data: transfer, isLoading, refetch } = useQuery({
    queryKey: ['stock-transfer-detail', currentBranchId, transferId],
    queryFn: () => api.inventory.transfers.get(transferId),
    enabled: Boolean(transferId),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-card border border-border rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Transfer Not Found</h2>
        <Button asChild variant="outline">
          <Link href="/inventory/transfers">Back to Transfers</Link>
        </Button>
      </div>
    );
  }

  const isSourceBranch = transfer.from_branch_id === currentBranchId;
  const isDestBranch = transfer.to_branch_id === currentBranchId;
  const isOwner = Boolean(user?.isOwner);

  // Destination permission rule:
  // A user without access to the destination cannot see or execute the Receive / Reject action
  const canReceiveOrReject = (isDestBranch || isOwner) && transfer.status === 'IN_TRANSIT';
  const canDispatch = (isSourceBranch || isOwner) && transfer.status === 'PENDING';
  const canCancel = (isSourceBranch || isOwner) && (transfer.status === 'PENDING' || transfer.status === 'IN_TRANSIT');

  const openReceiveModal = () => {
    const initialInputs: Record<string, { receivedQty: number; discrepancyNote: string }> = {};
    (transfer.items || []).forEach((item: any) => {
      initialInputs[item.id] = {
        receivedQty: Number(item.sent_qty),
        discrepancyNote: '',
      };
    });
    setReceiveItemInputs(initialInputs);
    setIsReceiveModalOpen(true);
  };

  const handleDispatch = async () => {
    setIsActionLoading(true);
    try {
      await api.inventory.transfers.dispatch(transfer.id);
      showToast('Transfer dispatched successfully into transit!', 'success');
      setIsDispatchConfirmOpen(false);
      refetch();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Dispatch failed', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      showToast('Please provide a cancellation reason', 'error');
      return;
    }
    setIsActionLoading(true);
    try {
      await api.inventory.transfers.cancel(transfer.id);
      showToast('Transfer cancelled and stock returned to source branch.', 'info');
      setIsCancelConfirmOpen(false);
      refetch();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Cancel failed', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showToast('A rejection reason is strictly required', 'error');
      return;
    }
    setIsActionLoading(true);
    try {
      await api.inventory.transfers.reject(transfer.id);
      showToast('Transfer rejected and reversed back to origin branch.', 'warning');
      setIsRejectDialogOpen(false);
      refetch();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Reject failed', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReceive = async () => {
    // Validate: if received < sent, discrepancy note is mandatory
    const itemsPayload: { itemId: string; receivedQty: number; discrepancyNote?: string }[] = [];

    for (const item of transfer.items || []) {
      const input = receiveItemInputs[item.id];
      const received = input ? input.receivedQty : Number(item.sent_qty);
      const note = input ? input.discrepancyNote.trim() : '';

      if (received < Number(item.sent_qty) && !note) {
        showToast(
          `Discrepancy note is mandatory for variant ${item.variant?.sku} (received ${received} < sent ${item.sent_qty})`,
          'error',
        );
        return;
      }

      itemsPayload.push({
        itemId: item.id,
        receivedQty: received,
        discrepancyNote: note || undefined,
      });
    }

    setIsActionLoading(true);
    try {
      await api.inventory.transfers.receive(transfer.id, {
        items: itemsPayload,
      });
      showToast('Transfer items received successfully! Inventory balances updated.', 'success');
      setIsReceiveModalOpen(false);
      refetch();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Receive failed', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Status timeline data
  const timelineSteps = [
    {
      title: 'Created',
      time: transfer.created_at,
      by: transfer.creator?.name || 'Staff',
      completed: true,
      active: transfer.status === 'PENDING',
    },
    {
      title: 'Dispatched (In Transit)',
      time: transfer.dispatched_at,
      by: transfer.dispatched_by ? 'Staff' : undefined,
      completed: ['IN_TRANSIT', 'RECEIVED', 'REJECTED'].includes(transfer.status),
      active: transfer.status === 'IN_TRANSIT',
    },
    {
      title:
        transfer.status === 'REJECTED'
          ? 'Rejected'
          : transfer.status === 'CANCELLED'
          ? 'Cancelled'
          : 'Received',
      time: transfer.received_at || transfer.updated_at,
      completed: ['RECEIVED', 'REJECTED', 'CANCELLED'].includes(transfer.status),
      active: ['RECEIVED', 'REJECTED', 'CANCELLED'].includes(transfer.status),
      isError: ['REJECTED', 'CANCELLED'].includes(transfer.status),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header & Print Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/inventory/transfers">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {transfer.transfer_no}
              </h1>
              <Badge variant="outline" className="text-xs">
                {transfer.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Created {formatDate(transfer.created_at)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Slip
          </Button>

          {canDispatch && (
            <Button
              size="sm"
              onClick={() => setIsDispatchConfirmOpen(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="w-4 h-4" />
              Dispatch Goods
            </Button>
          )}

          {canReceiveOrReject && (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setIsRejectDialogOpen(true)}
                className="gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject Transfer
              </Button>

              <Button
                size="sm"
                onClick={openReceiveModal}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4" />
                Receive Goods
              </Button>
            </>
          )}

          {canCancel && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCancelConfirmOpen(true)}
              className="gap-2 text-destructive hover:bg-destructive/10"
            >
              <Ban className="w-4 h-4" />
              Cancel Transfer
            </Button>
          )}
        </div>
      </div>

      {/* Printable Transfer Slip Header (only on print) */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h2 className="text-xl font-bold uppercase tracking-wider">STOCK TRANSFER SLIP</h2>
        <p className="text-sm font-mono mt-1">Ref: {transfer.transfer_no}</p>
        <p className="text-xs text-muted-foreground">Date: {formatDate(transfer.created_at)}</p>
      </div>

      {/* Status Timeline */}
      <div className="bg-card border border-border rounded-lg p-5 print:border-none print:p-0">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 print:hidden">
          Transfer Status Timeline
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {timelineSteps.map((step, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border text-xs space-y-1 ${
                step.isError
                  ? 'border-destructive/30 bg-destructive/5 text-destructive'
                  : step.completed
                  ? 'border-primary/30 bg-primary/5 text-foreground'
                  : 'border-border bg-muted/20 text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                {step.isError ? (
                  <XCircle className="w-4 h-4 text-destructive" />
                ) : step.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                <span>{step.title}</span>
              </div>
              {step.time && (
                <div className="text-[11px] text-muted-foreground">
                  {formatDate(step.time)}
                </div>
              )}
              {step.by && (
                <div className="text-[10px] text-muted-foreground">by {step.by}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Source and Destination Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-primary" />
            Origin / Source Branch
          </div>
          <div className="text-base font-bold text-foreground">
            {transfer.fromBranch?.name || transfer.from_branch?.name || 'Origin Branch'}
          </div>
          {isSourceBranch && (
            <Badge variant="outline" className="text-[10px] text-primary border-primary/20">
              Current Active Branch
            </Badge>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-emerald-500" />
            Destination Branch
          </div>
          <div className="text-base font-bold text-foreground">
            {transfer.toBranch?.name || transfer.to_branch?.name || 'Destination Branch'}
          </div>
          {isDestBranch && (
            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/20">
              Current Active Branch
            </Badge>
          )}
        </div>
      </div>

      {/* Notes */}
      {transfer.notes && (
        <div className="bg-muted/40 border border-border rounded-lg p-4 text-xs">
          <span className="font-semibold text-foreground">Notes / Remarks: </span>
          <span className="text-muted-foreground">{transfer.notes}</span>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <span className="font-semibold text-sm">
            Transfer Line Items ({transfer.items?.length || 0})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Product / Variant</th>
                <th className="px-4 py-3 text-right w-28">Sent Qty</th>
                <th className="px-4 py-3 text-right w-28">Received Qty</th>
                <th className="px-4 py-3 text-right w-28">Discrepancy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(transfer.items || []).map((item: any, idx: number) => {
                const sent = Number(item.sent_qty);
                const received = item.received_qty !== null ? Number(item.received_qty) : null;
                const diff = received !== null ? received - sent : null;

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
                    <td className="px-4 py-3 font-mono text-right">{sent}</td>
                    <td className="px-4 py-3 font-mono text-right">
                      {received !== null ? received : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {diff === null ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : diff === 0 ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-500/20 text-[10px]">
                          Matched
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="font-mono text-xs">
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

      {/* Dispatch Confirmation Dialog */}
      <ConfirmDialog
        open={isDispatchConfirmOpen}
        onOpenChange={setIsDispatchConfirmOpen}
        title="Dispatch Stock Transfer"
        description="Are you sure you want to dispatch these goods? This will deduct the stock from the source branch and move tracked units to IN_TRANSIT status."
        confirmText="Confirm Dispatch"
        onConfirm={handleDispatch}
        loading={isActionLoading}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={isCancelConfirmOpen}
        onOpenChange={setIsCancelConfirmOpen}
        title="Cancel Stock Transfer"
        description="Are you sure you want to cancel this transfer? If stock is in transit, it will be restored to the source branch."
        confirmText="Cancel Transfer"
        variant="destructive"
        onConfirm={handleCancel}
        loading={isActionLoading}
      >
        <div className="mt-3">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Cancellation Reason (Required) *
          </label>
          <input
            type="text"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation..."
            className="w-full text-sm bg-background border border-input rounded-md px-3 py-2"
          />
        </div>
      </ConfirmDialog>

      {/* Reject Dialog (Reason is required!) */}
      <ConfirmDialog
        open={isRejectDialogOpen}
        onOpenChange={setIsRejectDialogOpen}
        title="Reject Stock Transfer"
        description="Rejecting this transfer will reverse all in-transit items back to the origin branch. A clear rejection reason is mandatory."
        confirmText="Reject Transfer"
        variant="destructive"
        onConfirm={handleReject}
        loading={isActionLoading}
      >
        <div className="mt-3">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Rejection Reason (Required) *
          </label>
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Package damaged during transit or wrong consignment"
            className="w-full text-sm bg-background border border-input rounded-md px-3 py-2"
          />
        </div>
      </ConfirmDialog>

      {/* Receive Modal */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Receive Transfer: {transfer.transfer_no}</h3>
                <p className="text-xs text-muted-foreground">
                  Verify quantities received at destination branch. Note discrepancies if items are missing.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReceiveModalOpen(false)}
              >
                ✕
              </Button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {(transfer.items || []).map((item: any) => {
                const input = receiveItemInputs[item.id] || {
                  receivedQty: Number(item.sent_qty),
                  discrepancyNote: '',
                };
                const hasShortage = input.receivedQty < Number(item.sent_qty);

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border text-xs space-y-2 ${
                      hasShortage ? 'border-amber-500/40 bg-amber-500/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-foreground">
                          {item.variant?.product?.name || 'Product'}
                        </div>
                        <div className="text-muted-foreground">SKU: {item.variant?.sku}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground">Sent: </span>
                        <span className="font-mono font-bold">{item.sent_qty}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">Received:</span>
                        <QuantityInput
                          value={input.receivedQty}
                          onChange={(qty) =>
                            setReceiveItemInputs((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], receivedQty: qty },
                            }))
                          }
                          min={0}
                          max={Number(item.sent_qty)}
                        />
                      </div>

                      {hasShortage && (
                        <div className="flex-1 sm:max-w-xs">
                          <input
                            type="text"
                            value={input.discrepancyNote}
                            onChange={(e) =>
                              setReceiveItemInputs((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], discrepancyNote: e.target.value },
                              }))
                            }
                            placeholder="Mandatory discrepancy note..."
                            className="w-full text-xs bg-background border border-amber-500/50 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-between">
              <Button variant="outline" onClick={() => setIsReceiveModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReceive}
                disabled={isActionLoading}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isActionLoading ? 'Receiving...' : 'Confirm Receipt'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
