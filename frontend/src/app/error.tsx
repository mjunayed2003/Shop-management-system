'use client';

import React, { useEffect } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    // In production, avoid logging sensitive user details
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-950">
      <div className="max-w-md w-full space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center shadow-md">
          <AlertOctagon className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t('errors.serverErrorTitle')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {error?.message || t('errors.serverErrorDesc')}
          </p>
        </div>

        <div className="pt-2">
          <Button onClick={() => reset()}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            {t('refresh')}
          </Button>
        </div>
      </div>
    </div>
  );
}
