'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { useTranslation } from '@/lib/i18n';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/feedback/ToastContext';
import {
  Lock,
  Unlock,
  Store,
  Clock,
  User,
  AlertCircle,
  Loader2,
  Volume2,
  VolumeX,
  Keyboard,
  LogOut,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { soundFx } from '@/lib/utils/audio';

export interface RegisterSession {
  id: string;
  cash_register_id: string;
  user_id: string;
  opening_balance: number;
  status: 'OPEN' | 'CLOSED';
  opened_at: string;
  cash_register?: {
    id: string;
    name: string;
    code: string;
  };
}

interface RegisterSessionGateProps {
  children: (session: RegisterSession) => React.ReactNode;
  onOpenShortcuts?: () => void;
}

export function RegisterSessionGate({
  children,
  onOpenShortcuts,
}: RegisterSessionGateProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { currentBranchId, currentBranch } = useBranchStore();
  const { user } = useAuthStore();

  const [selectedRegisterId, setSelectedRegisterId] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(soundFx.isEnabled());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // 1. Fetch current open register session for this user in this branch
  const {
    data: currentSession,
    isLoading: isLoadingSession,
    error: sessionError,
  } = useQuery({
    queryKey: ['register-session', 'current', currentBranchId, user?.id],
    queryFn: async () => {
      try {
        const res = await api.sales.registerSessions.current();
        return res as RegisterSession;
      } catch (err: any) {
        if (err?.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: Boolean(currentBranchId && user?.id),
    retry: false,
    staleTime: 30000,
  });

  // 2. Fetch current branch details (includes active cash registers)
  const { data: branchDetails, isLoading: isLoadingBranch } = useQuery({
    queryKey: ['branch-details', currentBranchId],
    queryFn: async () => {
      if (!currentBranchId) return null;
      return api.branches.get(currentBranchId);
    },
    enabled: Boolean(currentBranchId),
  });

  const cashRegisters: Array<{ id: string; name: string; code: string }> =
    (branchDetails as any)?.cash_registers || [];

  // Automatically pick the first register if none selected
  React.useEffect(() => {
    if (cashRegisters.length > 0 && !selectedRegisterId) {
      setSelectedRegisterId(cashRegisters[0].id);
    }
  }, [cashRegisters, selectedRegisterId]);

  // 3. Mutation to open a new register session
  const openSessionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRegisterId) {
        throw new Error('Please select a cash register');
      }
      return api.sales.registerSessions.open({
        cashRegisterId: selectedRegisterId,
        openingBalance,
      });
    },
    onSuccess: () => {
      toast.success(t('pos.sessionInfo'), t('pos.openRegisterBtn'));
      queryClient.invalidateQueries({ queryKey: ['register-session', 'current'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to open register session';
      toast.error(msg);
    },
  });

  const toggleSound = () => {
    const next = !soundEnabled;
    soundFx.setEnabled(next);
    setSoundEnabled(next);
    if (next) soundFx.playSuccess();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (isLoadingSession || isLoadingBranch) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  // If no active session, show the Open Register Session Gate
  if (!currentSession) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-border shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">
              {t('pos.openSession')}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {t('pos.openSessionToSell')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-muted/50 border border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-primary" />
                <span className="font-semibold">{currentBranch?.name || 'Current Branch'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="w-3.5 h-3.5" />
                <span>{user?.fullName || user?.firstName}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>{t('pos.cashRegister')}</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {cashRegisters.length} available
                </span>
              </label>
              {cashRegisters.length > 0 ? (
                <select
                  value={selectedRegisterId}
                  onChange={(e) => setSelectedRegisterId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                >
                  {cashRegisters.map((reg) => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name} ({reg.code})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-semibold">No Cash Register Configured</p>
                    <p className="text-[11px] mt-0.5">
                      Please ensure a cash register is created for this branch before opening a shift.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {t('pos.openingBalance')}
              </label>
              <MoneyInput
                value={openingBalance}
                onChange={(val) => setOpeningBalance(val)}
                placeholder="0.00"
                min={0}
                className="text-base font-semibold"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Count the actual physical cash inside the register drawer.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => openSessionMutation.mutate()}
              disabled={
                openSessionMutation.isPending ||
                !selectedRegisterId ||
                cashRegisters.length === 0
              }
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 shadow-sm text-sm"
            >
              {openSessionMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
              <span>{t('pos.openRegisterBtn')}</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active Session: Render POS Header bar + Children
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* POS Top Bar */}
      <header className="h-12 px-3 border-b border-border bg-card flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider">
            <Store className="w-3.5 h-3.5" />
            <span>{currentBranch?.code || 'POS'}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="font-semibold text-foreground">
              {currentSession.cash_register?.name || 'Register 1'}
            </span>
            <span className="text-muted-foreground font-mono text-[11px]">
              ({currentSession.cash_register?.code || 'REG-1'})
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground border-l border-border pl-3">
            <Clock className="w-3 h-3 text-emerald-600" />
            <span>
              {new Date(currentSession.opened_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1 text-[11px] text-muted-foreground border-l border-border pl-3">
            <User className="w-3 h-3" />
            <span className="font-medium text-foreground">
              {user?.fullName || user?.firstName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenShortcuts && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onOpenShortcuts}
              className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
              title="Keyboard Shortcuts"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Shortcuts</span>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleSound}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title={soundEnabled ? 'Mute Audio FX' : 'Enable Audio FX'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hidden sm:flex"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 border-rose-200 dark:border-rose-900"
          >
            <Link href="/pos/register/close">
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('pos.closeSession')}</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* POS Content Body */}
      <div className="flex-1 overflow-hidden relative">
        {children(currentSession)}
      </div>
    </div>
  );
}
