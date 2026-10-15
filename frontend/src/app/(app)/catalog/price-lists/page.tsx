'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FormFieldWrapper } from '@/components/shared/FormFieldWrapper';

import {
  Tag,
  Plus,
  Edit,
  Globe,
  CheckCircle2,
  XCircle,
  Star,
  ExternalLink,
  Info,
  RefreshCw,
  Percent,
} from 'lucide-react';

export default function PriceListsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingList, setEditingList] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'RETAIL' | 'WHOLESALE' | 'FESTIVE_OFFER'>('RETAIL');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Query Price Lists
  const { data: priceLists = [], isLoading } = useQuery({
    queryKey: ['priceLists'],
    queryFn: () => api.catalog.priceLists.list(),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; code?: string; type: string; isDefault?: boolean }) =>
      api.catalog.priceLists.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['priceLists'] });
      toast.success(t('catalog.priceListCreated') || 'Price list created successfully');
      setIsCreateOpen(false);
      resetForm();
      router.push(`/catalog/price-lists/${created.id}`);
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        setFieldErrors({ code: 'A price list with this code already exists.' });
      } else {
        toast.error(err?.response?.data?.message || err?.message || 'Failed to create price list');
      }
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.catalog.priceLists.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priceLists'] });
      toast.success(t('catalog.priceListUpdated') || 'Price list updated successfully');
      setEditingList(null);
      resetForm();
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        setFieldErrors({ code: 'A price list with this code already exists.' });
      } else {
        toast.error(err?.response?.data?.message || err?.message || 'Failed to update price list');
      }
    },
  });

  const resetForm = () => {
    setName('');
    setCode('');
    setType('RETAIL');
    setIsDefault(false);
    setIsActive(true);
    setFieldErrors({});
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEdit = (pl: any) => {
    setEditingList(pl);
    setName(pl.name);
    setCode(pl.code || '');
    setType(pl.type || 'RETAIL');
    setIsDefault(Boolean(pl.is_default || pl.isDefault));
    setIsActive(Boolean(pl.is_active ?? pl.isActive ?? true));
    setFieldErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFieldErrors({ name: 'Name is required' });
      return;
    }

    if (editingList) {
      updateMutation.mutate({
        id: editingList.id,
        data: {
          name: name.trim(),
          isDefault,
          isActive,
        },
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        code: code.trim() ? code.trim().toUpperCase() : undefined,
        type,
        isDefault,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t('catalog.priceListsTitle') || 'Custom Price Lists'}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage custom retail, wholesale tiers, and seasonal promotions across all branches
          </p>
        </div>

        <PermissionGate permission="products:update">
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>{t('catalog.newPriceList') || 'New Price List'}</span>
          </Button>
        </PermissionGate>
      </div>

      {/* Business-Wide Scope Notice */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
        <Globe className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-xs text-foreground/80">
          <strong className="text-foreground block font-semibold">Business-Wide Price Catalogs</strong>
          <p>
            Price lists are global across all branches in your business. When active, POS terminals and sales channels can apply these tiered prices directly to items during checkout.
          </p>
        </div>
      </div>

      {/* Price Lists Table */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b">
              <tr>
                <th className="py-3.5 px-4">Name / Code</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4 text-center">Items Count</th>
                <th className="py-3.5 px-4 text-center">Default Flag</th>
                <th className="py-3.5 px-4 text-center">{t('common.status')}</th>
                <th className="py-3.5 px-4 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading price lists...
                  </td>
                </tr>
              ) : priceLists.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-xs">
                    No custom price lists found. Create your first list using the button above.
                  </td>
                </tr>
              ) : (
                priceLists.map((pl: any) => {
                  const isDef = Boolean(pl.is_default || pl.isDefault);
                  const isAct = Boolean(pl.is_active ?? pl.isActive ?? true);
                  const itemsCount = pl._count?.items ?? pl.items?.length ?? 0;

                  return (
                    <tr key={pl.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {pl.name}
                          {isDef && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />}
                        </div>
                        {pl.code && (
                          <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {pl.code}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-xs font-mono">
                          {pl.type}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-medium">
                        {itemsCount}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isDef ? (
                          <Badge variant="default" className="text-[10px] bg-amber-500 text-white">
                            Default
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={isAct ? 'default' : 'secondary'} className="text-[10px]">
                          {isAct ? t('common.active') : t('common.inactive')}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <PermissionGate permission="products:update">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => openEdit(pl)}
                            >
                              <Edit className="w-3.5 h-3.5 mr-1" />
                              {t('common.edit')}
                            </Button>
                          </PermissionGate>

                          <Button
                            size="sm"
                            className="h-8 px-2.5 text-xs gap-1"
                            onClick={() => router.push(`/catalog/price-lists/${pl.id}`)}
                          >
                            <span>Manage Items</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Dialog Modal */}
      {(isCreateOpen || editingList) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground">
              {editingList ? 'Edit Price List' : 'Create Custom Price List'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormFieldWrapper label="List Name" error={fieldErrors.name} required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Eid Mega Sale, Wholesale Tier A..."
                  className="text-xs"
                />
              </FormFieldWrapper>

              {!editingList && (
                <>
                  <FormFieldWrapper label="List Code" error={fieldErrors.code}>
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. EID-2026, WHOLESALE-A"
                      className="text-xs font-mono uppercase"
                    />
                  </FormFieldWrapper>

                  <FormFieldWrapper label="Price List Type" required>
                    <select
                      value={type}
                      onChange={(e: any) => setType(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                    >
                      <option value="RETAIL">Retail Custom Price</option>
                      <option value="WHOLESALE">Wholesale Volume Tier</option>
                      <option value="FESTIVE_OFFER">Festive Offer / Campaign</option>
                    </select>
                  </FormFieldWrapper>
                </>
              )}

              <div className="space-y-2 pt-2 border-t">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded border-input text-primary"
                  />
                  <span>Set as default price list for this type</span>
                </label>

                {editingList && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-input text-primary"
                    />
                    <span>Active</span>
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingList(null);
                  }}
                  className="text-xs"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="text-xs"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : null}
                  {editingList ? t('common.save') : t('common.create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
