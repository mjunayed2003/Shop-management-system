'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { ProductForm } from '@/components/catalog/ProductForm';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export default function ProductEditPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => api.catalog.products.get(productId),
    enabled: !!productId,
  });

  return (
    <PermissionGate
      permission="products:update"
      fallback={
        <div className="p-8 text-center text-muted-foreground">
          {t('common.unauthorized')}
        </div>
      }
    >
      <div className="space-y-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-16 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          </div>
        )}

        {error && (
          <div className="p-8 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">Failed to load product</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/products')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
          </div>
        )}

        {product && !isLoading && (
          <ProductForm mode="edit" initialData={product} />
        )}
      </div>
    </PermissionGate>
  );
}
