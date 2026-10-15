'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Button } from '../ui/button';
import { useTranslation } from '@/lib/i18n';

export function ForbiddenPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t('errors.forbiddenTitle')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {t('errors.forbiddenDesc')}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {t('back')}
          </Button>
          <Link href="/dashboard">
            <Button>
              <LayoutDashboard className="w-4 h-4 mr-1.5" />
              {t('errors.backToDashboard')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
