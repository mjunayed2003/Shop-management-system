'use client';

import React from 'react';
import { useServiceWorker } from '@/lib/pwa/use-service-worker';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export function PwaUpdatePrompt() {
  const { showReloadPrompt, reloadApp, isInstallable, promptInstall } = useServiceWorker();
  const { t } = useTranslation();

  return (
    <>
      {/* App Update Prompt (displayed only when cart is empty) */}
      {showReloadPrompt && (
        <aside
          role="status"
          aria-label="Application update available"
          className="fixed bottom-4 right-4 z-50 p-4 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white shadow-2xl border border-emerald-500/30 flex items-center gap-3 animate-slideUp"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold leading-tight">{t('pwa.newVersionTitle')}</h4>
            <p className="text-[11px] text-slate-300">{t('pwa.newVersionDesc')}</p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={reloadApp}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs ml-2 h-8 px-3"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            {t('pwa.reloadBtn')}
          </Button>
        </aside>
      )}

      {/* PWA Install Button Floating when installable */}
      {isInstallable && (
        <button
          type="button"
          onClick={promptInstall}
          aria-label="Install POS App"
          className="fixed bottom-4 left-4 z-40 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-transform active:scale-95"
        >
          <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{t('pwa.installBtn')}</span>
        </button>
      )}
    </>
  );
}
