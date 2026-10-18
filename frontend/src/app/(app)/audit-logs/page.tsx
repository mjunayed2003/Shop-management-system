'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ExportButton } from '@/components/shared/ExportButton';
import {
  ShieldAlert,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Layers,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function AuditLogsPage() {
  const { currentBranchId } = useBranchStore();
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', currentBranchId, page, actionFilter, tableFilter],
    queryFn: () =>
      api.auditLogs.list({
        page,
        limit: 25,
        action: actionFilter || undefined,
        entityTable: tableFilter || undefined,
      }),
  });

  const logs = data?.data || [];
  const totalPages = data?.pagination?.totalPages || 1;

  const renderReadableDiff = (oldValues: any, newValues: any) => {
    if (!oldValues && !newValues) return <span className="text-slate-400">No field changes captured</span>;

    const oldObj = typeof oldValues === 'object' && oldValues !== null ? oldValues : {};
    const newObj = typeof newValues === 'object' && newValues !== null ? newValues : {};

    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

    if (allKeys.length === 0) return <span className="text-slate-400">Empty payload</span>;

    return (
      <div className="space-y-1.5 font-mono text-[11px]">
        {allKeys.map((key) => {
          const oldVal = JSON.stringify(oldObj[key]);
          const newVal = JSON.stringify(newObj[key]);
          const isChanged = oldVal !== newVal;

          return (
            <div
              key={key}
              className={`p-1.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-1 ${
                isChanged ? 'bg-amber-50/60 dark:bg-amber-950/30' : 'bg-slate-50 dark:bg-slate-800/40'
              }`}
            >
              <span className="font-bold text-slate-700 dark:text-slate-300">{key}:</span>
              <div className="flex items-center gap-2 truncate">
                {oldVal !== undefined && (
                  <span className="text-rose-600 dark:text-rose-400 line-through truncate max-w-xs">
                    {oldVal}
                  </span>
                )}
                {isChanged && <span className="text-slate-400 font-sans">→</span>}
                {newVal !== undefined && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-xs">
                    {newVal}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <PermissionGate
      permission={['audit:read', 'system:admin', '*']}
      fallback={
        <div className="p-12 text-center text-xs text-slate-400">
          You lack permission to inspect business audit trails.
        </div>
      }
    >
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-emerald-600" />
              <span>System Audit Trail</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Immutable ledger of user actions, mutations, logins, and entity updates across branches
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ExportButton
              exportUrl={api.exports.auditLogs()}
              filename="audit-logs"
              label="Export Audit CSV"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex-1 min-w-[180px]">
            <Input
              value={tableFilter}
              onChange={(e) => { setTableFilter(e.target.value); setPage(1); }}
              placeholder="Filter by table (e.g., Sale, Expense, StockBalance)..."
              className="text-xs h-9 rounded-xl"
            />
          </div>

          <div className="w-44">
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200"
            >
              <option value="">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="CLOSE_SHIFT">CLOSE_SHIFT</option>
            </select>
          </div>

          {(tableFilter || actionFilter) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setTableFilter(''); setActionFilter(''); setPage(1); }}
              className="text-xs h-9 text-slate-500"
            >
              Reset Filters
            </Button>
          )}
        </div>

        {/* Audit Table */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading audit trail...</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-400">No audit records found matching criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Table / Entity</th>
                    <th className="py-3 px-4">Entity ID</th>
                    <th className="py-3 px-4 text-right">Changes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {logs.map((log: any) => {
                    const isExpanded = expandedRowId === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {log.user ? `${log.user.first_name} ${log.user.last_name}` : 'System'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px]">
                              {log.branch?.name || 'Business'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                log.action === 'CREATE'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : log.action === 'DELETE'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {log.action}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium">
                            {log.entity_table}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400 truncate max-w-[120px]">
                            {log.entity_id || '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setExpandedRowId(isExpanded ? null : log.id)}
                              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                            >
                              <span>{isExpanded ? 'Collapse' : 'Diff'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50/60 dark:bg-slate-800/30">
                            <td colSpan={7} className="p-4">
                              <div className="space-y-2">
                                <span className="text-[10px] font-bold uppercase text-slate-400">
                                  Field-Level Diff (Old vs New)
                                </span>
                                {renderReadableDiff(log.old_values, log.new_values)}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
