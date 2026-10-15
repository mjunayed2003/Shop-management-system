'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductForm } from '@/components/catalog/ProductForm';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useTranslation } from '@/lib/i18n';

function ProductNewContent() {
  const searchParams = useSearchParams();
  const barcode = searchParams.get('barcode') || '';

  return <ProductForm mode="create" initialData={{ barcode }} />;
}

export default function ProductNewPage() {
  const { t } = useTranslation();

  return (
    <PermissionGate
      permission="products:create"
      fallback={
        <div className="p-8 text-center text-muted-foreground">
          {t('common.unauthorized')}
        </div>
      }
    >
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">{t('common.loading')}</div>}>
        <ProductNewContent />
      </Suspense>
    </PermissionGate>
  );
}
