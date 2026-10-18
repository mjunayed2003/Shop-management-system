'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useTranslation } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QuantityInput } from '@/components/shared/QuantityInput';
import {
  OtherBranchStockPanel,
  BranchStockItem,
} from '@/components/catalog/OtherBranchStockPanel';
import { Store, ArrowRight, ShieldAlert, AlertCircle } from 'lucide-react';

export interface CrossBranchProductInfo {
  variantId: string;
  sku: string;
  productName: string;
  size?: string | null;
  color?: string | null;
  unitPrice: number;
  barcode?: string;
  otherBranches: BranchStockItem[];
}

interface CrossBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  productInfo: CrossBranchProductInfo | null;
  onConfirmTransfer: (data: {
    variantId: string;
    sourceBranchId: string;
    sourceBranchName: string;
    quantity: number;
    unitPrice: number;
    sku: string;
    name: string;
    size?: string | null;
    color?: string | null;
    barcode?: string;
  }) => void;
  isOffline?: boolean;
}

export function CrossBranchModal({
  isOpen,
  onClose,
  productInfo,
  onConfirmTransfer,
  isOffline = false,
}: CrossBranchModalProps) {
  const { t } = useTranslation();
  const { hasPermission } = useAuthStore();
  const canCrossBranch =
    hasPermission('sale.cross_branch') ||
    hasPermission('sales:cross_branch') ||
    hasPermission('*');

  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [transferQty, setTransferQty] = useState<number>(1);

  React.useEffect(() => {
    if (productInfo && productInfo.otherBranches.length > 0) {
      // Pick first branch that has positive stock
      const firstPositive = productInfo.otherBranches.find((b) => b.stock > 0);
      setSelectedBranchId(firstPositive ? firstPositive.branchId : productInfo.otherBranches[0].branchId);
      setTransferQty(1);
    }
  }, [productInfo]);

  if (!productInfo) return null;

  const selectedBranch = productInfo.otherBranches.find(
    (b) => b.branchId === selectedBranchId,
  );

  const maxAvailable = selectedBranch?.stock || 0;

  const handleConfirm = () => {
    if (!selectedBranch || transferQty <= 0) return;
    onConfirmTransfer({
      variantId: productInfo.variantId,
      sourceBranchId: selectedBranch.branchId,
      sourceBranchName: selectedBranch.branchName,
      quantity: transferQty,
      unitPrice: productInfo.unitPrice,
      sku: productInfo.sku,
      name: productInfo.productName,
      size: productInfo.size,
      color: productInfo.color,
      barcode: productInfo.barcode,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border bg-card shadow-2xl">
        <DialogHeader className="p-4 pb-3 border-b border-border bg-amber-50/60 dark:bg-amber-950/30">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('pos.crossBranchTitle')}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            {t('pos.crossBranchDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Item details */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs space-y-1">
            <p className="font-bold text-foreground text-sm">
              {productInfo.productName}
            </p>
            <div className="flex items-center gap-3 text-muted-foreground font-mono text-[11px]">
              <span>SKU: {productInfo.sku}</span>
              {(productInfo.size || productInfo.color) && (
                <span>
                  {[productInfo.size, productInfo.color].filter(Boolean).join(' / ')}
                </span>
              )}
            </div>
          </div>

          {/* Offline warning check */}
          {isOffline && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-bold">Cross-Branch Unavailable in Offline Mode</p>
                <p className="text-[11px] mt-0.5">
                  Inter-branch stock reservation requires real-time network verification with the central server.
                </p>
              </div>
            </div>
          )}

          {/* Other branches stock panel */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-2">
              {t('pos.sourceBranch')}:
            </label>
            <OtherBranchStockPanel
              branches={productInfo.otherBranches}
              productName={productInfo.productName}
              variantSku={productInfo.sku}
              onSelectBranch={(bId) => setSelectedBranchId(bId)}
            />
          </div>

          {/* Action gated by sale.cross_branch permission */}
          {canCrossBranch ? (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground">
                    {t('pos.transferQty')}
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Max in {selectedBranch?.branchName || 'selected'}: {maxAvailable}
                  </p>
                </div>
                <div className="w-32">
                  <QuantityInput
                    value={transferQty}
                    onChange={(qty) => setTransferQty(qty)}
                    min={1}
                    max={maxAvailable > 0 ? maxAvailable : 999}
                    allowDecimal={false}
                  />
                </div>
              </div>

              {selectedBranch && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                  <span>Transfer source:</span>
                  <span className="font-bold">{selectedBranch.branchName}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Missing Permission: sale.cross_branch</p>
                <p className="text-[11px] mt-0.5">
                  Your current cashier role is not authorized to pull inventory from other outlets.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-3 border-t border-border bg-muted/20 flex gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            {t('cancel')}
          </Button>

          {canCrossBranch && (
            <Button
              type="button"
              size="sm"
              disabled={isOffline || !selectedBranch || maxAvailable <= 0 || transferQty <= 0}
              onClick={handleConfirm}
              className="text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <span>{t('pos.addToCartWithTransfer')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
