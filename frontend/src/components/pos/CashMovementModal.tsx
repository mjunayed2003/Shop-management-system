'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign,
  AlertTriangle,
  History,
  Loader2,
  Clock,
  User,
} from 'lucide-react';

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'PAY_IN' | 'PAY_OUT';
  onSuccess?: () => void;
}

export function CashMovementModal({
  isOpen,
  onClose,
  defaultType = 'PAY_IN',
  onSuccess,
}: CashMovementModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const currentBranch = useBranchStore((s) => s.currentBranch);

  const [type, setType] = useState<'PAY_IN' | 'PAY_OUT'>(defaultType);
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setAmount(0);
      setReason('');
      setActiveTab('form');
    }
  }, [isOpen, defaultType]);

  // Fetch live session summary to know current live expected drawer cash
  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['register-session-summary', currentBranch?.id],
    queryFn: () => api.sales.registerSessions.summary(),
    enabled: isOpen,
    staleTime: 5000,
  });

  // Fetch recent cash movements for active session
  const { data: movements, isLoading: isLoadingMovements } = useQuery({
    queryKey: ['cash-movements', currentBranch?.id, summary?.session?.id],
    queryFn: () => api.sales.registerSessions.cashMovements(summary?.session?.id),
    enabled: isOpen && activeTab === 'history',
  });

  const availableCash = new Decimal(summary?.expected_balance || 0);
  const enteredAmount = new Decimal(amount || 0);
  const isPayOut = type === 'PAY_OUT';
  const exceedsAvailable = isPayOut && enteredAmount.greaterThan(availableCash);

  // Submit Mutation
  const movementMutation = useMutation({
    mutationFn: () =>
      api.sales.registerSessions.createCashMovement({
        type,
        amount,
        reason: reason.trim(),
        registerSessionId: summary?.session?.id,
      }),
    onSuccess: () => {
      toast.success(t('cashMovements.movementSaved'));
      queryClient.invalidateQueries({ queryKey: ['register-session'] });
      queryClient.invalidateQueries({ queryKey: ['register-session-summary'] });
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to record cash movement');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredAmount.lessThanOrEqualTo(0)) {
      toast.warning('Amount must be greater than zero.');
      return;
    }
    if (!reason.trim()) {
      toast.warning(t('cashMovements.reason') + ' is required.');
      return;
    }
    if (exceedsAvailable) {
      toast.error(
        t('cashMovements.exceedsDrawerCash', { balance: availableCash.toFixed(2) }),
      );
      return;
    }
    movementMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Drawer Cash Management</span>
          </DialogTitle>
          <DialogDescription>
            Record manual pay-in or pay-out against current active cash drawer.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition-colors ${
              activeTab === 'form'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            New Cash Movement
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Session History
          </button>
        </div>

        {activeTab === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Type Selector Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('PAY_IN')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-semibold transition-all ${
                  type === 'PAY_IN'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
                <span>Pay-In (Add Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('PAY_OUT')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-semibold transition-all ${
                  type === 'PAY_OUT'
                    ? 'border-rose-600 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpCircle className="w-4 h-4 text-rose-600" />
                <span>Pay-Out (Withdraw)</span>
              </button>
            </div>

            {/* Live Drawer Cash Notice */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">{t('cashMovements.drawerBalance')}:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                ৳{availableCash.toFixed(2)}
              </span>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('cashMovements.amount')} *
              </label>
              <MoneyInput
                value={amount}
                onChange={(val) => setAmount(val)}
                placeholder="0.00"
                min={0}
                className="text-base font-semibold"
                autoFocus
              />
              {exceedsAvailable && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('cashMovements.exceedsDrawerCash', { balance: availableCash.toFixed(2) })}</span>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('cashMovements.reason')} *
              </label>
              <Textarea
                value={reason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
                placeholder={t('cashMovements.reasonPlaceholder')}
                className="text-xs resize-none"
                rows={3}
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={movementMutation.isPending || exceedsAvailable || enteredAmount.lessThanOrEqualTo(0)}
                className={`gap-1.5 font-semibold text-white ${
                  isPayOut
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {movementMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {isPayOut ? 'Confirm Pay-Out' : 'Confirm Pay-In'}
                </span>
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* History Tab */
          <div className="py-2 space-y-3">
            {isLoadingMovements ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading movements...</div>
            ) : !movements || movements.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No manual cash movements recorded for this session yet.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border rounded-lg border-slate-200 dark:border-slate-800">
                {movements.map((m: any) => (
                  <div key={m.id} className="p-3 text-xs flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-semibold">
                        {m.type === 'PAY_IN' ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <ArrowDownCircle className="w-3.5 h-3.5" /> Pay-In
                          </span>
                        ) : (
                          <span className="text-rose-600 flex items-center gap-1">
                            <ArrowUpCircle className="w-3.5 h-3.5" /> Pay-Out
                          </span>
                        )}
                        <span className="text-slate-400 font-normal">·</span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">{m.reason}</p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-mono font-bold text-sm ${
                          m.type === 'PAY_IN' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {m.type === 'PAY_IN' ? '+' : '-'}৳{Number(m.amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="w-full">
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
