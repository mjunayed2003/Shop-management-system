'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Layers, Plus, Trash2, Edit2, Loader2, AlertCircle } from 'lucide-react';

interface ExpenseCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated?: (category: any) => void;
}

export function ExpenseCategoriesModal({
  isOpen,
  onClose,
  onCategoryCreated,
}: ExpenseCategoriesModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch categories
  const { data: categories, isLoading } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => api.expenses.categories.list(),
    enabled: isOpen,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      return api.expenses.categories.create({
        name: name.trim(),
        code: code.trim().toUpperCase() || undefined,
        description: description.trim() || undefined,
      });
    },
    onSuccess: (newCat) => {
      toast.success(`Category "${newCat.name}" created successfully`);
      setName('');
      setCode('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      if (onCategoryCreated) onCategoryCreated(newCat);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create category';
      if (err?.response?.status === 409) {
        setFormError('Category name or code is already in use by another category.');
      } else {
        setFormError(msg);
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.expenses.categories.delete(id);
    },
    onSuccess: () => {
      toast.success('Category deleted');
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Cannot delete category that is referenced by expenses';
      toast.error(msg);
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span>{t('expenses.categories')}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Manage business-wide expense classifications and budget heads.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* New Category Form */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
            <span className="font-semibold text-foreground text-xs">{t('expenses.addCategory')}</span>

            {formError && (
              <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category Name *"
                className="text-xs"
              />
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Code (e.g. UTIL)"
                className="text-xs font-mono"
              />
            </div>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (Optional)"
              className="text-xs"
            />
            <Button
              type="button"
              disabled={!name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 gap-1.5"
            >
              {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              <span>Save Category</span>
            </Button>
          </div>

          {/* Existing Categories List */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
              Existing Categories
            </span>
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading categories...</div>
            ) : (categories || []).length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No categories defined yet.</div>
            ) : (
              (categories || []).map((cat: any) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                >
                  <div>
                    <span className="font-semibold text-foreground">{cat.name}</span>
                    {cat.code && <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">({cat.code})</span>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(cat.id)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            {t('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
