'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useCartStore, CartItem } from '@/lib/store/cart-store';
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
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  PauseCircle,
  PlayCircle,
  Trash2,
  Clock,
  User,
  ShoppingBag,
  Info,
  Loader2,
} from 'lucide-react';

interface HeldSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'hold' | 'list';
}

export function HeldSalesModal({ isOpen, onClose, mode }: HeldSalesModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { currentBranchId } = useBranchStore();
  const {
    items,
    customer,
    clearCart,
    addItem,
    setCustomer,
    calculateTotals,
  } = useCartStore();

  const [referenceName, setReferenceName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setReferenceName(customer?.name ? `${customer.name} - Hold` : '');
    }
  }, [isOpen, customer]);

  // List held sales
  const {
    data: heldList,
    isLoading: isLoadingHeld,
    refetch,
  } = useQuery({
    queryKey: ['held-sales', currentBranchId],
    queryFn: async () => {
      const res = await api.sales.held.list();
      return (res as any[]) || [];
    },
    enabled: isOpen && mode === 'list',
  });

  // Hold current cart mutation
  const holdMutation = useMutation({
    mutationFn: async () => {
      if (!referenceName.trim()) {
        throw new Error('Please enter a reference name or customer note');
      }
      return api.sales.held.hold({
        referenceName: referenceName.trim(),
        customerId: customer?.id,
        items: items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
          unitPrice: i.isCustomPrice ? i.unitPrice : undefined,
          discountAmount: i.discountAmount > 0 ? i.discountAmount : undefined,
        })),
      });
    },
    onSuccess: () => {
      toast.success(t('pos.cartHeld'));
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['held-sales'] });
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to hold cart';
      toast.error(msg);
    },
  });

  // Retrieve held sale mutation
  const retrieveMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.sales.held.retrieve(id);
    },
    onSuccess: (data: any) => {
      clearCart();

      // Load customer if present
      if (data.heldSale?.customer) {
        setCustomer({
          id: data.heldSale.customer.id,
          name: data.heldSale.customer.name,
          phone: data.heldSale.customer.phone,
          currentDue: Number(data.heldSale.customer.current_due || 0),
          creditLimit: Number(data.heldSale.customer.credit_limit || 0),
          loyaltyPoints: Number(data.heldSale.customer.loyalty_points || 0),
        });
      }

      // Load items from fresh server calculation response
      const serverItems = data.calculatedCart?.items || [];
      if (serverItems.length > 0) {
        for (const sItem of serverItems) {
          addItem({
            variantId: sItem.variantId,
            sku: sItem.variantSku || 'SKU',
            name: sItem.productName || sItem.variantName || 'Item',
            quantity: Number(sItem.quantity),
            unitPrice: Number(sItem.unitPrice),
            basePrice: Number(sItem.basePrice || sItem.unitPrice),
            discountAmount: Number(sItem.discountAmount || 0),
            taxAmount: Number(sItem.taxAmount || 0),
            totalAmount: Number(sItem.totalAmount || 0),
            productUnitBarcode: sItem.productUnitBarcode,
            sourceBranchId: sItem.sourceBranchId,
          });
        }
      } else if (data.heldSale?.items) {
        for (const hItem of data.heldSale.items) {
          addItem({
            variantId: hItem.variant_id,
            sku: hItem.variant?.sku || 'SKU',
            name: hItem.variant?.product?.name || 'Item',
            quantity: Number(hItem.quantity),
            unitPrice: Number(hItem.unit_price),
            basePrice: Number(hItem.unit_price),
            discountAmount: Number(hItem.discount_amount || 0),
          });
        }
      }

      // Re-calculate totals
      calculateTotals();
      queryClient.invalidateQueries({ queryKey: ['held-sales'] });
      toast.success(t('pos.retrieve'), 'Cart restored with fresh catalog prices');
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to retrieve held cart';
      toast.error(msg);
    },
  });

  // Delete held sale mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.sales.held.delete(id);
    },
    onSuccess: () => {
      toast.success('Held sale removed');
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['held-sales'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete held sale';
      toast.error(msg);
    },
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg p-0 overflow-hidden border-border bg-card shadow-2xl">
          <DialogHeader className="p-4 pb-3 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <PauseCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <DialogTitle className="text-base font-bold">
                {mode === 'hold' ? t('pos.holdCart') : t('pos.heldSales')}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{t('pos.holdNotice')}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 space-y-4">
            {mode === 'hold' ? (
              /* HOLD CART FORM */
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t('pos.heldReference')}
                  </label>
                  <Input
                    value={referenceName}
                    onChange={(e) => setReferenceName(e.target.value)}
                    placeholder="e.g. Table 4 / Customer waiting for wallet"
                    className="h-10 text-sm"
                    autoFocus
                  />
                </div>

                <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Items in cart:</span>
                    <span className="font-semibold text-foreground">{items.length} lines</span>
                  </div>
                  {customer && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Customer:</span>
                      <span className="font-semibold text-foreground">{customer.name}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    className="text-xs"
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={holdMutation.isPending || !referenceName.trim() || items.length === 0}
                    onClick={() => holdMutation.mutate()}
                    className="text-xs font-semibold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {holdMutation.isPending && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    <span>Hold Cart</span>
                  </Button>
                </div>
              </div>
            ) : (
              /* HELD SALES LIST */
              <div className="space-y-2">
                {isLoadingHeld ? (
                  <div className="py-8 flex justify-center items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Loading held carts...</span>
                  </div>
                ) : heldList && heldList.length > 0 ? (
                  <div className="max-h-72 overflow-y-auto space-y-2 divide-y divide-border">
                    {heldList.map((held: any) => (
                      <div
                        key={held.id}
                        className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <p className="font-bold text-foreground text-sm">
                            {held.reference_name}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-[11px]">
                            <span className="flex items-center gap-1">
                              <ShoppingBag className="w-3 h-3" />
                              <span>{held.items?.length || 0} items</span>
                            </span>
                            {held.customer && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>{held.customer.name}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span>
                                {new Date(held.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            disabled={retrieveMutation.isPending}
                            onClick={() => retrieveMutation.mutate(held.id)}
                            className="h-8 px-3 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>{t('pos.retrieve')}</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={deleteMutation.isPending}
                            onClick={() => setDeleteId(held.id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    <PauseCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                    <p>No held sales for this branch.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
        }}
        title="Delete Held Sale"
        description={t('pos.deleteHeldConfirm')}
        variant="destructive"
        confirmText={t('delete')}
        cancelText={t('cancel')}
      />
    </>
  );
}
