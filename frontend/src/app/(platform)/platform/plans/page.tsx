'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '@/lib/api/platform-client';
import { usePlatformAuthStore, PlatformRole } from '@/lib/store/platform-auth-store';
import { formatBDT } from '@/lib/utils/formatters';
import { useToast } from '@/components/feedback/ToastContext';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  Zap,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Users,
  Package,
  Layers,
  FileSpreadsheet,
  Cpu,
  RefreshCw,
  Power,
} from 'lucide-react';

interface PlanFormData {
  id?: string;
  name: string;
  code: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  trialDays: string;
  isActive: boolean;
  limits: {
    maxBranches: string;
    maxUsers: string;
    maxProducts: string;
    maxVariants: string;
    maxMonthlyInvoices: string;
    hasApiAccess: boolean;
    hasCustomReports: boolean;
    hasOfflineSync: boolean;
  };
}

const DEFAULT_PLAN_FORM: PlanFormData = {
  name: '',
  code: '',
  description: '',
  monthlyPrice: '',
  yearlyPrice: '',
  trialDays: '30',
  isActive: true,
  limits: {
    maxBranches: '1',
    maxUsers: '3',
    maxProducts: '500',
    maxVariants: '1500',
    maxMonthlyInvoices: '1000',
    hasApiAccess: false,
    hasCustomReports: false,
    hasOfflineSync: true,
  },
};

export default function PlatformPlansPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const currentAdmin = usePlatformAuthStore((state) => state.admin);

  const canEditPlans =
    currentAdmin?.role === PlatformRole.SUPER_ADMIN ||
    currentAdmin?.role === PlatformRole.BILLING_ADMIN;
  const canDeletePlans = currentAdmin?.role === PlatformRole.SUPER_ADMIN;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(DEFAULT_PLAN_FORM);
  const [deleteConfirmPlan, setDeleteConfirmPlan] = useState<any | null>(null);

  // Query: Plans list
  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ['platform-plans'],
    queryFn: () => platformApi.plans.list(),
  });

  // Mutation: Create Plan
  const createMutation = useMutation({
    mutationFn: (payload: any) => platformApi.plans.create(payload),
    onSuccess: () => {
      showToast('Plan created successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
      setModalOpen(false);
      setFormData(DEFAULT_PLAN_FORM);
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to create plan.', 'error');
    },
  });

  // Mutation: Update Plan
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      platformApi.plans.update(id, payload),
    onSuccess: () => {
      showToast('Plan updated successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
      setModalOpen(false);
      setEditingPlan(null);
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to update plan.', 'error');
    },
  });

  // Mutation: Delete Plan
  const deleteMutation = useMutation({
    mutationFn: (id: string) => platformApi.plans.delete(id),
    onSuccess: () => {
      showToast('Plan deleted successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
      setDeleteConfirmPlan(null);
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to delete plan.', 'error');
    },
  });

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData(DEFAULT_PLAN_FORM);
    setModalOpen(true);
  };

  const handleOpenEdit = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      id: plan.id,
      name: plan.name,
      code: plan.code,
      description: plan.description || '',
      monthlyPrice: String(plan.monthly_price || ''),
      yearlyPrice: String(plan.yearly_price || ''),
      trialDays: String(plan.trial_days ?? 30),
      isActive: Boolean(plan.is_active),
      limits: {
        maxBranches: String(plan.limits?.max_branches ?? 1),
        maxUsers: String(plan.limits?.max_users ?? 3),
        maxProducts: String(plan.limits?.max_products ?? 500),
        maxVariants: String(plan.limits?.max_variants ?? 1500),
        maxMonthlyInvoices: String(plan.limits?.max_monthly_invoices ?? 1000),
        hasApiAccess: Boolean(plan.limits?.has_api_access),
        hasCustomReports: Boolean(plan.limits?.has_custom_reports),
        hasOfflineSync: Boolean(plan.limits?.has_offline_sync),
      },
    });
    setModalOpen(true);
  };

  const handleToggleActive = (plan: any) => {
    updateMutation.mutate({
      id: plan.id,
      payload: { isActive: !plan.is_active },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      showToast('Name and unique code are required.', 'error');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      description: formData.description.trim() || undefined,
      monthlyPrice: Number(formData.monthlyPrice) || 0,
      yearlyPrice: Number(formData.yearlyPrice) || 0,
      trialDays: Number(formData.trialDays) || 30,
      isActive: formData.isActive,
      limits: {
        maxBranches: Number(formData.limits.maxBranches) || 1,
        maxUsers: Number(formData.limits.maxUsers) || 1,
        maxProducts: Number(formData.limits.maxProducts) || 100,
        maxVariants: Number(formData.limits.maxVariants) || 200,
        maxMonthlyInvoices: Number(formData.limits.maxMonthlyInvoices) || 500,
        hasApiAccess: formData.limits.hasApiAccess,
        hasCustomReports: formData.limits.hasCustomReports,
        hasOfflineSync: formData.limits.hasOfflineSync,
      },
    };

    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 dark:text-slate-100 font-sans pb-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Subscription Plans &amp; Quota Limits
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Configure commercial pricing tiers, trial durations, and technical resource bounds.
            </p>
          </div>
        </div>

        {canEditPlans && (
          <Button
            onClick={handleOpenCreate}
            className="text-xs h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 cursor-pointer font-bold flex items-center gap-1.5 self-end sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Plan</span>
          </Button>
        )}
      </div>

      {/* Grid of Plans */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
          <Zap className="w-12 h-12 text-indigo-600 dark:text-indigo-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200">No Plans Configured</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Create your first subscription tier to begin onboarding tenant shops.
          </p>
          {canEditPlans && (
            <Button
              onClick={handleOpenCreate}
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create Plan
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((p: any) => {
            const limits = p.limits;
            return (
              <Card
                key={p.id}
                className={`bg-white dark:bg-slate-900 border transition-all rounded-3xl flex flex-col justify-between shadow-sm hover:shadow-md ${
                  p.is_active
                    ? 'border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700'
                    : 'border-slate-200/50 dark:border-slate-800/40 opacity-70'
                }`}
              >
                <div>
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">{p.name}</CardTitle>
                          <Badge variant="outline" className="font-mono text-xs border-indigo-200 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-transparent">
                            {p.code}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {p.description || 'No public description.'}
                        </p>
                      </div>
                      <Badge
                        variant={p.is_active ? 'default' : 'secondary'}
                        className={
                          p.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }
                      >
                        {p.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="pt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                        {formatBDT(p.monthly_price)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">/ mo</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                        {formatBDT(p.yearly_price)} / yr
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 py-1 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Max Branches
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {limits?.max_branches ?? 'Unlimited'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 py-1 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Max Users
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {limits?.max_users ?? 'Unlimited'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 py-1 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Max Products
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {limits?.max_products?.toLocaleString() ?? 'Unlimited'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 py-1 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Max Variants
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {limits?.max_variants?.toLocaleString() ?? 'Unlimited'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 py-1 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Monthly Invoices
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {limits?.max_monthly_invoices?.toLocaleString() ?? 'Unlimited'}
                      </span>
                    </div>

                    <div className="pt-2 grid grid-cols-3 gap-1 text-[11px]">
                      <div
                        className={`p-1.5 rounded-lg text-center border font-medium ${
                          limits?.has_api_access
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        API Access
                      </div>
                      <div
                        className={`p-1.5 rounded-lg text-center border font-medium ${
                          limits?.has_custom_reports
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        Reports
                      </div>
                      <div
                        className={`p-1.5 rounded-lg text-center border font-medium ${
                          limits?.has_offline_sync
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        Offline Sync
                      </div>
                    </div>

                    <div className="pt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>Free Trial Duration:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{p.trial_days ?? 30} Days</span>
                    </div>
                  </CardContent>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-950/30 rounded-b-3xl">
                  {canEditPlans && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(p)}
                      className={`text-xs ${
                        p.is_active
                          ? 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-white dark:bg-slate-900'
                          : 'border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5 mr-1" />
                      {p.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  )}

                  <div className="flex items-center gap-1">
                    {canEditPlans && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(p)}
                        className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                    )}

                    {canDeletePlans && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmPlan(p)}
                        className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs p-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* PLAN CREATE / EDIT MODAL (Foodpoint SaaS Style) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-h-[92vh] overflow-y-auto shadow-2xl rounded-3xl p-0">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create Subscription Plan'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {editingPlan
                  ? 'Modifying limits here affects all shops subscribed to this plan.'
                  : 'Define commercial limits and pricing tiers.'}
              </DialogDescription>
            </div>
          </div>

          {editingPlan && (
            <div className="mx-6 mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Warning:</strong> Changes to resource limits will automatically update quotas
                for active business subscribers on this tier.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Plan Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Starter, Retail Pro, Enterprise"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Unique Code <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  disabled={Boolean(editingPlan)}
                  placeholder="e.g. STARTER, PRO, ENTERPRISE"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 uppercase font-mono focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Description</label>
              <Textarea
                rows={2}
                placeholder="Target demographic and apparel retail feature highlights..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Monthly Price (BDT) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 1500"
                  value={formData.monthlyPrice}
                  onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                  className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Yearly Price (BDT) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 15000"
                  value={formData.yearlyPrice}
                  onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value })}
                  className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Trial Days</label>
                <Input
                  type="number"
                  placeholder="30"
                  value={formData.trialDays}
                  onChange={(e) => setFormData({ ...formData, trialDays: e.target.value })}
                  className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="flex items-center gap-2 pb-1.5 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-5 h-5 rounded bg-orange-500 text-white flex items-center justify-center shrink-0">
                  <Layers className="w-3 h-3" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Plan Resource Limits
                </h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Max Branches</label>
                  <Input
                    type="number"
                    value={formData.limits.maxBranches}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: { ...formData.limits, maxBranches: e.target.value },
                      })
                    }
                    className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Max Users</label>
                  <Input
                    type="number"
                    value={formData.limits.maxUsers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: { ...formData.limits, maxUsers: e.target.value },
                      })
                    }
                    className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Max Products</label>
                  <Input
                    type="number"
                    value={formData.limits.maxProducts}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: { ...formData.limits, maxProducts: e.target.value },
                      })
                    }
                    className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Max Variants (SKU)</label>
                  <Input
                    type="number"
                    value={formData.limits.maxVariants}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: { ...formData.limits, maxVariants: e.target.value },
                      })
                    }
                    className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Max Monthly Invoices</label>
                  <Input
                    type="number"
                    value={formData.limits.maxMonthlyInvoices}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: { ...formData.limits, maxMonthlyInvoices: e.target.value },
                      })
                    }
                    className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="flex items-center gap-2 pb-1.5 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-5 h-5 rounded bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Included Features
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${formData.limits.hasApiAccess ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-900 dark:text-orange-200 shadow-2xs' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}>
                  <input
                    type="checkbox"
                    checked={formData.limits.hasApiAccess}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: { ...formData.limits, hasApiAccess: e.target.checked },
                      })
                    }
                    className="rounded border-slate-300 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                  />
                  <span>REST API Access</span>
                </label>

                <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${formData.limits.hasCustomReports ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-900 dark:text-orange-200 shadow-2xs' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}>
                  <input
                    type="checkbox"
                    checked={formData.limits.hasCustomReports}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: { ...formData.limits, hasCustomReports: e.target.checked },
                      })
                    }
                    className="rounded border-slate-300 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Custom Reports</span>
                </label>

                <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${formData.limits.hasOfflineSync ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-500 text-orange-900 dark:text-orange-200 shadow-2xs' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}>
                  <input
                    type="checkbox"
                    checked={formData.limits.hasOfflineSync}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: { ...formData.limits, hasOfflineSync: e.target.checked },
                      })
                    }
                    className="rounded border-slate-300 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Multi-POS Offline Sync</span>
                </label>
              </div>
            </div>

            <DialogFooter className="px-6 py-3.5 -mx-6 -mb-4 mt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-end gap-2.5 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="h-9 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/25 cursor-pointer flex items-center gap-1.5"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingPlan
                  ? 'Update Plan'
                  : 'Create Plan'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE PLAN CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmPlan)}
        onClose={() => setDeleteConfirmPlan(null)}
        onConfirm={() => deleteConfirmPlan && deleteMutation.mutate(deleteConfirmPlan.id)}
        title={`Delete Plan: ${deleteConfirmPlan?.name}`}
        description="Are you sure you want to delete this subscription plan? Deleting a plan that has active or past subscribers will be rejected by the server."
        confirmText="Delete Plan"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
