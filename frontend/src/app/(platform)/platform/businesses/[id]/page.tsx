'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '@/lib/api/platform-client';
import { usePlatformAuthStore, PlatformRole } from '@/lib/store/platform-auth-store';
import { formatBDT, formatDate, formatDateTime } from '@/lib/utils/formatters';
import { useToast } from '@/components/feedback/ToastContext';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  Building2,
  Users,
  Package,
  Layers,
  Receipt,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  CreditCard,
  History,
  LifeBuoy,
  FileText,
  Lock,
  ExternalLink,
} from 'lucide-react';

export default function BusinessDetailPage() {
  const params = useParams();
  const businessId = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const currentAdmin = usePlatformAuthStore((state) => state.admin);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'subscription' | 'usage' | 'invoices' | 'branches_users' | 'tickets' | 'audit'
  >('overview');

  // Dialog states
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [freeAccessConfirmOpen, setFreeAccessConfirmOpen] = useState(false);
  const [expireOverrideId, setExpireOverrideId] = useState<string | null>(null);

  // Form states for Override
  const [overrideForm, setOverrideForm] = useState({
    customMonthlyPrice: '',
    customYearlyPrice: '',
    discountPercentage: '',
    isFreeAccess: false,
    overrideMaxBranches: '',
    overrideMaxUsers: '',
    overrideMaxProducts: '',
    overrideMaxVariants: '',
    trialExtendedDays: '',
    validUntil: '',
    reason: '',
  });

  // Query: Business Details
  const { data, isLoading, error } = useQuery({
    queryKey: ['platform-business-detail', businessId],
    queryFn: () => platformApi.businesses.getDetail(businessId),
    enabled: Boolean(businessId),
  });

  // Query: Invoices for this business
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['platform-business-invoices', businessId],
    queryFn: () => platformApi.invoices.list({ businessId, limit: 50 }),
    enabled: Boolean(businessId) && activeTab === 'invoices',
  });

  // Query: Tickets for this business
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['platform-business-tickets', businessId],
    queryFn: () => platformApi.support.list({ businessId, limit: 50 }),
    enabled: Boolean(businessId) && activeTab === 'tickets',
  });

  // Query: Audit logs for this business
  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['platform-business-audit', businessId],
    queryFn: () => platformApi.auditLogs.list({ businessId, limit: 50 }),
    enabled: Boolean(businessId) && activeTab === 'audit',
  });

  // Mutation: Suspend Business
  const suspendMutation = useMutation({
    mutationFn: (reason: string) => platformApi.businesses.suspend(businessId, reason),
    onSuccess: () => {
      showToast('Business has been suspended successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['platform-business-detail', businessId] });
      setSuspendDialogOpen(false);
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to suspend business.', 'error');
    },
  });

  // Mutation: Reactivate Business
  const reactivateMutation = useMutation({
    mutationFn: (reason: string) => platformApi.businesses.reactivate(businessId, reason),
    onSuccess: () => {
      showToast('Business reactivated successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['platform-business-detail', businessId] });
      setReactivateDialogOpen(false);
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to reactivate business.', 'error');
    },
  });

  // Mutation: Create Override
  const createOverrideMutation = useMutation({
    mutationFn: (payload: any) => platformApi.overrides.create(payload),
    onSuccess: () => {
      showToast('Subscription override applied successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['platform-business-detail', businessId] });
      setOverrideModalOpen(false);
      setOverrideForm({
        customMonthlyPrice: '',
        customYearlyPrice: '',
        discountPercentage: '',
        isFreeAccess: false,
        overrideMaxBranches: '',
        overrideMaxUsers: '',
        overrideMaxProducts: '',
        overrideMaxVariants: '',
        trialExtendedDays: '',
        validUntil: '',
        reason: '',
      });
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to apply override.', 'error');
    },
  });

  // Mutation: Expire Override
  const expireOverrideMutation = useMutation({
    mutationFn: (id: string) => platformApi.overrides.expire(id),
    onSuccess: () => {
      showToast('Override has been expired.', 'success');
      queryClient.invalidateQueries({ queryKey: ['platform-business-detail', businessId] });
      setExpireOverrideId(null);
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to expire override.', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
        <div className="h-40 bg-slate-900 border border-slate-800 rounded-lg animate-pulse" />
        <div className="h-96 bg-slate-900 border border-slate-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !data?.business) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-100">Business Not Found</h2>
        <p className="text-slate-400 text-sm mt-1">
          The requested tenant shop does not exist or has been removed.
        </p>
        <Button
          onClick={() => router.push('/platform/businesses')}
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Businesses
        </Button>
      </div>
    );
  }

  const { business, usage } = data;
  const subscription = business.subscription;
  const plan = subscription?.plan;
  const overrides = business.subscription_overrides || [];
  const activeOverride = overrides.find(
    (o: any) => !o.valid_until || new Date(o.valid_until) > new Date()
  );

  // Role permissions
  const canManageStatus =
    currentAdmin?.role === PlatformRole.SUPER_ADMIN ||
    currentAdmin?.role === PlatformRole.PLATFORM_SUPPORT;
  const canManageOverrides =
    currentAdmin?.role === PlatformRole.SUPER_ADMIN ||
    currentAdmin?.role === PlatformRole.BILLING_ADMIN;

  const handleCreateOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideForm.reason.trim()) {
      showToast('A mandatory reason is required to create an override.', 'error');
      return;
    }

    if (overrideForm.isFreeAccess && !freeAccessConfirmOpen) {
      setFreeAccessConfirmOpen(true);
      return;
    }

    const payload: any = {
      businessId,
      reason: overrideForm.reason.trim(),
      isFreeAccess: overrideForm.isFreeAccess,
    };

    if (overrideForm.customMonthlyPrice !== '') payload.customMonthlyPrice = Number(overrideForm.customMonthlyPrice);
    if (overrideForm.customYearlyPrice !== '') payload.customYearlyPrice = Number(overrideForm.customYearlyPrice);
    if (overrideForm.discountPercentage !== '') payload.discountPercentage = Number(overrideForm.discountPercentage);
    if (overrideForm.overrideMaxBranches !== '') payload.overrideMaxBranches = Number(overrideForm.overrideMaxBranches);
    if (overrideForm.overrideMaxUsers !== '') payload.overrideMaxUsers = Number(overrideForm.overrideMaxUsers);
    if (overrideForm.overrideMaxProducts !== '') payload.overrideMaxProducts = Number(overrideForm.overrideMaxProducts);
    if (overrideForm.overrideMaxVariants !== '') payload.overrideMaxVariants = Number(overrideForm.overrideMaxVariants);
    if (overrideForm.trialExtendedDays !== '') payload.trialExtendedDays = Number(overrideForm.trialExtendedDays);
    if (overrideForm.validUntil !== '') payload.validUntil = new Date(overrideForm.validUntil).toISOString();

    createOverrideMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      {/* Back button & Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/platform/businesses')}
            className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-100">{business.name}</h1>
              <Badge
                variant={business.status === 'ACTIVE' ? 'default' : 'destructive'}
                className={
                  business.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }
              >
                {business.status}
              </Badge>
              {activeOverride && (
                <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Custom Override Active
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Slug: <span className="text-slate-200 font-mono">{business.slug}</span> • ID:{' '}
              <span className="text-slate-200 font-mono">{business.id}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {canManageOverrides && (
            <Button
              onClick={() => setOverrideModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              size="sm"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              Manage Override
            </Button>
          )}

          {canManageStatus && (
            <>
              {business.status === 'ACTIVE' ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setSuspendDialogOpen(true)}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <AlertTriangle className="w-4 h-4 mr-1.5" />
                  Suspend Business
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setReactivateDialogOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Reactivate Business
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Security notice banner */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            <strong className="text-slate-200">Strict Multi-Tenant Isolation:</strong> Platform administrators
            maintain tenant subscriptions and account limits. Private sales, orders, and customer databases are
            cryptographically locked to the tenant.
          </span>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 overflow-x-auto gap-2">
        {[
          { key: 'overview', label: 'Overview', icon: Building2 },
          { key: 'subscription', label: 'Subscription & Overrides', icon: CreditCard },
          { key: 'usage', label: 'Usage vs Limits', icon: Layers },
          { key: 'invoices', label: 'Invoices & Payments', icon: Receipt },
          { key: 'branches_users', label: 'Branches & Users', icon: Users },
          { key: 'tickets', label: 'Support Tickets', icon: LifeBuoy },
          { key: 'audit', label: 'Audit Trail', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-base text-slate-200">Business Profile</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Business Name</span>
                <span className="font-medium text-slate-100">{business.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Slug</span>
                <span className="font-mono text-slate-300">{business.slug}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Phone</span>
                <span className="text-slate-200">{business.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Email</span>
                <span className="text-slate-200">{business.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Currency</span>
                <span className="font-medium text-indigo-400">{business.currency || 'BDT'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Created At</span>
                <span className="text-slate-300">{formatDate(business.created_at)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Status</span>
                <Badge
                  variant={business.is_active ? 'default' : 'destructive'}
                  className={
                    business.is_active
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }
                >
                  {business.is_active ? 'Active' : 'Suspended'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-base text-slate-200">Owner & Subscription Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-sm">
              {business.users?.find((u: any) => u.is_owner) ? (
                (() => {
                  const owner = business.users.find((u: any) => u.is_owner);
                  return (
                    <>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Owner Name</span>
                        <span className="font-medium text-slate-100">
                          {owner.first_name} {owner.last_name}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Owner Email</span>
                        <span className="text-slate-200">{owner.email}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Owner Phone</span>
                        <span className="text-slate-200">{owner.phone || 'N/A'}</span>
                      </div>
                    </>
                  );
                })()
              ) : (
                <p className="text-amber-400 text-xs">No owner user assigned.</p>
              )}

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Current Plan</span>
                <span className="font-semibold text-indigo-400">{plan?.name || 'No Plan'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Subscription Status</span>
                <Badge className="bg-slate-800 text-slate-200 border-slate-700">
                  {subscription?.status || 'N/A'}
                </Badge>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Billing Cycle</span>
                <span className="text-slate-200">{subscription?.billing_cycle || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: SUBSCRIPTION & OVERRIDES */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plan Baseline Card */}
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="border-b border-slate-800 pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base text-slate-200">Base Plan: {plan?.name}</CardTitle>
                  <Badge variant="outline" className="border-indigo-500/40 text-indigo-400">
                    {plan?.code}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Monthly Standard Price</span>
                  <span className="font-semibold text-slate-200">{formatBDT(plan?.monthly_price)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Yearly Standard Price</span>
                  <span className="font-semibold text-slate-200">{formatBDT(plan?.yearly_price)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Default Trial Period</span>
                  <span className="text-slate-300">{plan?.trial_days ?? 30} Days</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Current Period</span>
                  <span className="text-slate-300">
                    {formatDate(subscription?.current_period_start)} -{' '}
                    {formatDate(subscription?.current_period_end)}
                  </span>
                </div>
                {subscription?.trial_ends_at && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Trial Ends At</span>
                    <span className="text-amber-400">{formatDate(subscription.trial_ends_at)}</span>
                  </div>
                )}
                {subscription?.grace_ends_at && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Grace Ends At</span>
                    <span className="text-rose-400">{formatDate(subscription.grace_ends_at)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Effective Overrides Card */}
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="border-b border-slate-800 pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base text-slate-200">Active Custom Overrides</CardTitle>
                  {activeOverride ? (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-500 border-slate-700">
                      Standard Plan
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm">
                {activeOverride ? (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Free Access Granted?</span>
                      <span className="font-semibold text-emerald-400">
                        {activeOverride.is_free_access ? 'YES (100% Waived)' : 'No'}
                      </span>
                    </div>
                    {activeOverride.custom_monthly_price !== null && (
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Custom Monthly Price</span>
                        <span className="font-semibold text-emerald-400">
                          {formatBDT(activeOverride.custom_monthly_price)}
                        </span>
                      </div>
                    )}
                    {activeOverride.discount_percentage !== null && (
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Discount Applied</span>
                        <span className="font-semibold text-amber-400">
                          {activeOverride.discount_percentage}% OFF
                        </span>
                      </div>
                    )}
                    {activeOverride.override_max_branches && (
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Custom Max Branches</span>
                        <span className="font-semibold text-indigo-400">
                          {activeOverride.override_max_branches}
                        </span>
                      </div>
                    )}
                    {activeOverride.override_max_users && (
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Custom Max Users</span>
                        <span className="font-semibold text-indigo-400">
                          {activeOverride.override_max_users}
                        </span>
                      </div>
                    )}
                    {activeOverride.override_max_products && (
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Custom Max Products</span>
                        <span className="font-semibold text-indigo-400">
                          {activeOverride.override_max_products}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Override Reason</span>
                      <span className="text-slate-300 italic">"{activeOverride.reason}"</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Valid Until</span>
                      <span className="text-slate-300">
                        {activeOverride.valid_until ? formatDate(activeOverride.valid_until) : 'Indefinite'}
                      </span>
                    </div>

                    {canManageOverrides && (
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpireOverrideId(activeOverride.id)}
                          className="w-full border-rose-800/60 text-rose-400 hover:bg-rose-950/30"
                        >
                          Expire Override Now
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-6 text-center text-slate-500">
                    <p>No active overrides for this business.</p>
                    <p className="text-xs mt-1">Tenant operates strictly under default plan rules.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Overrides History */}
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-base text-slate-200">Subscription Overrides History</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Discount / Custom Price</th>
                      <th className="py-3 px-4">Limits Overridden</th>
                      <th className="py-3 px-4">Valid Until</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {overrides.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500">
                          No overrides recorded.
                        </td>
                      </tr>
                    ) : (
                      overrides.map((ov: any) => {
                        const isExpired = ov.valid_until && new Date(ov.valid_until) <= new Date();
                        return (
                          <tr key={ov.id} className="hover:bg-slate-800/30">
                            <td className="py-3 px-4 text-xs font-mono">{formatDateTime(ov.created_at)}</td>
                            <td className="py-3 px-4 font-medium">{ov.reason}</td>
                            <td className="py-3 px-4 text-xs">
                              {ov.is_free_access && (
                                <Badge className="bg-emerald-500/10 text-emerald-400 mr-1">Free</Badge>
                              )}
                              {ov.discount_percentage && `${ov.discount_percentage}% off `}
                              {ov.custom_monthly_price && formatBDT(ov.custom_monthly_price)}
                              {!ov.is_free_access && !ov.discount_percentage && !ov.custom_monthly_price && '—'}
                            </td>
                            <td className="py-3 px-4 text-xs">
                              {ov.override_max_branches ? `Branches: ${ov.override_max_branches} ` : ''}
                              {ov.override_max_users ? `Users: ${ov.override_max_users} ` : ''}
                              {ov.override_max_products ? `Products: ${ov.override_max_products}` : ''}
                              {!ov.override_max_branches &&
                                !ov.override_max_users &&
                                !ov.override_max_products &&
                                '—'}
                            </td>
                            <td className="py-3 px-4 text-xs">
                              {ov.valid_until ? formatDate(ov.valid_until) : 'Indefinite'}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={isExpired ? 'outline' : 'default'}
                                className={
                                  isExpired
                                    ? 'text-slate-500 border-slate-700'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                }
                              >
                                {isExpired ? 'Expired' : 'Active'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: USAGE VS LIMITS */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Branches Card */}
            {(() => {
              const current = business.branches?.length || 0;
              const max = activeOverride?.override_max_branches || plan?.limits?.max_branches || 1;
              const pct = Math.min(Math.round((current / max) * 100), 100);
              const color =
                pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-indigo-500';
              return (
                <Card className="bg-slate-900 border-slate-800 text-slate-100 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400 font-medium">Branches</span>
                    <Building2 className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-bold">
                    {current}{' '}
                    <span className="text-sm font-normal text-slate-400">/ {max}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">{pct}% quota consumed</p>
                </Card>
              );
            })()}

            {/* Users Card */}
            {(() => {
              const current = business.users?.length || 0;
              const max = activeOverride?.override_max_users || plan?.limits?.max_users || 3;
              const pct = Math.min(Math.round((current / max) * 100), 100);
              const color =
                pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-indigo-500';
              return (
                <Card className="bg-slate-900 border-slate-800 text-slate-100 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400 font-medium">Active Users</span>
                    <Users className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-bold">
                    {current}{' '}
                    <span className="text-sm font-normal text-slate-400">/ {max}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">{pct}% quota consumed</p>
                </Card>
              );
            })()}

            {/* Products Card */}
            {(() => {
              const current = usage?.products || 0;
              const max = activeOverride?.override_max_products || plan?.limits?.max_products || 500;
              const pct = Math.min(Math.round((current / max) * 100), 100);
              const color =
                pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-indigo-500';
              return (
                <Card className="bg-slate-900 border-slate-800 text-slate-100 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400 font-medium">Catalog Products</span>
                    <Package className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-bold">
                    {current}{' '}
                    <span className="text-sm font-normal text-slate-400">/ {max}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">{pct}% quota consumed</p>
                </Card>
              );
            })()}

            {/* Variants Card */}
            {(() => {
              const current = usage?.variants || 0;
              const max = activeOverride?.override_max_variants || plan?.limits?.max_variants || 2000;
              const pct = Math.min(Math.round((current / max) * 100), 100);
              const color =
                pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-indigo-500';
              return (
                <Card className="bg-slate-900 border-slate-800 text-slate-100 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400 font-medium">SKU Variants</span>
                    <Layers className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-bold">
                    {current}{' '}
                    <span className="text-sm font-normal text-slate-400">/ {max}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">{pct}% quota consumed</p>
                </Card>
              );
            })()}
          </div>

          {/* Feature Toggles */}
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-base text-slate-200">Plan Feature Inclusions</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/80 flex items-center justify-between">
                <span>REST API Access</span>
                {plan?.limits?.has_api_access ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400">Enabled</Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500 border-slate-700">
                    Not Included
                  </Badge>
                )}
              </div>
              <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/80 flex items-center justify-between">
                <span>Custom Executive Reports</span>
                {plan?.limits?.has_custom_reports ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400">Enabled</Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500 border-slate-700">
                    Not Included
                  </Badge>
                )}
              </div>
              <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/80 flex items-center justify-between">
                <span>Multi-Register Offline Sync</span>
                {plan?.limits?.has_offline_sync ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400">Enabled</Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500 border-slate-700">
                    Not Included
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: INVOICES & PAYMENTS */}
      {activeTab === 'invoices' && (
        <Card className="bg-slate-900 border-slate-800 text-slate-100">
          <CardHeader className="border-b border-slate-800 pb-3">
            <CardTitle className="text-base text-slate-200">Subscription Invoices</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Invoice No</th>
                    <th className="py-3 px-4">Billing Period</th>
                    <th className="py-3 px-4">Net Amount</th>
                    <th className="py-3 px-4">Paid Amount</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {invoicesLoading ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        Loading invoices...
                      </td>
                    </tr>
                  ) : !invoicesData?.data || invoicesData.data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        No invoices generated for this business yet.
                      </td>
                    </tr>
                  ) : (
                    invoicesData.data.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono font-medium text-slate-100">
                          {inv.invoice_number}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {formatDate(inv.period_start)} - {formatDate(inv.period_end)}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-100">
                          {formatBDT(inv.net_amount)}
                        </td>
                        <td className="py-3 px-4 text-emerald-400 font-medium">
                          {formatBDT(inv.paid_amount || 0)}
                        </td>
                        <td className="py-3 px-4 text-xs">{formatDate(inv.due_date)}</td>
                        <td className="py-3 px-4">
                          <Badge
                            className={
                              inv.status === 'PAID'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : inv.status === 'OVERDUE'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }
                          >
                            {inv.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 5: BRANCHES & USERS COUNTS */}
      {activeTab === 'branches_users' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Branches list */}
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-base text-slate-200">
                Branches ({business.branches?.length || 0})
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Registered physical or online branches
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              <div className="divide-y divide-slate-800/60">
                {business.branches?.map((b: any) => (
                  <div key={b.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-200">{b.name}</p>
                      <p className="text-xs font-mono text-slate-500">{b.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {b.is_main && (
                        <Badge variant="outline" className="text-indigo-400 border-indigo-500/40 text-[10px]">
                          Main HQ
                        </Badge>
                      )}
                      <Badge
                        variant={b.is_active ? 'default' : 'destructive'}
                        className={b.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}
                      >
                        {b.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Users list */}
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-base text-slate-200">
                Users ({business.users?.length || 0})
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Shop staff accounts (passwords/tokens never shown)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              <div className="divide-y divide-slate-800/60">
                {business.users?.map((u: any) => (
                  <div key={u.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-200">
                        {u.first_name} {u.last_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {u.email} • {u.phone || 'No phone'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.is_owner && (
                        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px]">
                          Owner
                        </Badge>
                      )}
                      <Badge
                        variant={u.is_active ? 'default' : 'destructive'}
                        className={u.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}
                      >
                        {u.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 6: SUPPORT TICKETS */}
      {activeTab === 'tickets' && (
        <Card className="bg-slate-900 border-slate-800 text-slate-100">
          <CardHeader className="border-b border-slate-800 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-slate-200">Support Desk Tickets</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Communications filed by this tenant
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/platform/support?businessId=${businessId}`)}
              className="border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Open in Support Desk
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Ticket #</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assigned Admin</th>
                    <th className="py-3 px-4">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {ticketsLoading ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        Loading tickets...
                      </td>
                    </tr>
                  ) : !ticketsData?.data || ticketsData.data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        No support tickets opened by this business.
                      </td>
                    </tr>
                  ) : (
                    ticketsData.data.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono font-medium text-slate-100">
                          {t.ticket_no}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-200">{t.subject}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs">
                            {t.priority}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={
                              t.status === 'RESOLVED' || t.status === 'CLOSED'
                                ? 'bg-slate-800 text-slate-300'
                                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                            }
                          >
                            {t.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">
                          {t.assigned_admin
                            ? `${t.assigned_admin.first_name} ${t.assigned_admin.last_name}`
                            : 'Unassigned'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">{formatDate(t.updated_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 7: AUDIT */}
      {activeTab === 'audit' && (
        <Card className="bg-slate-900 border-slate-800 text-slate-100">
          <CardHeader className="border-b border-slate-800 pb-3">
            <CardTitle className="text-base text-slate-200">Platform Audit Trail</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Platform administration and subscription lifecycle events for this tenant
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">Admin / Operator</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {auditLoading ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        Loading audit logs...
                      </td>
                    </tr>
                  ) : !auditData?.data || auditData.data.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No audit events recorded for this business.
                      </td>
                    </tr>
                  ) : (
                    auditData.data.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-xs font-mono text-slate-400">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs border-slate-700">
                            {log.action}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-indigo-400">
                          {log.entity_table}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-300">
                          {log.user ? `${log.user.first_name} (${log.user.email})` : 'System / Admin'}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <pre className="bg-slate-950 p-2 rounded text-[11px] text-slate-400 max-h-24 overflow-y-auto">
                            {JSON.stringify(log.new_values, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SUSPEND DIALOG */}
      <ConfirmDialog
        isOpen={suspendDialogOpen}
        onClose={() => setSuspendDialogOpen(false)}
        onConfirm={(reason) => suspendMutation.mutate(reason || '')}
        title="Suspend Business Shop"
        description="Suspending this business will immediately revoke login access for all shop staff and lock POS operations. The tenant will only be able to view their Billing and Support tickets."
        confirmText="Confirm Suspension"
        variant="destructive"
        requireReason={true}
        reasonLabel="Mandatory Suspension Reason"
        reasonPlaceholder="e.g. Terms of Service violation, non-payment, fraud review"
        isLoading={suspendMutation.isPending}
      />

      {/* REACTIVATE DIALOG */}
      <ConfirmDialog
        isOpen={reactivateDialogOpen}
        onClose={() => setReactivateDialogOpen(false)}
        onConfirm={(reason) => reactivateMutation.mutate(reason || '')}
        title="Reactivate Business Shop"
        description="Reactivating this business will restore full access to POS registers, product inventory, and sales features for all staff users."
        confirmText="Reactivate"
        variant="default"
        requireReason={true}
        reasonLabel="Mandatory Reactivation Reason"
        reasonPlaceholder="e.g. Account cleared, verification complete, payment received"
        isLoading={reactivateMutation.isPending}
      />

      {/* EXPIRE OVERRIDE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(expireOverrideId)}
        onClose={() => setExpireOverrideId(null)}
        onConfirm={() => {
          if (expireOverrideId) expireOverrideMutation.mutate(expireOverrideId);
        }}
        title="Expire Subscription Override"
        description="Are you sure you want to expire this override immediately? The tenant will immediately fall back to standard plan pricing and limits."
        confirmText="Expire Override"
        variant="warning"
        isLoading={expireOverrideMutation.isPending}
      />

      {/* FREE ACCESS WARNING CONFIRMATION */}
      <ConfirmDialog
        isOpen={freeAccessConfirmOpen}
        onClose={() => setFreeAccessConfirmOpen(false)}
        onConfirm={() => {
          setFreeAccessConfirmOpen(false);
          // Trigger the submission with isFreeAccess confirmed
          const payload: any = {
            businessId,
            reason: overrideForm.reason.trim(),
            isFreeAccess: true,
          };
          if (overrideForm.customMonthlyPrice !== '') payload.customMonthlyPrice = Number(overrideForm.customMonthlyPrice);
          if (overrideForm.customYearlyPrice !== '') payload.customYearlyPrice = Number(overrideForm.customYearlyPrice);
          if (overrideForm.discountPercentage !== '') payload.discountPercentage = Number(overrideForm.discountPercentage);
          if (overrideForm.overrideMaxBranches !== '') payload.overrideMaxBranches = Number(overrideForm.overrideMaxBranches);
          if (overrideForm.overrideMaxUsers !== '') payload.overrideMaxUsers = Number(overrideForm.overrideMaxUsers);
          if (overrideForm.overrideMaxProducts !== '') payload.overrideMaxProducts = Number(overrideForm.overrideMaxProducts);
          if (overrideForm.overrideMaxVariants !== '') payload.overrideMaxVariants = Number(overrideForm.overrideMaxVariants);
          if (overrideForm.trialExtendedDays !== '') payload.trialExtendedDays = Number(overrideForm.trialExtendedDays);
          if (overrideForm.validUntil !== '') payload.validUntil = new Date(overrideForm.validUntil).toISOString();
          createOverrideMutation.mutate(payload);
        }}
        title="Confirm 100% Free Access Grant"
        description="Granting Free Access will completely waive subscription billing for this shop. All generated invoices will be zero-rated. This requires executive authority."
        confirmText="Yes, Grant Free Access"
        variant="destructive"
      />

      {/* CREATE OVERRIDE MODAL */}
      <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
        <DialogContent className="max-w-xl bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-400">
              <Sparkles className="w-5 h-5" />
              Create Subscription Override
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Apply customized prices, discount rates, or quota increases for {business.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateOverrideSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300">Custom Monthly (BDT)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 1500"
                  value={overrideForm.customMonthlyPrice}
                  onChange={(e) =>
                    setOverrideForm({ ...overrideForm, customMonthlyPrice: e.target.value })
                  }
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">Custom Yearly (BDT)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 15000"
                  value={overrideForm.customYearlyPrice}
                  onChange={(e) =>
                    setOverrideForm({ ...overrideForm, customYearlyPrice: e.target.value })
                  }
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300">Discount (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 20"
                  value={overrideForm.discountPercentage}
                  onChange={(e) =>
                    setOverrideForm({ ...overrideForm, discountPercentage: e.target.value })
                  }
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="isFreeAccess"
                  checked={overrideForm.isFreeAccess}
                  onChange={(e) =>
                    setOverrideForm({ ...overrideForm, isFreeAccess: e.target.checked })
                  }
                  className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-slate-950"
                />
                <label htmlFor="isFreeAccess" className="text-xs font-medium text-amber-400">
                  Grant 100% Free Access
                </label>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3">
              <p className="text-xs font-semibold text-slate-400 mb-2">Override Quota Limits</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400">Max Branches</label>
                  <Input
                    type="number"
                    placeholder="e.g. 5"
                    value={overrideForm.overrideMaxBranches}
                    onChange={(e) =>
                      setOverrideForm({ ...overrideForm, overrideMaxBranches: e.target.value })
                    }
                    className="bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Max Users</label>
                  <Input
                    type="number"
                    placeholder="e.g. 10"
                    value={overrideForm.overrideMaxUsers}
                    onChange={(e) =>
                      setOverrideForm({ ...overrideForm, overrideMaxUsers: e.target.value })
                    }
                    className="bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Max Products</label>
                  <Input
                    type="number"
                    placeholder="e.g. 5000"
                    value={overrideForm.overrideMaxProducts}
                    onChange={(e) =>
                      setOverrideForm({ ...overrideForm, overrideMaxProducts: e.target.value })
                    }
                    className="bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Max Variants</label>
                  <Input
                    type="number"
                    placeholder="e.g. 15000"
                    value={overrideForm.overrideMaxVariants}
                    onChange={(e) =>
                      setOverrideForm({ ...overrideForm, overrideMaxVariants: e.target.value })
                    }
                    className="bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-3">
              <div>
                <label className="text-xs font-medium text-slate-300">Extend Trial (Days)</label>
                <Input
                  type="number"
                  placeholder="e.g. 14"
                  value={overrideForm.trialExtendedDays}
                  onChange={(e) =>
                    setOverrideForm({ ...overrideForm, trialExtendedDays: e.target.value })
                  }
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">Valid Until Date</label>
                <Input
                  type="date"
                  value={overrideForm.validUntil}
                  onChange={(e) =>
                    setOverrideForm({ ...overrideForm, validUntil: e.target.value })
                  }
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3">
              <label className="text-xs font-medium text-slate-300">
                Reason for Override <span className="text-rose-400">*</span>
              </label>
              <Textarea
                required
                rows={2}
                placeholder="Required explanation for the audit log..."
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                className="bg-slate-950 border-slate-800 text-slate-100 mt-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOverrideModalOpen(false)}
                className="border-slate-800 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createOverrideMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {createOverrideMutation.isPending ? 'Applying...' : 'Save & Apply Override'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
