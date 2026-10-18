'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { Loader2, Tag, Shirt, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProductQuickPickProps {
  onSelectVariant: (variant: any) => void;
}

export function ProductQuickPick({ onSelectVariant }: ProductQuickPickProps) {
  const { t } = useTranslation();
  const { currentBranchId } = useBranchStore();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');

  // Categories query
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-quick-pick'],
    queryFn: async () => {
      return api.categories.list();
    },
    staleTime: 60000,
  });

  // Products query
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products-quick-pick', currentBranchId, selectedCategoryId],
    queryFn: async () => {
      const params: any = { limit: 30 };
      if (selectedCategoryId !== 'ALL') {
        params.categoryId = selectedCategoryId;
      }
      const res = await api.products.list(params);
      return res.data || [];
    },
    enabled: Boolean(currentBranchId),
    staleTime: 30000,
  });

  const products = productsData || [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Category Pills Bar */}
      <div className="flex items-center gap-1.5 p-2 border-b border-border overflow-x-auto no-scrollbar shrink-0 bg-muted/20">
        <button
          type="button"
          onClick={() => setSelectedCategoryId('ALL')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedCategoryId === 'ALL'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
          }`}
        >
          {t('pos.allCategories')}
        </button>
        {categories.map((cat: any) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategoryId(cat.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategoryId === cat.id
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Loading quick catalog...</span>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
            {products.map((product: any) => {
              const variants = product.variants || [];
              const defaultVariant = variants[0];
              const price = defaultVariant?.retail_price ?? product.retail_price ?? 0;

              return (
                <div
                  key={product.id}
                  className="p-2.5 rounded-xl border border-border bg-card hover:border-primary/50 transition-all text-left flex flex-col justify-between shadow-2xs group"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-xs text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {product.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {defaultVariant?.sku || product.sku || 'SKU'}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between">
                    <span className="font-bold text-xs text-primary font-mono">
                      ৳{Number(price).toFixed(0)}
                    </span>

                    {variants.length > 1 ? (
                      <div className="flex gap-1 overflow-x-auto max-w-[120px]">
                        {variants.slice(0, 3).map((v: any) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() =>
                              onSelectVariant({
                                ...v,
                                product: { name: product.name },
                              })
                            }
                            className="px-1.5 py-0.5 rounded bg-muted hover:bg-primary hover:text-primary-foreground text-[9px] font-bold transition-colors"
                          >
                            {v.size?.name || v.color?.name || 'Var'}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          onSelectVariant(
                            defaultVariant
                              ? { ...defaultVariant, product: { name: product.name } }
                              : product,
                          )
                        }
                        className="px-2 py-0.5 rounded bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-[10px] font-bold transition-colors"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-xs text-muted-foreground">
            <Shirt className="w-8 h-8 opacity-40 mb-2" />
            <p>No products found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
