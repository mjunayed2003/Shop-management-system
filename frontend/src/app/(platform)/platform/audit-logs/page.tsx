'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApi } from '@/lib/api/platform-client';
import { formatDate, formatDateTime } from '@/lib/utils/formatters';
import { useToast } from '@/components/feedback/ToastContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ShieldAlert,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
  Building2,
  User,
  History,
} from 'lucide-react';

export default function PlatformAuditLogsPage() {
  const { showToast } = useToast();

  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [businessIdSearch, setBusinessIdSearch] = useState('');
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});

  // Query: Audit Logs
  const { data: logsData, isLoading } = useQuery({
    queryKey: ['platform-audit-logs', page, actionFilter, entityFilter, businessIdSearch],
    queryFn: () =>
      platformApi.auditLogs.list({
        page,
        limit: 50,
        action: actionFilter === 'ALL' ? undefined : actionFilter,
        entityTable: entityFilter === 'ALL' ? undefined : entityFilter,
        businessId: businessIdSearch.trim() || undefined,
      }),
  });

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // CSV Export with formula injection prevention
  const handleExportCsv = () => {
    if (!logsData?.data || logsData.data.length === 0) {
      showToast('No audit entries to export.', 'info');
      return;
    }

    const headers = ['Timestamp', 'Action', 'Entity Table', 'Entity ID', 'Business', 'Actor', 'New Values'];
    const rows = logsData.data.map((log: any) => {
      const sanitize = (val: any) => {
        const str = String(val ?? '');
        return /^[=+\-@]/.test(str) ? `'${str}` : `"${str.replace(/"/g, '""')}"`;
      };
      return [
        sanitize(formatDateTime(log.created_at)),
        sanitize(log.action),
        sanitize(log.entity_table),
        sanitize(log.entity_id),
        sanitize(log.business?.name || log.business_id || 'Global'),
        sanitize(log.user ? `${log.user.first_name} (${log.user.email})` : 'Platform Admin / System'),
        sanitize(JSON.stringify(log.new_values || {})),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `platform_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Platform audit logs exported.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
            Platform Audit Trail & Security Logs
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Immutable timeline of administrative overrides, suspensions, plan adjustments, and operational events.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
        >
          <Download className="w-4 h-4 mr-1.5" />
          Export Audit CSV
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Action selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">Action:</span>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            {/* Entity selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">Entity:</span>
              <select
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Tables</option>
                <option value="businesses">businesses</option>
                <option value="subscription_overrides">subscription_overrides</option>
                <option value="plans">plans</option>
                <option value="subscription_invoices">subscription_invoices</option>
                <option value="platform_payments">platform_payments</option>
                <option value="system_settings">system_settings</option>
              </select>
            </div>
          </div>

          <div className="w-full md:w-64">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <Input
                placeholder="Filter by Business UUID..."
                value={businessIdSearch}
                onChange={(e) => {
                  setBusinessIdSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 bg-slate-950 border-slate-800 text-xs text-slate-100 placeholder:text-slate-600"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity Table</th>
                  <th className="py-3 px-4">Affected Shop</th>
                  <th className="py-3 px-4">Operator / User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Loading audit events...
                    </td>
                  </tr>
                ) : !logsData?.data || logsData.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No audit events found matching current criteria.
                    </td>
                  </tr>
                ) : (
                  logsData.data.map((log: any) => {
                    const isExpanded = Boolean(expandedLogIds[log.id]);
                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          onClick={() => toggleExpand(log.id)}
                          className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4 text-slate-500">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-indigo-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-400">
                            {formatDateTime(log.created_at)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={
                                log.action === 'CREATE'
                                  ? 'border-emerald-500/40 text-emerald-400'
                                  : log.action === 'DELETE'
                                  ? 'border-rose-500/40 text-rose-400'
                                  : 'border-indigo-500/40 text-indigo-400'
                              }
                            >
                              {log.action}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-200">
                            {log.entity_table}
                            <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">
                              {log.entity_id}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            {log.business ? (
                              <div>
                                <p className="font-medium text-slate-200">{log.business.name}</p>
                                <p className="font-mono text-[11px] text-slate-500">
                                  {log.business.slug}
                                </p>
                              </div>
                            ) : log.business_id ? (
                              <span className="font-mono text-slate-400">{log.business_id}</span>
                            ) : (
                              <span className="text-slate-500 italic">Platform Global</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-300">
                            {log.user ? (
                              <div>
                                <p className="font-medium text-slate-200">
                                  {log.user.first_name} {log.user.last_name || ''}
                                </p>
                                <p className="text-[11px] text-slate-500">{log.user.email}</p>
                              </div>
                            ) : (
                              <span className="text-slate-400 flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-indigo-400" />
                                Platform Admin / System
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Collapsible Diff Row */}
                        {isExpanded && (
                          <tr className="bg-slate-950/70 border-b border-slate-800">
                            <td colSpan={6} className="p-4 pl-12">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                                    Previous State (Old Values)
                                  </span>
                                  <pre className="p-3 bg-slate-950 rounded border border-slate-800 text-slate-400 overflow-x-auto max-h-48 text-[11px]">
                                    {log.old_values
                                      ? JSON.stringify(log.old_values, null, 2)
                                      : 'No previous state recorded.'}
                                  </pre>
                                </div>
                                <div>
                                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                                    Applied State (New Values)
                                  </span>
                                  <pre className="p-3 bg-slate-950 rounded border border-slate-800 text-slate-200 overflow-x-auto max-h-48 text-[11px]">
                                    {log.new_values
                                      ? JSON.stringify(log.new_values, null, 2)
                                      : 'No change payload.'}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {logsData?.pagination && logsData.pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>
                Page {logsData.pagination.page} of {logsData.pagination.totalPages} (Total{' '}
                {logsData.pagination.total} records)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="border-slate-800 text-slate-300 text-xs"
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= logsData.pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="border-slate-800 text-slate-300 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
