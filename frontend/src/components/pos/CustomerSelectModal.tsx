'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { CustomerSummary } from '@/lib/store/cart-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  UserPlus,
  User,
  Phone,
  AlertTriangle,
  Award,
  CreditCard,
  Check,
  X,
  Loader2,
} from 'lucide-react';

interface CustomerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: CustomerSummary | null) => void;
  currentCustomer: CustomerSummary | null;
}

export function CustomerSelectModal({
  isOpen,
  onClose,
  onSelectCustomer,
  currentCustomer,
}: CustomerSelectModalProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');

  // Debounce search input (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setDebouncedQuery('');
      setIsQuickCreateOpen(false);
      setQuickName('');
      setQuickPhone('');
    }
  }, [isOpen]);

  // Query customers (by phone lookup or search)
  const {
    data: customersList,
    isLoading: isSearching,
  } = useQuery({
    queryKey: ['customers', 'pos-lookup', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) {
        // Return recent/default customers
        const res = await api.customers.list({ limit: 8 });
        return res.data || [];
      }

      // If looks like phone digits, try lookup first
      const isPhoneLike = /^[0-9+]{4,15}$/.test(debouncedQuery.replace(/\s/g, ''));
      if (isPhoneLike) {
        try {
          const direct = await api.customers.lookup(debouncedQuery);
          if (direct) {
            return [direct];
          }
        } catch {
          // fallback to general search
        }
      }

      const res = await api.customers.list({ search: debouncedQuery, limit: 12 });
      return res.data || [];
    },
    enabled: isOpen,
    staleTime: 10000,
  });

  // Quick create mutation
  const quickCreateMutation = useMutation({
    mutationFn: async () => {
      if (!quickName.trim() || !quickPhone.trim()) {
        throw new Error('Name and phone are required');
      }
      return api.customers.quickCreate({
        name: quickName.trim(),
        phone: quickPhone.trim(),
      });
    },
    onSuccess: (newCust) => {
      toast.success(t('pos.customerCreated'));
      const summary: CustomerSummary = {
        id: newCust.id,
        name: newCust.name,
        phone: newCust.phone,
        currentDue: Number(newCust.current_due || 0),
        creditLimit: Number(newCust.credit_limit || 0),
        loyaltyPoints: Number(newCust.loyalty_points || 0),
      };
      onSelectCustomer(summary);
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create customer';
      toast.error(msg);
    },
  });

  const handleSelect = (cust: any) => {
    const summary: CustomerSummary = {
      id: cust.id,
      name: cust.name,
      phone: cust.phone,
      currentDue: Number(cust.current_due || 0),
      creditLimit: Number(cust.credit_limit || 0),
      loyaltyPoints: Number(cust.loyalty_points || 0),
    };
    onSelectCustomer(summary);
    onClose();
  };

  const handleWalkIn = () => {
    onSelectCustomer(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-border bg-card shadow-2xl">
        <DialogHeader className="p-4 pb-3 border-b border-border bg-muted/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <DialogTitle className="text-base font-bold">
                {t('pos.customer')}
              </DialogTitle>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsQuickCreateOpen(!isQuickCreateOpen)}
              className="h-8 text-xs gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isQuickCreateOpen ? t('search') : t('pos.quickCreateCustomer')}</span>
            </Button>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            {t('pos.phoneLookupPlaceholder')}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-3">
          {isQuickCreateOpen ? (
            /* Quick Create Form */
            <div className="space-y-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-primary" />
                <span>{t('pos.quickCreateCustomer')}</span>
              </h4>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    {t('pos.customerName')}
                  </label>
                  <Input
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    placeholder="Customer Name"
                    className="h-9 text-xs mt-1"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    {t('pos.customerPhone')}
                  </label>
                  <Input
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="h-9 text-xs font-mono mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsQuickCreateOpen(false)}
                  className="h-8 text-xs"
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    quickCreateMutation.isPending ||
                    !quickName.trim() ||
                    !quickPhone.trim()
                  }
                  onClick={() => quickCreateMutation.mutate()}
                  className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground"
                >
                  {quickCreateMutation.isPending && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>{t('save')}</span>
                </Button>
              </div>
            </div>
          ) : (
            /* Search Bar */
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('pos.phoneLookupPlaceholder')}
                className="pl-9 pr-8 text-xs h-9 font-mono"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Walk-in Customer Option */}
          <button
            type="button"
            onClick={handleWalkIn}
            className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors ${
              !currentCustomer
                ? 'border-primary bg-primary/10 text-primary font-semibold'
                : 'border-dashed border-border hover:bg-muted/50 text-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <User className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold">{t('pos.walkInCustomer')}</p>
                <p className="text-[10px] text-muted-foreground">Cash & retail sales only (no credit)</p>
              </div>
            </div>
            {!currentCustomer && <Check className="w-4 h-4 text-primary" />}
          </button>

          {/* Search Results List */}
          <div className="max-h-64 overflow-y-auto space-y-1.5 divide-y divide-border">
            {isSearching ? (
              <div className="py-8 flex justify-center items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Searching customer records...</span>
              </div>
            ) : customersList && customersList.length > 0 ? (
              customersList.map((cust: any) => {
                const isSelected = currentCustomer?.id === cust.id;
                const due = Number(cust.current_due || 0);

                return (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => handleSelect(cust)}
                    className={`w-full p-2.5 pt-3 rounded-lg text-left transition-colors flex items-start justify-between ${
                      isSelected
                        ? 'bg-primary/10 border border-primary/40'
                        : 'hover:bg-muted/60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground">
                          {cust.name}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 text-[9px] rounded bg-primary text-primary-foreground font-bold">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span>{cust.phone}</span>
                        </span>
                        {cust.loyalty_points > 0 && (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <Award className="w-3 h-3" />
                            <span>{cust.loyalty_points} pts</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      {due > 0 ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Due: ৳{due.toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          No Due
                        </span>
                      )}

                      {cust.credit_limit > 0 && (
                        <div className="text-[10px] text-muted-foreground">
                          Limit: ৳{Number(cust.credit_limit).toFixed(0)}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            ) : debouncedQuery ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <p>No customer found matching &quot;{debouncedQuery}&quot;</p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setQuickName(debouncedQuery);
                    setQuickPhone(debouncedQuery.replace(/\D/g, ''));
                    setIsQuickCreateOpen(true);
                  }}
                  className="text-xs text-primary mt-1"
                >
                  Create &quot;{debouncedQuery}&quot; as new customer
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
