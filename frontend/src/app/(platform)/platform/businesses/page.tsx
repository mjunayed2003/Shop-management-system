'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '@/lib/api/platform-client';
import { usePlatformAuthStore } from '@/lib/store/platform-auth-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/components/feedback/ToastContext';
import { sanitizeCsvCell } from '@/lib/utils/sms-segments';
import {
  Building2,
  Search,
  Download,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

export default function PlatformBusinessesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { admin } = usePlatformAuthStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Suspend/Reactivate dialog state
  const [actionTarget, setActionTarget] = useState<{ id: string; name: string; type: 'SUSPEND' | 'REACTIVATE' } | null>(
    null,
  );
  const [actionReason, setActionReason] = useState('');

  // 1. Fetch businesses
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['platform', 'businesses', page, search, statusFilter, subStatusFilter],
    queryFn: () =>
      platformApi.businesses.list({
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        subscriptionStatus: subStatusFilter || undefined,
      }),
  });

  // Suspend Mutation
  const suspendMutation = useMutation({
    mutationFn: () => platformApi.businesses.suspend(actionTarget!.id, actionReason),
    onSuccess: () => {
      toast.show('Business suspended successfully.', 'success');
      setActionTarget(null);
      setActionReason('');
      queryClient.invalidateQueries({ queryKey: ['platform', 'businesses'] });
      refetch();
    },
    onError: (err: any) => {
      toast.show(err.message || 'Suspension failed.', 'error');
    },
  });

  // Reactivate Mutation
  const reactivateMutation = useMutation({
    mutationFn: () => platformApi.businesses.reactivate(actionTarget!.id, actionReason),
    onSuccess: () => {
      toast.show('Business reactivated successfully.', 'success');
      setActionTarget(null);
      setActionReason('');
      queryClient.invalidateQueries({ queryKey: ['platform', 'businesses'] });
      refetch();
    },
    onError: (err: any) => {
      toast.show(err.message || 'Reactivation failed.', 'error');
    },
  });

  // CSV Export
  const handleExportCsv = () => {
    if (!data?.data || data.data.length === 0) return;

    const headers = ['Business Name', 'Slug', 'Email', 'Phone', 'Status', 'Subscription', 'Created At'];
    const rows = data.data.map((b: any) => [
      sanitizeCsvCell(b.name),
      sanitizeCsvCell(b.slug),
      sanitizeCsvCell(b.email),
      sanitizeCsvCell(b.phone),
      sanitizeCsvCell(b.status),
      sanitizeCsvCell(b.subscription?.status || 'NONE'),
      sanitizeCsvCell(new Date(b.created_at).toLocaleDateString()),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `businesses-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isSupportOrSuper = admin?.role === 'SUPER_ADMIN' || admin?.role === 'PLATFORM_SUPPORT';

  return (
    <div className="space-y-6 animate-fadeIn text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <Building2 className="w-8 h-8 text-indigo-400" />
            <span>Registered Businesses (Tenants)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Directory of retail shop accounts, subscription statuses, and governance controls.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          className="text-xs h-8 rounded-xl border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="rounded-2xl bg-slate-900/90 border-slate-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by shop name, slug, email..."
              className="pl-9 h-9 text-xs rounded-xl bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 rounded-xl border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200"
            >
              <option value="">All Business Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="PENDING_VERIFICATION">PENDING VERIFICATION</option>
            </select>
          </div>

          <div>
            <select
              value={subStatusFilter}
              onChange={(e) => {
                setSubStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 rounded-xl border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200"
            >
              <option value="">All Subscription Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="TRIAL">TRIAL</option>
              <option value="GRACE">GRACE</option>
              <option value="PAYMENT_DUE">PAYMENT DUE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Businesses Table */}
      <Card className="rounded-3xl bg-slate-900/90 border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase">
              <tr>
                <th className="p-3.5">Business / Shop</th>
                <th className="p-3.5">Slug</th>
                <th className="p-3.5">Contact</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Subscription</th>
                <th className="p-3.5">Created Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading businesses...
                  </td>
                </tr>
              ) : !data?.data || data.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No businesses match the search criteria.
                  </td>
                </tr>
              ) : (
                data.data.map((b: any) => {
                  const isSuspended = b.status === 'SUSPENDED';

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <Link
                          href={`/platform/businesses/${b.id}`}
                          className="font-bold text-white hover:text-indigo-400 flex items-center gap-1.5"
                        >
                          <span>{b.name}</span>
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        </Link>
                        <p className="text-[11px] text-slate-400">{b.email || 'No email'}</p>
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">{b.slug}</td>
                      <td className="p-3.5 text-slate-300 font-mono">{b.phone || 'N/A'}</td>
                      <td className="p-3.5">
                        <Badge
                          className={`text-[10px] font-bold uppercase ${
                            b.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : b.status === 'SUSPENDED'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {b.status}
                        </Badge>
                      </td>
                      <td className="p-3.5">
                        <Badge
                          className={`text-[10px] font-bold uppercase ${
                            b.subscription?.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-400'
                              : b.subscription?.status === 'TRIAL'
                              ? 'bg-blue-950 text-blue-400'
                              : 'bg-amber-950 text-amber-400'
                          }`}
                        >
                          {b.subscription?.status || 'NONE'}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-slate-400">
                        {new Date(b.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/platform/businesses/${b.id}`}>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-indigo-400 hover:text-white">
                              View
                            </Button>
                          </Link>

                          {isSupportOrSuper && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActionTarget({
                                  id: b.id,
                                  name: b.name,
                                  type: isSuspended ? 'REACTIVATE' : 'SUSPEND',
                                });
                              }}
                              className={`h-7 text-[11px] rounded-lg border-slate-700 ${
                                isSuspended
                                  ? 'text-emerald-400 hover:bg-emerald-950/60'
                                  : 'text-rose-400 hover:bg-rose-950/60'
                              }`}
                            >
                              {isSuspended ? 'Reactivate' : 'Suspend'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Strip */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 w-7 p-0 border-slate-800 bg-slate-950 text-white"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 w-7 p-0 border-slate-800 bg-slate-950 text-white"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Suspend / Reactivate Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(actionTarget)}
        onOpenChange={(open: boolean) => !open && setActionTarget(null)}
        title={
          actionTarget?.type === 'SUSPEND'
            ? `Suspend Business: ${actionTarget.name}`
            : `Reactivate Business: ${actionTarget?.name}`
        }
        description={
          actionTarget?.type === 'SUSPEND'
            ? 'Suspending this business will immediately display a full-screen lock to all its store cashiers and users. They will only have access to Billing and Support tickets.'
            : 'Reactivating this business will lift the full-screen suspension lock and allow normal POS selling and inventory operations.'
        }
        confirmText={actionTarget?.type === 'SUSPEND' ? 'Confirm Suspension' : 'Confirm Reactivation'}
        variant={actionTarget?.type === 'SUSPEND' ? 'destructive' : 'default'}
        requireReason={true}
        reasonPlaceholder="Enter mandatory administrative audit justification..."
        onConfirm={(reason?: string) => {
          setActionReason(reason || '');
          if (actionTarget?.type === 'SUSPEND') {
            suspendMutation.mutate();
          } else {
            reactivateMutation.mutate();
          }
        }}
        loading={suspendMutation.isPending || reactivateMutation.isPending}
      />
    </div>
  );
}
