'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Inbox } from 'lucide-react';
import { TableSkeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { useTranslation } from '@/lib/i18n';

export interface Column<T = any> {
  key?: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  accessor?: (row: T) => any;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  totalRows?: number;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  emptyMessage?: React.ReactNode;
  className?: string;
  keyField?: string;
  pagination?: {
    page: number;
    totalPages: number;
    totalItems: number;
    limit: number;
    onPageChange: (page: number) => void;
  };
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data = [],
  isLoading = false,
  totalRows = 0,
  page = 1,
  limit = 20,
  onPageChange,
  onLimitChange,
  sortBy,
  sortOrder,
  onSortChange,
  emptyMessage,
  className = '',
  keyField = 'id',
  pagination,
}: DataTableProps<T>) {
  const { t } = useTranslation();

  const effectivePage = pagination?.page ?? page;
  const effectiveLimit = pagination?.limit ?? limit;
  const effectiveTotalRows = pagination?.totalItems ?? totalRows;
  const effectiveTotalPages =
    pagination?.totalPages ?? Math.max(1, Math.ceil(effectiveTotalRows / effectiveLimit));
  const effectiveOnPageChange = pagination?.onPageChange ?? onPageChange;

  const startRow =
    effectiveTotalRows === 0 ? 0 : (effectivePage - 1) * effectiveLimit + 1;
  const endRow = Math.min(effectivePage * effectiveLimit, effectiveTotalRows);

  const handleSort = (columnKey: string) => {
    if (!onSortChange) return;
    if (sortBy === columnKey) {
      onSortChange(columnKey, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(columnKey, 'asc');
    }
  };

  return (
    <div
      className={`w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden ${className}`}
    >
      {/* Table Container */}
      <div className="overflow-x-auto min-h-[220px]">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={effectiveLimit > 10 ? 10 : effectiveLimit} cols={columns.length} />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            {emptyMessage ? (
              typeof emptyMessage === 'string' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 mx-auto w-fit">
                    <Inbox className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {emptyMessage}
                  </h4>
                </div>
              ) : (
                emptyMessage
              )
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 mx-auto w-fit">
                  <Inbox className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t('noData')}
                </h4>
              </div>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">
                {columns.map((col, colIdx) => {
                  const alignClass =
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left';

                  const colKey = col.key || `col-${colIdx}`;

                  return (
                    <th
                      key={colKey}
                      scope="col"
                      className={`py-3.5 px-4 ${alignClass} ${col.headerClassName || ''}`}
                    >
                      {col.sortable && col.key ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.key!)}
                          className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
                        >
                          <span>{col.header}</span>
                          {sortBy === col.key ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {data.map((row, index) => (
                <tr
                  key={row[keyField] || row.id || index}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors"
                >
                  {columns.map((col, colIdx) => {
                    const alignClass =
                      col.align === 'center'
                        ? 'text-center'
                        : col.align === 'right'
                        ? 'text-right'
                        : 'text-left';

                    const colKey = col.key || `cell-${colIdx}`;

                    const content = col.render
                      ? col.render(row, index)
                      : col.accessor
                      ? col.accessor(row)
                      : (col.key ? row[col.key] ?? '-' : '-');

                    return (
                      <td
                        key={colKey}
                        className={`py-3.5 px-4 text-sm align-middle ${alignClass} ${col.className || ''}`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {!isLoading && effectiveTotalRows > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              {t('showing')} <strong className="text-slate-800 dark:text-slate-200">{startRow}</strong> -{' '}
              <strong className="text-slate-800 dark:text-slate-200">{endRow}</strong> {t('of')}{' '}
              <strong className="text-slate-800 dark:text-slate-200">{effectiveTotalRows}</strong>
            </span>

            {onLimitChange && (
              <div className="flex items-center gap-1.5 ml-4">
                <span>{t('rowsPerPage')}:</span>
                <select
                  value={effectiveLimit}
                  onChange={(e) => onLimitChange(Number(e.target.value))}
                  className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            )}
          </div>

          {effectiveOnPageChange && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => effectiveOnPageChange(effectivePage - 1)}
                disabled={effectivePage <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {t('previous')}
              </Button>
              <span className="px-2 font-medium">
                {effectivePage} / {effectiveTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => effectiveOnPageChange(effectivePage + 1)}
                disabled={effectivePage >= effectiveTotalPages}
                aria-label="Next page"
              >
                {t('next')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
