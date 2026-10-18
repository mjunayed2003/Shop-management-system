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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Zap className="w-6 h-6 text-indigo-400" />
            Subscription Plans & Quota Limits
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Configure commercial pricing tiers, trial durations, and technical resource bounds.
          </p>
        </div>

        {canEditPlans && (
          <Button
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create New Plan
          </Button>
        )}
      </div>

      {/* Grid of Plans */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl">
          <Zap className="w-12 h-12 text-indigo-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-slate-200">No Plans Configured</h3>
          <p className="text-slate-400 text-sm mt-1">
            Create your first subscription tier to begin onboarding tenant shops.
          </p>
          {canEditPlans && (
            <Button
              onClick={handleOpenCreate}
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
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
                className={`bg-slate-900 border transition-all flex flex-col justify-between ${
                  p.is_active
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-slate-800/40 opacity-70'
                }`}
              >
                <div>
                  <CardHeader className="pb-3 border-b border-slate-800">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg text-slate-100">{p.name}</CardTitle>
                          <Badge variant="outline" className="font-mono text-xs border-indigo-500/40 text-indigo-400">
                            {p.code}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {p.description || 'No public description.'}
                        </p>
                      </div>
                      <Badge
                        variant={p.is_active ? 'default' : 'secondary'}
                        className={
                          p.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }
                      >
                        {p.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="pt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-100">
                        {formatBDT(p.monthly_price)}
                      </span>
                      <span className="text-xs text-slate-400">/ mo</span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-300">
                        {formatBDT(p.yearly_price)} / yr
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between text-slate-300 py-1 border-b border-slate-800/60">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                        Max Branches
                      </span>
                      <span className="font-medium text-slate-200">
                        {limits?.max_branches ?? 'Unlimited'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300 py-1 border-b border-slate-800/60">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        Max Users
                      </span>
                      <span className="font-medium text-slate-200">
                        {limits?.max_users ?? 'Unlimited'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300 py-1 border-b border-slate-800/60">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-indigo-400" />
                        Max Products
                      </span>
                      <span className="font-medium text-slate-200">
                        {limits?.max_products?.toLocaleString() ?? 'Unlimited'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300 py-1 border-b border-slate-800/60">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        Max Variants
                      </span>
                      <span className="font-medium text-slate-200">
                        {limits?.max_variants?.toLocaleString() ?? 'Unlimited'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300 py-1 border-b border-slate-800/60">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                        Monthly Invoices
                      </span>
                      <span className="font-medium text-slate-200">
                        {limits?.max_monthly_invoices?.toLocaleString() ?? 'Unlimited'}
                      </span>
                    </div>

                    <div className="pt-2 grid grid-cols-3 gap-1 text-[11px]">
                      <div
                        className={`p-1.5 rounded text-center border ${
                          limits?.has_api_access
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-950 border-slate-800 text-slate-600'
                        }`}
                      >
                        API Access
                      </div>
                      <div
                        className={`p-1.5 rounded text-center border ${
                          limits?.has_custom_reports
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-950 border-slate-800 text-slate-600'
                        }`}
                      >
                        Reports
                      </div>
                      <div
                        className={`p-1.5 rounded text-center border ${
                          limits?.has_offline_sync
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-950 border-slate-800 text-slate-600'
                        }`}
                      >
                        Offline Sync
                      </div>
                    </div>

                    <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Free Trial Duration:</span>
                      <span className="font-medium text-slate-200">{p.trial_days ?? 30} Days</span>
                    </div>
                  </CardContent>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-2 bg-slate-950/30">
                  {canEditPlans && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(p)}
                      className={`text-xs ${
                        p.is_active
                          ? 'border-slate-800 text-slate-400 hover:text-slate-200'
                          : 'border-emerald-800/60 text-emerald-400 hover:bg-emerald-950/20'
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
                        className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
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
                        className="text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 text-xs p-2"
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

      {/* PLAN CREATE / EDIT MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-400">
              <Zap className="w-5 h-5" />
              {editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create Subscription Plan'}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              {editingPlan
                ? 'Modifying limits here affects all shops subscribed to this plan.'
                : 'Define commercial limits and pricing tiers.'}
            </DialogDescription>
          </DialogHeader>

          {editingPlan && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                <strong>Warning:</strong> Changes to resource limits will automatically update quotas
                for active business subscribers on this tier.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300">
                  Plan Name <span className="text-rose-400">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Starter, Retail Pro, Enterprise"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-100 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">
                  Unique Code <span className="text-rose-400">*</span>
                </label>
                <Input
                  required
                  disabled={Boolean(editingPlan)}
                  placeholder="e.g. STARTER, PRO, ENTERPRISE"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  className="bg-slate-950 border-slate-800 text-slate-100 mt-1 uppercase font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">Description</label>
              <Textarea
                rows={2}
                placeholder="Target demographic and apparel retail feature highlights..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-slate-950 border-slate-800 text-slate-100 mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-slate-800 pt-3">
              <div>
                <label className="text-xs font-medium text-slate-300">
                  Monthly Price (BDT) <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 1500"
                  value={formData.monthlyPrice}
                  onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-100 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">
                  Yearly Price (BDT) <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 15000"
                  value={formData.yearlyPrice}
                  onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-100 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">Trial Days</label>
                <Input
                  type="number"
                  placeholder="30"
                  value={formData.trialDays}
                  onChange={(e) => setFormData({ ...formData, trialDays: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-100 mt-1"
                />
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Plan Resource Limits
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400">Max Branches</label>
                  <Input
                    type="number"
                    value={formData.limits.maxBranches}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: { ...formData.limits, maxBranches: e.target.value },
                      })
                    }
                    className="bg-slate-950 border-slate-800 text-slate-100 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Max Users</label>
                  <Input
                    type="number"
                    value={formData.limits.maxUsers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: { ...formData.limits, maxUsers: e.target.value },
                      })
                    }
                    className="bg-slate-950 border-slate-800 text-slate-100 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Max Products</label>
                  <Input
                    type="number"
                    value={formData.limits.maxProducts}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: { ...formData.limits, maxProducts: e.target.value },
                      })
                    }
                    className="bg-slate-950 border-slate-800 text-slate-100 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Max Variants (SKU)</label>
                  <Input
                    type="number"
                    value={formData.limits.maxVariants}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: { ...formData.limits, maxVariants: e.target.value },
                      })
                    }
                    className="bg-slate-950 border-slate-800 text-slate-100 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Max Monthly Invoices</label>
                  <Input
                    type="number"
                    value={formData.limits.maxMonthlyInvoices}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: { ...formData.limits, maxMonthlyInvoices: e.target.value },
                      })
                    }
                    className="bg-slate-950 border-slate-800 text-slate-100 mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Included Features
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 p-2 bg-slate-950 rounded border border-slate-800 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.limits.hasApiAccess}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: { ...formData.limits, hasApiAccess: e.target.checked },
                      })
                    }
                    className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>REST API Access</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-slate-950 rounded border border-slate-800 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.limits.hasCustomReports}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: { ...formData.limits, hasCustomReports: e.target.checked },
                      })
                    }
                    className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Custom Reports</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-slate-950 rounded border border-slate-800 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.limits.hasOfflineSync}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        limits: { ...formData.limits, hasOfflineSync: e.target.checked },
                      })
                    }
                    className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Multi-POS Offline Sync</span>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="border-slate-800 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingPlan
                  ? 'Update Plan'
                  : 'Create Plan'}
              </Button>
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
