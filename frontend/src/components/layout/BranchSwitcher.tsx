'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '../feedback/ToastContext';
import { Store, ChevronDown, Check } from 'lucide-react';

export function BranchSwitcher() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { branches, currentBranchId, currentBranch, switchBranch } = useBranchStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!branches || branches.length === 0) {
    return null;
  }

  // If user only has a single branch, auto-select and show read-only label
  if (branches.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        <Store className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="truncate max-w-[140px]">{branches[0].name}</span>
      </div>
    );
  }

  const handleSelect = (branchId: string) => {
    if (branchId === currentBranchId) {
      setIsOpen(false);
      return;
    }

    const nextBranch = branches.find((b) => b.id === branchId);
    switchBranch(branchId, queryClient);
    setIsOpen(false);

    toast.info(
      `${t('branch.switchBranch')}: ${nextBranch?.name || branchId}`,
      t('branch.currentBranch'),
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span className="truncate max-w-[150px] font-semibold">
          {currentBranch?.name || t('branch.switchBranch')}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-60 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 p-1.5 space-y-1 animate-scaleIn">
          <div className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
            {t('branch.allBranches')} ({branches.length})
          </div>
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {branches.map((b) => {
              const isSelected = b.id === currentBranchId;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelect(b.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="truncate">{b.name}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{b.code}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
