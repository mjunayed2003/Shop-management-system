'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Sparkles, Building2, User, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/shared/PhoneInput';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { FormFieldWrapper } from '@/components/shared/FormFieldWrapper';
import { api } from '@/lib/api/endpoints';
import { ConflictError, ValidationError } from '@/lib/api/errors';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

const supplierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters'),
  companyName: z.string().optional(),
  phone: z.string().min(10, 'Valid Bangladeshi phone number required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  openingBalance: z.number().min(0, 'Opening balance cannot be negative').optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier?: any | null; // If editing
  onSuccess: (supplier: any) => void;
}

export function SupplierModal({
  isOpen,
  onClose,
  supplier,
  onSuccess,
}: SupplierModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const isEdit = Boolean(supplier?.id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      code: '',
      companyName: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      openingBalance: 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        reset({
          name: supplier.name || '',
          code: supplier.code || '',
          companyName: supplier.company_name || supplier.companyName || '',
          phone: supplier.phone || '',
          email: supplier.email || '',
          address: supplier.address || '',
          city: supplier.city || '',
          openingBalance: Number(supplier.opening_balance || supplier.openingBalance || 0),
        });
      } else {
        const autoCode = `SUP-${Math.floor(1000 + Math.random() * 9000)}`;
        reset({
          name: '',
          code: autoCode,
          companyName: '',
          phone: '',
          email: '',
          address: '',
          city: '',
          openingBalance: 0,
        });
      }
    }
  }, [isOpen, supplier, reset]);

  if (!isOpen) return null;

  const handleGenerateCode = () => {
    const autoCode = `SUP-${Math.floor(1000 + Math.random() * 9000)}`;
    setValue('code', autoCode, { shouldValidate: true });
  };

  const onSubmit = async (values: SupplierFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEdit) {
        const updated = await api.purchases.suppliers.update(supplier.id, {
          name: values.name,
          companyName: values.companyName || undefined,
          phone: values.phone,
          email: values.email || undefined,
          address: values.address || undefined,
          city: values.city || undefined,
        });
        showToast('Supplier updated successfully', 'success');
        onSuccess(updated);
        onClose();
      } else {
        const created = await api.purchases.suppliers.create({
          name: values.name,
          code: values.code,
          companyName: values.companyName || undefined,
          phone: values.phone,
          email: values.email || undefined,
          address: values.address || undefined,
          city: values.city || undefined,
          openingBalance: values.openingBalance || 0,
        });
        showToast('Supplier created successfully', 'success');
        onSuccess(created);
        onClose();
      }
    } catch (err: any) {
      if (err instanceof ConflictError) {
        // Map 409 duplicate code error directly onto the code field
        setError('code', {
          type: 'manual',
          message: err.message || 'Supplier code already exists in your business.',
        });
      } else if (err instanceof ValidationError && err.fieldErrors) {
        for (const [field, msg] of Object.entries(err.fieldErrors)) {
          setError(field as any, { type: 'manual', message: msg });
        }
      } else {
        showToast(err?.message || 'Failed to save supplier', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isEdit ? t('edit') + ' ' + t('purchasing.suppliers') : t('purchasing.quickCreateSupplier')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('purchasing.supplierDetails')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormFieldWrapper label="Supplier Name *" error={errors.name?.message}>
              <Input
                {...register('name')}
                placeholder="e.g. Apex Textiles Ltd."
                isError={Boolean(errors.name)}
                leftIcon={<User className="w-4 h-4" />}
              />
            </FormFieldWrapper>

            <FormFieldWrapper label="Supplier Code *" error={errors.code?.message}>
              <div className="flex items-center gap-1.5">
                <Input
                  {...register('code')}
                  disabled={isEdit}
                  placeholder="e.g. SUP-001"
                  isError={Boolean(errors.code)}
                  className="uppercase font-mono text-xs"
                />
                {!isEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateCode}
                    className="h-10 px-2.5 shrink-0 text-xs gap-1"
                    title="Auto-generate Code"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Auto</span>
                  </Button>
                )}
              </div>
            </FormFieldWrapper>
          </div>

          <FormFieldWrapper label="Company Name (Optional)" error={errors.companyName?.message}>
            <Input
              {...register('companyName')}
              placeholder="e.g. Apex Holdings Ltd."
              leftIcon={<Building2 className="w-4 h-4" />}
            />
          </FormFieldWrapper>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormFieldWrapper label="Phone Number *" error={errors.phone?.message}>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    value={field.value}
                    onChange={field.onChange}
                    isError={Boolean(errors.phone)}
                  />
                )}
              />
            </FormFieldWrapper>

            <FormFieldWrapper label="Email Address (Optional)" error={errors.email?.message}>
              <Input
                {...register('email')}
                type="email"
                placeholder="e.g. supplier@apex.com"
                isError={Boolean(errors.email)}
                leftIcon={<Mail className="w-4 h-4" />}
              />
            </FormFieldWrapper>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormFieldWrapper label="Address (Optional)" error={errors.address?.message}>
              <Input
                {...register('address')}
                placeholder="e.g. Tejgaon I/A"
                leftIcon={<MapPin className="w-4 h-4" />}
              />
            </FormFieldWrapper>

            <FormFieldWrapper label="City (Optional)" error={errors.city?.message}>
              <Input
                {...register('city')}
                placeholder="e.g. Dhaka"
              />
            </FormFieldWrapper>
          </div>

          {!isEdit && (
            <FormFieldWrapper
              label="Opening Balance (BDT) (Create only)"
              error={errors.openingBalance?.message}
            >
              <Controller
                name="openingBalance"
                control={control}
                render={({ field }) => (
                  <MoneyInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="0.00"
                  />
                )}
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                Enter initial balance if we already owe money to this supplier.
              </span>
            </FormFieldWrapper>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
            >
              {isSubmitting ? t('submitting') : t('save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
