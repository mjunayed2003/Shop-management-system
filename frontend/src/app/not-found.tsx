'use client';

import React from 'react';
import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-950">
      <div className="max-w-md w-full space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 mx-auto flex items-center justify-center shadow-md">
          <FileQuestion className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {t('errors.notFoundTitle')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('errors.notFoundDesc')}
          </p>
        </div>

        <div className="pt-2">
          <Link href="/">
            <Button>
              <Home className="w-4 h-4 mr-1.5" />
              {t('errors.backToHome')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
