'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useToast } from '@/components/feedback/ToastContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  FileText,
  Clock,
  User,
  ShoppingBag,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  Layers,
} from 'lucide-react';

export default function SyncConflictsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { currentBranchId, currentBranch } = useBranchStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolveTarget, setResolveTarget] = useState<any | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const { data: conflicts = [], isLoading, refetch } = useQuery({
    queryKey: ['sync', 'conflicts', currentBranchId],
    queryFn: () => api.sync.conflicts(),
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => api.sync.retryConflict(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync'] });
      toast.success('Sync item retried successfully.');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Retry failed');
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      api.sync.resolveConflict(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync'] });
      toast.success('Conflict marked as resolved.');
      setResolveTarget(null);
      setResolveNotes('');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to resolve conflict');
    },
  });

  const formatConflictReason = (error: string | null | undefined) => {
    if (!error) return 'Unspecified sync issue';
    if (error.includes('closed') || error.includes('Register session')) {
      return 'The register shift linked to this offline sale was already closed on the server before the sale could be synced.';
    }
    if (error.includes('negative stock') || error.includes('Negative stock')) {
      return 'Offline sale depleted inventory beyond available stock, resulting in negative balance.';
    }
    if (error.includes('clock skew') || error.includes('future')) {
      return 'The client device clock differs significantly from the server clock.';
    }
    if (error.includes('30 days')) {
      return 'Transaction timestamp is older than the 30-day allowed sync window.';
    }
    return error;
  };

  return (
    <PermissionGate
      permission={['sync:manage', 'sales:manage', '*']}
      fallback={
        <div className="p-8 text-center text-xs text-slate-400">
          You lack permission to review and resolve offline sync conflicts.
        </div>
      }
    >
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
              <span>Offline Sync Conflict Review</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Review, inspect, retry, or manually resolve sync disputes and server rejections
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs h-9 rounded-xl"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh Conflicts
          </Button>
        </div>

        {/* Conflicts List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading conflicts...</div>
          ) : conflicts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Zero Sync Conflicts</h3>
              <p className="text-xs text-slate-400">
                All offline transactions for this branch are cleanly reconciled.
              </p>
            </div>
          ) : (
            conflicts.map((item: any) => {
              const isExpanded = expandedId === item.id;
              const payload = item.payload || {};

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-rose-200 dark:border-rose-950/80 bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-all"
                >
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-100 dark:border-rose-950/40">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-slate-900 dark:text-white">
                            {item.entity_type}
                          </span>
                          <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">
                            {item.status}
                          </Badge>
                          <span className="text-xs font-mono text-slate-400">
                            Inv: {payload.invoiceNo || item.client_sync_id.slice(0, 8)}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                          {formatConflictReason(item.error_message)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => retryMutation.mutate(item.id)}
                        disabled={retryMutation.isPending}
                        className="text-xs h-8 rounded-xl"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        Retry
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setResolveTarget(item);
                          setResolveNotes('');
                        }}
                        className="text-xs h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Resolve
                      </Button>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title={isExpanded ? 'Collapse' : 'Inspect payload'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Human-Readable Payload Inspector */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Created At</span>
                          <div className="font-mono text-slate-800 dark:text-slate-200">
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Register Session</span>
                          <div className="font-mono text-slate-800 dark:text-slate-200 truncate">
                            {payload.registerSessionId || 'None'}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Total Items</span>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {payload.items?.length || 0} line(s)
                          </div>
                        </div>
                      </div>

                      {/* Items breakdown */}
                      {payload.items && payload.items.length > 0 && (
                        <div className="space-y-1">
                          <h4 className="text-[11px] font-bold uppercase text-slate-400">Sold Items in Transaction</h4>
                          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 text-[10px] uppercase font-semibold">
                                <tr>
                                  <th className="py-2 px-3">Variant ID</th>
                                  <th className="py-2 px-3">Quantity</th>
                                  <th className="py-2 px-3">Unit Price</th>
                                  <th className="py-2 px-3">Discount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {payload.items.map((i: any, idx: number) => (
                                  <tr key={idx}>
                                    <td className="py-2 px-3 font-mono text-[11px]">{i.variantId}</td>
                                    <td className="py-2 px-3 font-bold">{i.quantity}</td>
                                    <td className="py-2 px-3 font-mono">{i.unitPrice ? `${i.unitPrice} BDT` : 'Default'}</td>
                                    <td className="py-2 px-3 font-mono">{i.discountAmount || 0} BDT</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Resolve Modal Dialog */}
        <Dialog open={Boolean(resolveTarget)} onOpenChange={(open) => !open && setResolveTarget(null)}>
          <DialogContent className="max-w-md p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Resolve Conflict</DialogTitle>
            </DialogHeader>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Provide an explanation note for why this conflict is being accepted or manually reconciled in accounting:
            </p>

            <Input
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              placeholder="e.g., Stock adjustment performed manually; ledger variance recorded."
              className="text-xs h-9 rounded-xl"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResolveTarget(null)}
                className="text-xs h-8 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={resolveMutation.isPending || !resolveNotes.trim()}
                onClick={() => resolveMutation.mutate({ id: resolveTarget.id, notes: resolveNotes })}
                className="text-xs h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                {resolveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Confirm Resolution
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
