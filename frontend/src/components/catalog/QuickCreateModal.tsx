'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useToast } from '@/components/feedback/ToastContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormFieldWrapper } from '@/components/shared/FormFieldWrapper';
import { Plus, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export type MasterDataType = 'category' | 'brand' | 'season' | 'size' | 'color' | 'unit';

interface QuickCreateModalProps {
  type: MasterDataType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdItem: any) => void;
  existingCategories?: { id: string; name: string }[];
}

export function QuickCreateModal({
  type,
  isOpen,
  onClose,
  onSuccess,
  existingCategories = [],
}: QuickCreateModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<number>(10);
  const [hexCode, setHexCode] = useState('#000000');
  const [allowDecimal, setAllowDecimal] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async () => {
      setFieldErrors({});
      switch (type) {
        case 'category':
          return api.catalog.categories.create({
            name: name.trim(),
            code: code.trim() || undefined,
            parentId: parentId || undefined,
          });
        case 'brand':
          return api.catalog.brands.create({
            name: name.trim(),
            code: code.trim() || undefined,
          });
        case 'season':
          return api.catalog.seasons.create({
            name: name.trim(),
            code: code.trim() || undefined,
          });
        case 'size':
          return api.catalog.sizes.create({
            name: name.trim(),
            code: code.trim() || undefined,
            sortOrder: Number(sortOrder) || 10,
          });
        case 'color':
          return api.catalog.colors.create({
            name: name.trim(),
            code: code.trim() || undefined,
            hexCode: hexCode || undefined,
          });
        case 'unit':
          return api.catalog.units.create({
            name: name.trim(),
            code: code.trim() || undefined,
            allowDecimal,
          });
      }
    },
    onSuccess: (data) => {
      toast.success(`${name} created successfully.`);
      queryClient.invalidateQueries({ queryKey: [type === 'category' ? 'categories' : `${type}s`] });
      onSuccess(data);
      handleClose();
    },
    onError: (err: any) => {
      if (err.statusCode === 409) {
        setFieldErrors({ code: err.message || 'Code already exists in your business' });
      } else if (err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      } else {
        toast.error(err.message || 'Failed to create item');
      }
    },
  });

  const handleClose = () => {
    setName('');
    setCode('');
    setParentId('');
    setSortOrder(10);
    setHexCode('#000000');
    setAllowDecimal(false);
    setFieldErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const titles: Record<MasterDataType, string> = {
    category: t('catalog.addCategory'),
    brand: t('catalog.addBrand'),
    season: t('catalog.addSeason'),
    size: t('catalog.addSize'),
    color: t('catalog.addColor'),
    unit: t('catalog.addUnit'),
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {titles[type]}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              setFieldErrors({ name: 'Name is required' });
              return;
            }
            mutation.mutate();
          }}
          className="p-6 space-y-4"
        >
          <FormFieldWrapper label="Name" required error={fieldErrors.name}>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder={`e.g. ${type === 'size' ? 'XL' : type === 'color' ? 'Navy Blue' : 'New Item'}`}
              autoFocus
            />
          </FormFieldWrapper>

          <FormFieldWrapper label="Code (Optional)" error={fieldErrors.code} hint="Leave blank to auto-generate from name">
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (fieldErrors.code) setFieldErrors((prev) => ({ ...prev, code: '' }));
              }}
              placeholder={`e.g. ${type === 'size' ? 'SZ-XL' : 'CODE-01'}`}
              className="uppercase font-mono text-xs"
            />
          </FormFieldWrapper>

          {type === 'category' && (
            <FormFieldWrapper label={t('catalog.parentCategory')} hint="Optional parent for hierarchical grouping">
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">{t('catalog.noParent')}</option>
                {existingCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormFieldWrapper>
          )}

          {type === 'color' && (
            <FormFieldWrapper label={t('catalog.hexCode')}>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={hexCode}
                  onChange={(e) => setHexCode(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent"
                />
                <Input
                  value={hexCode}
                  onChange={(e) => setHexCode(e.target.value)}
                  placeholder="#000000"
                  className="uppercase font-mono text-xs max-w-[140px]"
                />
                <div
                  className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 shadow-sm"
                  style={{ backgroundColor: hexCode }}
                />
              </div>
            </FormFieldWrapper>
          )}

          {type === 'size' && (
            <FormFieldWrapper label={t('catalog.sortOrder')} hint="Lower numbers appear first in selector tables">
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                min={0}
                max={999}
              />
            </FormFieldWrapper>
          )}

          {type === 'unit' && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{t('catalog.allowDecimal')}</p>
                <p className="text-[11px] text-slate-500">e.g. meter, kg vs piece, pair</p>
              </div>
              <input
                type="checkbox"
                checked={allowDecimal}
                onChange={(e) => setAllowDecimal(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={handleClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" isLoading={mutation.isPending}>
              Create & Select
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
