'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { normalizeBDPhone, isValidBDPhone } from '@/lib/utils/phone';
import { generateIdempotencyKey } from '@/lib/utils/idempotency';
import { api } from '@/lib/api/endpoints';
import { FormFieldWrapper } from '@/components/shared/FormFieldWrapper';
import { PhoneInput } from '@/components/shared/PhoneInput';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  ShoppingBag,
  Store,
  User,
  Mail,
  Lock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

const registerSchema = z
  .object({
    businessName: z.string().min(2, 'দোকানের নাম কমপক্ষে ২ অক্ষরের হতে হবে'),
    businessSlug: z
      .string()
      .min(2, 'দোকানের আইডি (Slug) আবশ্যক')
      .regex(/^[a-z0-9-]+$/, 'আইডি অবশ্যই ছোট হাতের অক্ষর, সংখ্যা ও হাইফেন হতে হবে'),
    ownerFirstName: z.string().min(1, 'প্রথম নাম আবশ্যক'),
    ownerLastName: z.string().min(1, 'শেষ নাম আবশ্যক'),
    phone: z
      .string()
      .refine((val) => isValidBDPhone(val), 'সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)'),
    email: z.string().email('সঠিক ইমেইল ঠিকানা দিন'),
    password: z.string().min(6, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'),
    confirmPassword: z.string().min(6, 'পাসওয়ার্ড নিশ্চিত করুন'),
    branchName: z.string().min(2, 'প্রথম শাখার নাম আবশ্যক'),
    branchAddress: z.string().min(3, 'শোরুমের ঠিকানা আবশ্যক'),
    terms: z.boolean().refine((val) => val === true, 'শর্তাবলীতে সম্মতি প্রদান আবশ্যক'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'পাসওয়ার্ড মিলছে না',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const toast = useToast();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setBranches = useBranchStore((s) => s.setBranches);

  // Generate UUID idempotency key once per form open, reused on retry
  const idempotencyKey = useRef(generateIdempotencyKey()).current;

  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      businessName: '',
      businessSlug: '',
      ownerFirstName: '',
      ownerLastName: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      branchName: 'প্রধান শোরুম (Main Showroom)',
      branchAddress: '',
      terms: false,
    },
  });

  const watchBusinessName = watch('businessName');
  const watchPassword = watch('password');
  const watchPhone = watch('phone');

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score, label: 'দুর্বল (Weak)', color: 'bg-rose-500' };
    if (score <= 3) return { score, label: 'মাঝারি (Medium)', color: 'bg-amber-500' };
    return { score, label: 'শক্তিশালী (Strong)', color: 'bg-emerald-500' };
  };

  const pwdStrength = getPasswordStrength(watchPassword);

  // Auto-generate slug from business name if slug not yet manually edited
  const handleBusinessNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue('businessName', val, { shouldValidate: true });
    const slugified = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    if (slugified) {
      setValue('businessSlug', slugified, { shouldValidate: true });
    }
  };

  const onSubmit = async (values: RegisterFormValues) => {
    setIsSubmitting(true);
    setServerError(null);

    const normalizedPhone = normalizeBDPhone(values.phone);

    try {
      const response = await api.onboarding.onboard(
        {
          businessName: values.businessName.trim(),
          businessSlug: values.businessSlug.trim().toLowerCase(),
          phone: normalizedPhone,
          email: values.email.trim().toLowerCase(),
          ownerFirstName: values.ownerFirstName.trim(),
          ownerLastName: values.ownerLastName.trim(),
          ownerEmail: values.email.trim().toLowerCase(),
          ownerPhone: normalizedPhone,
          password: values.password,
          branchName: values.branchName.trim(),
          branchAddress: values.branchAddress.trim(),
          planCode: 'STARTER',
        },
        {
          idempotencyKey,
        },
      );

      // Successfully onboarded! Hydrate Zustand state
      setAuth({
        user: {
          id: response.owner.id,
          firstName: response.owner.firstName,
          lastName: response.owner.lastName,
          email: response.owner.email,
          phone: response.owner.phone,
          isOwner: true,
          role: { id: 'owner-role', name: 'Business Owner', code: 'OWNER' },
        },
        business: {
          id: response.business.id,
          name: response.business.name,
          slug: response.business.slug,
          subscription: response.subscription,
        },
        accessToken: response.accessToken,
        permissions: ['*'],
      });

      if (response.mainBranch) {
        setBranches([
          {
            ...response.mainBranch,
            isMain: true,
            is_default: true,
          },
        ]);
      }

      toast.success(t('register.success'));

      // Direct entry to app dashboard
      router.push('/dashboard');
    } catch (err: any) {
      if (err.statusCode === 409) {
        setServerError('এই শপ আইডি (Slug) ইতিমধ্যে ব্যবহৃত হয়েছে। অনুগ্রহ করে অন্য আইডি দিন।');
      } else {
        setServerError(err.message || 'দোকান নিবন্ধন প্রক্রিয়া সম্পন্ন করা যায়নি');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 animate-fadeIn">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white mx-auto flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t('register.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t('register.subtitle')}
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{serverError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
          {/* Section 1: Business Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <Store className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {t('register.businessSection')}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormFieldWrapper
                id="businessName"
                label={t('register.businessName')}
                required
                error={errors.businessName}
              >
                <Input
                  id="businessName"
                  placeholder={t('register.businessNamePlaceholder')}
                  isError={Boolean(errors.businessName)}
                  {...register('businessName', { onChange: handleBusinessNameChange })}
                />
              </FormFieldWrapper>

              <FormFieldWrapper
                id="businessSlug"
                label={t('register.businessSlug')}
                required
                error={errors.businessSlug}
                hint={t('register.businessSlugHelp')}
              >
                <Input
                  id="businessSlug"
                  placeholder={t('register.businessSlugPlaceholder')}
                  isError={Boolean(errors.businessSlug)}
                  {...register('businessSlug')}
                />
              </FormFieldWrapper>
            </div>
          </div>

          {/* Section 2: Owner Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <User className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {t('register.ownerSection')}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormFieldWrapper
                id="ownerFirstName"
                label={t('register.firstName')}
                required
                error={errors.ownerFirstName}
              >
                <Input
                  id="ownerFirstName"
                  placeholder={t('register.firstNamePlaceholder')}
                  isError={Boolean(errors.ownerFirstName)}
                  {...register('ownerFirstName')}
                />
              </FormFieldWrapper>

              <FormFieldWrapper
                id="ownerLastName"
                label={t('register.lastName')}
                required
                error={errors.ownerLastName}
              >
                <Input
                  id="ownerLastName"
                  placeholder={t('register.lastNamePlaceholder')}
                  isError={Boolean(errors.ownerLastName)}
                  {...register('ownerLastName')}
                />
              </FormFieldWrapper>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormFieldWrapper
                id="phone"
                label={t('register.phone')}
                required
                error={errors.phone}
              >
                <PhoneInput
                  id="phone"
                  value={watchPhone}
                  onChange={(val) => setValue('phone', val, { shouldValidate: true })}
                  isError={Boolean(errors.phone)}
                />
              </FormFieldWrapper>

              <FormFieldWrapper
                id="email"
                label={t('register.email')}
                required
                error={errors.email}
              >
                <Input
                  id="email"
                  type="email"
                  leftIcon={<Mail className="w-4 h-4" />}
                  placeholder={t('register.emailPlaceholder')}
                  isError={Boolean(errors.email)}
                  {...register('email')}
                />
              </FormFieldWrapper>
            </div>

            {/* Password & Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormFieldWrapper
                id="password"
                label={t('register.password')}
                required
                error={errors.password}
              >
                <Input
                  id="password"
                  type="password"
                  leftIcon={<Lock className="w-4 h-4" />}
                  placeholder={t('register.passwordPlaceholder')}
                  isError={Boolean(errors.password)}
                  {...register('password')}
                />
                {watchPassword && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${pwdStrength.color}`}
                        style={{ width: `${(pwdStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {pwdStrength.label}
                    </span>
                  </div>
                )}
              </FormFieldWrapper>

              <FormFieldWrapper
                id="confirmPassword"
                label={t('register.confirmPassword')}
                required
                error={errors.confirmPassword}
              >
                <Input
                  id="confirmPassword"
                  type="password"
                  leftIcon={<Lock className="w-4 h-4" />}
                  placeholder={t('register.confirmPassword')}
                  isError={Boolean(errors.confirmPassword)}
                  {...register('confirmPassword')}
                />
              </FormFieldWrapper>
            </div>
          </div>

          {/* Section 3: First Branch */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {t('register.branchSection')}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormFieldWrapper
                id="branchName"
                label={t('register.branchName')}
                required
                error={errors.branchName}
              >
                <Input
                  id="branchName"
                  placeholder={t('register.branchNamePlaceholder')}
                  isError={Boolean(errors.branchName)}
                  {...register('branchName')}
                />
              </FormFieldWrapper>

              <FormFieldWrapper
                id="branchAddress"
                label={t('register.branchAddress')}
                required
                error={errors.branchAddress}
              >
                <Input
                  id="branchAddress"
                  placeholder={t('register.branchAddressPlaceholder')}
                  isError={Boolean(errors.branchAddress)}
                  {...register('branchAddress')}
                />
              </FormFieldWrapper>
            </div>
          </div>

          {/* Terms checkbox */}
          <div className="space-y-1 pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400 select-none">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                {...register('terms')}
              />
              <span>{t('register.termsLabel')}</span>
            </label>
            {errors.terms && (
              <p className="text-xs text-rose-500 font-medium">{errors.terms.message}</p>
            )}
          </div>

          {/* Submit Button (disabled while request is in flight) */}
          <div className="pt-4">
            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-base font-bold shadow-lg shadow-emerald-500/25"
              isLoading={isSubmitting}
              loadingText={t('register.submitting')}
              disabled={isSubmitting}
            >
              <span>{t('register.submitButton')}</span>
            </Button>
          </div>
        </form>

        <div className="text-center pt-2 text-xs text-slate-500">
          <span>ইতিমধ্যে অ্যাকাউন্ট রয়েছে? </span>
          <Link
            href="/login"
            className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            {t('nav.login')}
          </Link>
        </div>
      </div>
    </div>
  );
}
