'use client';

import React from 'react';
import { Store, AlertCircle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';

export interface BranchStockItem {
  branchId: string;
  branchName: string;
  branchCode?: string;
  stock: number;
}

interface OtherBranchStockPanelProps {
  branches: BranchStockItem[];
  productName?: string;
  variantSku?: string;
  onSelectBranch?: (branchId: string) => void;
  className?: string;
}

export function OtherBranchStockPanel({
  branches,
  productName,
  variantSku,
  onSelectBranch,
  className = '',
}: OtherBranchStockPanelProps) {
  const { t } = useTranslation();

  if (!branches || branches.length === 0) {
    return (
      <div className={`p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2.5 ${className}`}>
        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>No stock found for this item in any other branches.</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm ${className}`}>
      <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {t('catalog.availableInOtherBranches')}
          </h4>
        </div>
        <Badge variant="outline" className="text-[10px] font-semibold">
          {branches.length} {branches.length === 1 ? 'Branch' : 'Branches'}
        </Badge>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
        {branches.map((b) => (
          <div
            key={b.branchId}
            className="p-3 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors text-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                {b.branchCode || 'BR'}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{b.branchName}</p>
                {b.branchCode && (
                  <p className="text-[10px] text-slate-400 font-mono">Code: {b.branchCode}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                  b.stock > 0
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                }`}>
                  {b.stock} in stock
                </span>
              </div>
              {onSelectBranch && (
                <button
                  type="button"
                  onClick={() => onSelectBranch(b.branchId)}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                  title="Select Branch"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
