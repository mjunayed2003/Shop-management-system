'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { useCartStore, CartItem } from '@/lib/store/cart-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { RegisterSessionGate } from '@/components/pos/RegisterSessionGate';
import { CustomerSelectModal } from '@/components/pos/CustomerSelectModal';
import { CrossBranchModal, CrossBranchProductInfo } from '@/components/pos/CrossBranchModal';
import { HeldSalesModal } from '@/components/pos/HeldSalesModal';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { KeyboardShortcutsHelp } from '@/components/pos/KeyboardShortcutsHelp';
import { ProductQuickPick } from '@/components/pos/ProductQuickPick';
import { BarcodeInput } from '@/components/catalog/BarcodeInput';
import { QuantityInput } from '@/components/shared/QuantityInput';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { soundFx } from '@/lib/utils/audio';
import {
  ShoppingCart,
  User,
  PauseCircle,
  PlayCircle,
  CreditCard,
  Trash2,
  Tag,
  Search,
  Sparkles,
  HelpCircle,
  RefreshCw,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ShieldAlert,
  Percent,
  Plus,
  Minus,
  Edit2,
  Check,
} from 'lucide-react';

export default function PosPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { user, hasPermission } = useAuthStore();
  const { currentBranchId, currentBranch } = useBranchStore();

  const {
    items,
    customer,
    saleType,
    couponCode,
    idempotencyKey,
    serverTotals,
    isCalculating,
    calculateError,
    selectedLineId,
    initCartForContext,
    addItem,
    updateItemQuantity,
    updateItemPrice,
    updateItemDiscount,
    removeItem,
    setSelectedLineId,
    setCustomer,
    setSaleType,
    setCouponCode,
    clearCart,
    calculateTotals,
    getLocalPreview,
  } = useCartStore();

  const canDiscount =
    hasPermission('sale.discount') ||
    hasPermission('sales:discount') ||
    hasPermission('*');

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [heldModalMode, setHeldModalMode] = useState<'hold' | 'list'>('hold');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [isClearCartConfirmOpen, setIsClearCartConfirmOpen] = useState(false);

  // Cross-branch modal state
  const [crossBranchProduct, setCrossBranchProduct] = useState<CrossBranchProductInfo | null>(null);

  // Manual price override dialog state
  const [overrideLineId, setOverrideLineId] = useState<string | null>(null);
  const [overridePrice, setOverridePrice] = useState<number>(0);
  const [overrideReason, setOverrideReason] = useState<string>('');

  // Manual line discount dialog state
  const [discountLineId, setDiscountLineId] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Search input and dropdown
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [couponInput, setCouponInput] = useState(couponCode);
  const [mobileActiveTab, setMobileActiveTab] = useState<'catalog' | 'cart'>('catalog');

  // Scanner autofocus trigger
  const [scannerFocusCounter, setScannerFocusCounter] = useState(0);

  // Initialize cart when branch or user changes
  useEffect(() => {
    if (currentBranchId && user?.id) {
      initCartForContext(currentBranchId, user.id);
    }
  }, [currentBranchId, user?.id, initCartForContext]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync coupon code state
  useEffect(() => {
    setCouponInput(couponCode);
  }, [couponCode]);

  // Catalog search query
  const { data: searchResults = [], isLoading: isSearchingProducts } = useQuery({
    queryKey: ['pos-product-search', currentBranchId, debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch) return [];
      const res = await api.products.list({
        search: debouncedSearch,
        limit: 10,
      });
      return res.data || [];
    },
    enabled: Boolean(debouncedSearch.length >= 2),
    staleTime: 15000,
  });

  // Handle scanned barcode (SKU or unit barcode)
  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      const clean = barcode.trim();
      if (!clean) return;

      try {
        const result = await api.barcodes.lookup(clean);

        if (result.code === 'PRODUCT_IN_OTHER_BRANCH') {
          // Open cross-branch flow
          soundFx.playError();
          setCrossBranchProduct({
            variantId: result.variant.id,
            sku: result.variant.sku,
            productName: result.product.name,
            size: result.variant.size?.name,
            color: result.variant.color?.name,
            unitPrice: Number(result.variant.retailPrice),
            barcode: clean,
            otherBranches: result.availableBranches || [],
          });
          return;
        }

        if (result.activeInCurrentBranch && result.variant) {
          // Add variant to cart
          try {
            addItem({
              variantId: result.variant.id,
              sku: result.variant.sku,
              name: result.product.name,
              sizeName: result.variant.size?.name,
              colorName: result.variant.color?.name,
              categoryName: result.product.category?.name,
              barcode: clean,
              quantity: 1,
              unitPrice: Number(result.variant.retailPrice),
              basePrice: Number(result.variant.retailPrice),
              discountAmount: 0,
              stockAvailable: result.variant.stock,
            });
            soundFx.playSuccess();
          } catch (err: any) {
            if (err.message === 'UNIT_ALREADY_ADDED') {
              soundFx.playError();
              toast.error(t('pos.unitAlreadyAdded'));
            }
          }
          return;
        }
      } catch (err: any) {
        // If not found in standard barcodes, test if it is an individual tracked unit barcode
        try {
          const calcRes = await api.sales.calculate({
            items: [{ barcode: clean, quantity: 1 }],
            saleType,
          });

          if (calcRes.items && calcRes.items.length > 0) {
            const item = calcRes.items[0];
            try {
              addItem({
                variantId: item.variantId,
                sku: item.variantSku,
                name: item.productName || 'Tracked Unit Item',
                quantity: 1,
                unitPrice: Number(item.unitPrice),
                basePrice: Number(item.basePrice),
                discountAmount: 0,
                productUnitBarcode: item.productUnitBarcode || clean,
                trackIndividually: true,
              });
              soundFx.playSuccess();
              return;
            } catch (err: any) {
              if (err.message === 'UNIT_ALREADY_ADDED') {
                soundFx.playError();
                toast.error(t('pos.unitAlreadyAdded'));
                return;
              }
            }
          }
        } catch {
          // not tracked unit either
        }

        soundFx.playError();
        toast.error(`Barcode "${clean}" not found or inactive`);
      }
    },
    [addItem, saleType, t, toast],
  );

  // Handle adding variant from search or quick pick
  const handleSelectVariant = useCallback(
    (variant: any) => {
      const productName = variant.product?.name || variant.name || 'Product';
      const price =
        saleType === 'WHOLESALE'
          ? variant.wholesale_price ?? variant.retail_price ?? variant.retailPrice ?? 0
          : variant.retail_price ?? variant.retailPrice ?? 0;

      addItem({
        variantId: variant.id,
        sku: variant.sku,
        name: productName,
        sizeName: variant.size?.name,
        colorName: variant.color?.name,
        barcode: variant.barcode,
        quantity: 1,
        unitPrice: Number(price),
        basePrice: Number(price),
        discountAmount: 0,
        stockAvailable: variant.stock,
      });

      soundFx.playSuccess();
      setSearchInput('');
      setDebouncedSearch('');
    },
    [addItem, saleType],
  );

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is currently typing in an input/textarea/select, let some keys pass
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT';

      // F2: Focus scanner
      if (e.key === 'F2') {
        e.preventDefault();
        setScannerFocusCounter((c) => c + 1);
        return;
      }

      // F4: Customer selection
      if (e.key === 'F4') {
        e.preventDefault();
        setIsCustomerModalOpen(true);
        return;
      }

      // F8: Hold cart
      if (e.key === 'F8') {
        e.preventDefault();
        if (items.length > 0) {
          setHeldModalMode('hold');
          setIsHeldModalOpen(true);
        } else {
          toast.info('Add items to cart before holding sale');
        }
        return;
      }

      // F9: Held list
      if (e.key === 'F9') {
        e.preventDefault();
        setHeldModalMode('list');
        setIsHeldModalOpen(true);
        return;
      }

      // F10 or Ctrl+Enter: Pay
      if (e.key === 'F10' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        if (items.length > 0 && !isCalculating) {
          setIsPaymentModalOpen(true);
        }
        return;
      }

      // Selected cart line shortcuts (+, -, Delete) when NOT in input
      if (!isInput && selectedLineId) {
        const line = items.find((i) => i.id === selectedLineId);
        if (!line) return;

        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          if (!line.productUnitBarcode) {
            updateItemQuantity(line.id, line.quantity + 1);
          }
          return;
        }

        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          if (!line.productUnitBarcode && line.quantity > 1) {
            updateItemQuantity(line.id, line.quantity - 1);
          }
          return;
        }

        if (e.key === 'Delete' || e.key === 'Del') {
          e.preventDefault();
          removeItem(line.id);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, isCalculating, selectedLineId, updateItemQuantity, removeItem, toast]);

  // Handle price override modal submission
  const handleSavePriceOverride = () => {
    if (overrideLineId) {
      updateItemPrice(overrideLineId, overridePrice, overrideReason);
      setOverrideLineId(null);
      setOverridePrice(0);
      setOverrideReason('');
    }
  };

  // Handle line discount modal submission
  const handleSaveLineDiscount = () => {
    if (discountLineId) {
      updateItemDiscount(discountLineId, discountAmount);
      setDiscountLineId(null);
      setDiscountAmount(0);
    }
  };

  // Handle coupon apply
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponCode(couponInput.trim());
  };

  // Local preview totals (for zero-latency display before server returns)
  const localPreview = getLocalPreview();
  const displayTotal = serverTotals ? serverTotals.totalAmount : localPreview.totalAmount;
  const displaySubtotal = serverTotals ? serverTotals.subtotal : localPreview.subtotal;
  const displayDiscount = serverTotals ? serverTotals.totalDiscount : localPreview.discountTotal;

  return (
    <RegisterSessionGate
      onOpenShortcuts={() => setIsShortcutsHelpOpen(true)}
    >
      {(session) => (
        <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-background select-none">
          {/* ================= LEFT COLUMN: CATALOG & SEARCH ================= */}
          <div
            className={`w-full lg:w-[48%] xl:w-[45%] flex flex-col border-r border-border h-full overflow-hidden ${
              mobileActiveTab === 'cart' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Top Barcode Scanner & Search Input */}
            <div className="p-3 border-b border-border bg-card/60 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <BarcodeInput
                    onScan={handleBarcodeScan}
                    placeholder={t('pos.searchPlaceholder')}
                    autoFocus
                    clearOnScan
                    key={scannerFocusCounter}
                  />
                </div>
              </div>

              {/* Fast Autocomplete Dropdown if typing name/SKU */}
              {debouncedSearch.length >= 2 && (
                <div className="rounded-xl border border-border bg-card shadow-xl max-h-56 overflow-y-auto divide-y divide-border z-20">
                  {isSearchingProducts ? (
                    <div className="p-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Searching catalog...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((product: any) => (
                      <div key={product.id} className="p-2.5 hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-xs text-foreground">{product.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              Code: {product.code || 'N/A'}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-primary font-mono">
                            ৳{Number(product.retail_price || 0).toFixed(0)}
                          </span>
                        </div>

                        {product.variants && product.variants.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {product.variants.map((v: any) => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() =>
                                  handleSelectVariant({
                                    ...v,
                                    product: { name: product.name },
                                  })
                                }
                                className="px-2 py-0.5 rounded bg-muted hover:bg-primary hover:text-primary-foreground text-[10px] font-mono transition-colors"
                              >
                                {v.sku} ({[v.size?.name, v.color?.name].filter(Boolean).join('/')})
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      No products found matching &quot;{debouncedSearch}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Catalog Quick Pick Section */}
            <div className="flex-1 overflow-hidden">
              <ProductQuickPick onSelectVariant={handleSelectVariant} />
            </div>

            {/* Mobile Tab Switcher */}
            <div className="lg:hidden p-2 border-t border-border bg-card flex">
              <Button
                type="button"
                onClick={() => setMobileActiveTab('cart')}
                className="w-full gap-2 bg-primary text-primary-foreground text-xs font-bold"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>
                  View Cart ({items.length} items) • ৳{displayTotal.toFixed(2)}
                </span>
              </Button>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: CART & BILLING ================= */}
          <div
            className={`w-full lg:w-[52%] xl:w-[55%] flex flex-col h-full overflow-hidden bg-card/40 ${
              mobileActiveTab === 'catalog' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Cart Top Bar: Customer Selector & Sale Type Toggle */}
            <div className="p-3 border-b border-border bg-card flex flex-wrap items-center justify-between gap-2 shrink-0">
              {/* Customer Selector Button */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className={`h-9 px-3 text-xs gap-2 font-medium shadow-2xs ${
                    customer
                      ? 'border-primary/50 bg-primary/5 text-foreground'
                      : 'border-dashed'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span className="truncate max-w-[140px] font-semibold">
                    {customer ? customer.name : t('pos.walkInCustomer')}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
                    (F4)
                  </span>
                </Button>

                {customer && customer.currentDue > 0 && (
                  <Badge
                    variant="destructive"
                    className="text-[10px] font-mono cursor-pointer"
                    onClick={() => setIsCustomerModalOpen(true)}
                  >
                    Due: ৳{customer.currentDue.toFixed(0)}
                  </Badge>
                )}
              </div>

              {/* Controls: Sale Type Toggle, Hold/Held, Clear Cart */}
              <div className="flex items-center gap-1.5">
                {/* Retail / Wholesale toggle */}
                <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
                  <button
                    type="button"
                    onClick={() => setSaleType('RETAIL')}
                    className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors ${
                      saleType === 'RETAIL'
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('pos.retail')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleType('WHOLESALE')}
                    className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors ${
                      saleType === 'WHOLESALE'
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('pos.wholesale')}
                  </button>
                </div>

                {/* Hold Cart Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={items.length === 0}
                  onClick={() => {
                    setHeldModalMode('hold');
                    setIsHeldModalOpen(true);
                  }}
                  className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  title="Hold Cart (F8)"
                >
                  <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Hold</span>
                </Button>

                {/* Held List Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setHeldModalMode('list');
                    setIsHeldModalOpen(true);
                  }}
                  className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  title="Held Sales List (F9)"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Recall</span>
                </Button>

                {/* Clear Cart */}
                {items.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsClearCartConfirmOpen(true)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Clear Cart"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}

                {/* Mobile Back to Catalog Button */}
                <div className="lg:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMobileActiveTab('catalog')}
                    className="h-8 px-2 text-xs"
                  >
                    Catalog
                  </Button>
                </div>
              </div>
            </div>

            {/* Cart Lines Table / List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {items.length > 0 ? (
                items.map((line) => {
                  const isSelected = selectedLineId === line.id;
                  const lineTotal = line.totalAmount ?? line.unitPrice * line.quantity - line.discountAmount;

                  return (
                    <div
                      key={line.id}
                      onClick={() => setSelectedLineId(line.id)}
                      className={`p-2.5 rounded-xl border transition-all text-xs cursor-pointer ${
                        isSelected
                          ? 'border-primary ring-1 ring-primary bg-primary/5 shadow-2xs'
                          : 'border-border bg-card hover:border-border/80'
                      } ${line.lineError ? 'border-rose-500 bg-rose-50/20' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        {/* Left: Product Name, SKU, Badges */}
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-foreground text-xs">
                              {line.name}
                            </span>
                            {(line.sizeName || line.colorName) && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                                {[line.sizeName, line.colorName].filter(Boolean).join(' / ')}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono flex-wrap">
                            <span>SKU: {line.sku}</span>
                            {line.stockAvailable !== undefined && (
                              <span>Stock: {line.stockAvailable}</span>
                            )}
                          </div>

                          {/* Tracked unit badge */}
                          {line.productUnitBarcode && (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono">
                              <span>Unit: {line.productUnitBarcode}</span>
                            </div>
                          )}

                          {/* Cross-branch transfer badge */}
                          {line.sourceBranchName && (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold">
                              <span>{t('pos.crossBranchBadge', { branch: line.sourceBranchName })}</span>
                            </div>
                          )}

                          {line.lineError && (
                            <p className="text-[11px] text-rose-600 font-semibold">
                              {line.lineError}
                            </p>
                          )}
                        </div>

                        {/* Right: Line Total and Remove */}
                        <div className="text-right space-y-0.5">
                          <p className="font-extrabold text-xs text-foreground font-mono">
                            ৳{lineTotal.toFixed(2)}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItem(line.id);
                            }}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Line Controls: Quantity, Price, Discount */}
                      <div className="mt-2 pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground font-semibold mr-1">
                            Qty:
                          </span>
                          {line.productUnitBarcode ? (
                            <span className="px-2 py-0.5 rounded bg-muted text-xs font-mono font-bold">
                              1
                            </span>
                          ) : (
                            <div className="w-28">
                              <QuantityInput
                                value={line.quantity}
                                onChange={(qty) => updateItemQuantity(line.id, qty)}
                                min={1}
                                allowDecimal={false}
                              />
                            </div>
                          )}
                        </div>

                        {/* Price Override & Line Discount buttons */}
                        <div className="flex items-center gap-1.5">
                          {/* Unit Price button */}
                          <button
                            type="button"
                            disabled={!canDiscount}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOverrideLineId(line.id);
                              setOverridePrice(line.unitPrice);
                              setOverrideReason(line.overrideReason || '');
                            }}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                              line.isCustomPrice
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold'
                                : 'bg-muted hover:bg-muted/80 text-foreground'
                            } ${!canDiscount ? 'cursor-default' : 'hover:ring-1 hover:ring-primary'}`}
                            title={canDiscount ? 'Click to override unit price' : undefined}
                          >
                            <span>@ ৳{line.unitPrice.toFixed(2)}</span>
                            {canDiscount && <Edit2 className="w-2.5 h-2.5 opacity-60" />}
                          </button>

                          {/* Line Discount button */}
                          {canDiscount && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDiscountLineId(line.id);
                                setDiscountAmount(line.discountAmount);
                              }}
                              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                                line.discountAmount > 0
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-bold'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                              title="Line Discount"
                            >
                              <Percent className="w-2.5 h-2.5" />
                              <span>{line.discountAmount > 0 ? `-৳${line.discountAmount}` : 'Disc'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                    <ShoppingCart className="w-6 h-6 opacity-40" />
                  </div>
                  <p className="text-xs font-semibold">{t('pos.emptyCart')}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                    Scan any product or tracked unit barcode, or select items from the catalog on the left.
                  </p>
                </div>
              )}
            </div>

            {/* Cart Footer: Coupon & Authoritative Server Totals */}
            <div className="p-3 border-t border-border bg-card space-y-3 shrink-0 shadow-lg">
              {/* Coupon Code Input */}
              <form onSubmit={handleApplyCoupon} className="flex gap-1.5">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder={t('pos.couponCode')}
                    className="h-8 pl-8 text-xs font-mono"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold px-3"
                >
                  {t('pos.applyCoupon')}
                </Button>
              </form>

              {calculateError && (
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{calculateError}</span>
                </div>
              )}

              {/* Server Totals Summary Grid */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('pos.subtotal')}:</span>
                  <span className="font-mono">৳{displaySubtotal.toFixed(2)}</span>
                </div>

                {displayDiscount > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400">
                    <span>{t('pos.discount')}:</span>
                    <span className="font-mono">-৳{displayDiscount.toFixed(2)}</span>
                  </div>
                )}

                {serverTotals && serverTotals.couponDiscount > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                    <span>{t('pos.couponDiscount')} ({serverTotals.couponCode}):</span>
                    <span className="font-mono">-৳{serverTotals.couponDiscount.toFixed(2)}</span>
                  </div>
                )}

                {serverTotals && serverTotals.taxAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('pos.tax')}:</span>
                    <span className="font-mono">৳{serverTotals.taxAmount.toFixed(2)}</span>
                  </div>
                )}

                {serverTotals && serverTotals.roundOff !== 0 && (
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>{t('pos.roundOff')}:</span>
                    <span className="font-mono">
                      {serverTotals.roundOff > 0 ? '+' : ''}৳{serverTotals.roundOff.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                      {t('pos.total')}
                    </span>
                    {isCalculating && (
                      <span className="text-[10px] text-primary flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{t('pos.calculating')}</span>
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-black text-foreground font-mono">
                    ৳{displayTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Pay Now Button (F10) */}
              <Button
                type="button"
                disabled={items.length === 0 || isCalculating}
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full h-12 text-sm font-extrabold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition-transform active:scale-[0.99]"
              >
                <CreditCard className="w-5 h-5" />
                <span>{t('pos.payBtn')} • ৳{displayTotal.toFixed(2)}</span>
              </Button>
            </div>
          </div>

          {/* ================= MODALS & DIALOGS ================= */}

          {/* Customer Selection Modal */}
          <CustomerSelectModal
            isOpen={isCustomerModalOpen}
            onClose={() => setIsCustomerModalOpen(false)}
            onSelectCustomer={(cust) => setCustomer(cust)}
            currentCustomer={customer}
          />

          {/* Cross-Branch Auto-Transfer Modal */}
          <CrossBranchModal
            isOpen={Boolean(crossBranchProduct)}
            onClose={() => setCrossBranchProduct(null)}
            productInfo={crossBranchProduct}
            onConfirmTransfer={(transferItem) => {
              addItem({
                variantId: transferItem.variantId,
                sku: transferItem.sku,
                name: transferItem.name,
                sizeName: transferItem.size,
                colorName: transferItem.color,
                barcode: transferItem.barcode,
                quantity: transferItem.quantity,
                unitPrice: transferItem.unitPrice,
                basePrice: transferItem.unitPrice,
                discountAmount: 0,
                sourceBranchId: transferItem.sourceBranchId,
                sourceBranchName: transferItem.sourceBranchName,
              });
              soundFx.playSuccess();
            }}
          />

          {/* Held Sales Modal */}
          <HeldSalesModal
            isOpen={isHeldModalOpen}
            onClose={() => setIsHeldModalOpen(false)}
            mode={heldModalMode}
          />

          {/* Payment & Split Tender Modal */}
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            registerSessionId={session?.id}
          />

          {/* Keyboard Shortcuts Help */}
          <KeyboardShortcutsHelp
            isOpen={isShortcutsHelpOpen}
            onClose={() => setIsShortcutsHelpOpen(false)}
          />

          {/* Price Override Dialog */}
          <Dialog
            open={Boolean(overrideLineId)}
            onOpenChange={(open) => !open && setOverrideLineId(null)}
          >
            <DialogContent className="max-w-sm p-4 space-y-3">
              <DialogTitle className="text-sm font-bold">
                {t('pos.priceOverride')}
              </DialogTitle>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  New Unit Price (BDT)
                </label>
                <MoneyInput
                  value={overridePrice}
                  onChange={(val) => setOverridePrice(val)}
                  min={0}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  {t('pos.overrideReason')}
                </label>
                <Input
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Manager authorized clearance discount"
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOverrideLineId(null)}
                  className="text-xs"
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSavePriceOverride}
                  className="text-xs bg-primary text-primary-foreground font-semibold"
                >
                  Apply Override
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Line Discount Dialog */}
          <Dialog
            open={Boolean(discountLineId)}
            onOpenChange={(open) => !open && setDiscountLineId(null)}
          >
            <DialogContent className="max-w-sm p-4 space-y-3">
              <DialogTitle className="text-sm font-bold">
                {t('pos.lineDiscount')}
              </DialogTitle>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Discount Amount (BDT)
                </label>
                <MoneyInput
                  value={discountAmount}
                  onChange={(val) => setDiscountAmount(val)}
                  min={0}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDiscountLineId(null)}
                  className="text-xs"
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveLineDiscount}
                  className="text-xs bg-primary text-primary-foreground font-semibold"
                >
                  Apply Discount
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Clear Cart Confirmation Dialog */}
          <ConfirmDialog
            isOpen={isClearCartConfirmOpen}
            onClose={() => setIsClearCartConfirmOpen(false)}
            onConfirm={() => {
              clearCart();
              setIsClearCartConfirmOpen(false);
            }}
            title={t('pos.clearCart')}
            description={t('pos.clearCartConfirm')}
            variant="destructive"
            confirmText={t('pos.clearCart')}
            cancelText={t('cancel')}
          />
        </div>
      )}
    </RegisterSessionGate>
  );
}
