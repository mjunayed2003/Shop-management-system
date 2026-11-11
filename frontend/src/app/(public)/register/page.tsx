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
import {
  Store,
  User,
  UserCheck,
  Mail,
  Lock,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  Building2,
  Hash,
  ShieldCheck,
  ArrowRight,
  LogIn,
} from 'lucide-react';

const registerSchema = z
  .object({
    businessName: z.string().min(2, 'Shop name must be at least 2 characters'),
    businessSlug: z
      .string()
      .min(2, 'Shop ID (Slug) is required')
      .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens'),
    ownerFirstName: z.string().min(1, 'First name is required'),
    ownerLastName: z.string().min(1, 'Last name is required'),
    phone: z
      .string()
      .refine((val) => isValidBDPhone(val), 'Please provide a valid 11-digit mobile number (e.g. 017XXXXXXXX)'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
    branchName: z.string().min(2, 'Branch name is required'),
    branchAddress: z.string().min(3, 'Showroom address is required'),
    terms: z.boolean().refine((val) => val === true, 'You must agree to the terms and conditions'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

function FacebookIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function GoogleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.053 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const toast = useToast();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setBranches = useBranchStore((s) => s.setBranches);

  const idempotencyKey = useRef(generateIdempotencyKey()).current;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      branchName: 'Main Showroom',
      branchAddress: '',
      terms: false,
    },
  });

  const watchPassword = watch('password');

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score, label: locale === 'bn' ? 'দুর্বল' : 'Weak', color: 'bg-rose-500' };
    if (score <= 3) return { score, label: locale === 'bn' ? 'মাঝারি' : 'Medium', color: 'bg-amber-500' };
    return { score, label: locale === 'bn' ? 'শক্তিশালী' : 'Strong', color: 'bg-emerald-500' };
  };

  const pwdStrength = getPasswordStrength(watchPassword);

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

  const handleSocialClick = (provider: string) => {
    toast.info(
      locale === 'bn'
        ? `${provider} দিয়ে সাইন আপ ফিচার শীঘ্রই আসছে`
        : `${provider} sign up is coming soon`,
    );
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

      // Hydrate auth & branch stores
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
      router.push('/dashboard');
    } catch (err: any) {
      if (err.statusCode === 409) {
        setServerError(
          err.message ||
            (locale === 'bn'
              ? 'এই শপ আইডি বা ইমেইল/ফোন ইতিমধ্যে ব্যবহৃত হয়েছে।'
              : 'This Shop ID or Email/Phone is already in use.'),
        );
      } else {
        setServerError(
          err.message ||
            (locale === 'bn' ? 'দোকান নিবন্ধন প্রক্রিয়া সম্পন্ন করা যায়নি' : 'Could not complete registration process'),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] w-full flex items-center justify-center p-4 sm:p-6 sm:py-12">
      {/* Main Centered Register Card */}
      <div className="relative z-10 w-full max-w-[640px] bg-white dark:bg-slate-900 rounded-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] p-6 sm:p-12 transition-all border border-slate-200/50 dark:border-slate-800">
        {/* Header with Icon */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#22d3ee] to-[#ec4899] text-white mx-auto flex items-center justify-center shadow-md shadow-purple-500/25 mb-3">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            {locale === 'bn' ? 'শপ রেজিস্টার করুন' : 'Register Shop'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('register.subtitle')}
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{serverError}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {/* Section 1: Business Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <Store className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>{t('register.businessSection')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Business Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  {t('register.businessName')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center border-b border-slate-300 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 transition-colors pb-1">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
                  <input
                    type="text"
                    placeholder={t('register.businessNamePlaceholder')}
                    {...register('businessName', { onChange: handleBusinessNameChange })}
                    className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none py-1"
                  />
                </div>
                {errors.businessName && (
                  <p className="text-[11px] text-rose-500 font-medium pt-0.5">
                    {errors.businessName.message}
                  </p>
                )}
              </div>

              {/* Business Slug */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  {t('register.businessSlug')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center border-b border-slate-300 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 transition-colors pb-1">
                  <Hash className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
                  <input
                    type="text"
                    placeholder={t('register.businessSlugPlaceholder')}
                    {...register('businessSlug')}
                    className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none py-1"
                  />
                </div>
                {errors.businessSlug && (
                  <p className="text-[11px] text-rose-500 font-medium pt-0.5">
                    {errors.businessSlug.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Owner Personal Info */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>{t('register.ownerSection')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  {t('register.firstName')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center border-b border-slate-300 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 transition-colors pb-1">
                  <User className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
                  <input
                    type="text"
                    placeholder={t('register.firstNamePlaceholder')}
                    {...register('ownerFirstName')}
                    className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none py-1"
                  />
                </div>
                {errors.ownerFirstName && (
                  <p className="text-[11px] text-rose-500 font-medium pt-0.5">
                    {errors.ownerFirstName.message}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  {t('register.lastName')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center border-b border-slate-300 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 transition-colors pb-1">
                  <User className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
                  <input
                    type="text"
                    placeholder={t('register.lastNamePlaceholder')}
                    {...register('ownerLastName')}
                    className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none py-1"
                  />
                </div>
                {errors.ownerLastName && (
                  <p className="text-[11px] text-rose-500 font-medium pt-0.5">
                    {errors.ownerLastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  {t('register.phone')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center border-b border-slate-300 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 transition-colors pb-1">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
                  <input
                    type="tel"
                    placeholder="017XXXXXXXX"
                    {...register('phone')}
                    className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none py-1"
                  />
                </div>
                {errors.phone && (
                  <p className="text-[11px] text-rose-500 font-medium pt-0.5">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  {t('register.email')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center border-b border-slate-300 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 transition-colors pb-1">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
                  <input
                    type="email"
                    placeholder={t('register.emailPlaceholder')}
                    {...register('email')}
                    className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none py-1"
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-rose-500 font-medium pt-0.5">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  {t('register.password')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center border-b border-slate-300 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 transition-colors pb-1">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('register.passwordPlaceholder')}
                    {...register('password')}
                    className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none py-1 pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {watchPassword && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="flex-1 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
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
                {errors.password && (
                  <p className="text-[11px] text-rose-500 font-medium pt-0.5">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  {t('register.confirmPassword')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center border-b border-slate-300 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 transition-colors pb-1">
                  <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder={t('register.confirmPassword')}
                    {...register('confirmPassword')}
                    className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none py-1 pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-[11px] text-rose-500 font-medium pt-0.5">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Branch Info */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>{t('register.branchSection')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Branch Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  {t('register.branchName')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center border-b border-slate-300 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 transition-colors pb-1">
                  <Store className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
                  <input
                    type="text"
                    placeholder={t('register.branchNamePlaceholder')}
                    {...register('branchName')}
                    className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none py-1"
                  />
                </div>
                {errors.branchName && (
                  <p className="text-[11px] text-rose-500 font-medium pt-0.5">
                    {errors.branchName.message}
                  </p>
                )}
              </div>

              {/* Branch Address */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  {t('register.branchAddress')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center border-b border-slate-300 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 transition-colors pb-1">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
                  <input
                    type="text"
                    placeholder={t('register.branchAddressPlaceholder')}
                    {...register('branchAddress')}
                    className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none py-1"
                  />
                </div>
                {errors.branchAddress && (
                  <p className="text-[11px] text-rose-500 font-medium pt-0.5">
                    {errors.branchAddress.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Terms checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400 select-none">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                {...register('terms')}
              />
              <span>{t('register.termsLabel')}</span>
            </label>
            {errors.terms && (
              <p className="text-[11px] text-rose-500 font-medium pt-1">{errors.terms.message}</p>
            )}
          </div>

          {/* Vibrant Gradient Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full font-bold text-sm tracking-wider uppercase text-white shadow-lg shadow-purple-500/25 bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#ec4899] hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{locale === 'bn' ? 'শপ রেজিস্টার হচ্ছে...' : 'REGISTERING SHOP...'}</span>
                </>
              ) : (
                <>
                  <span>{locale === 'bn' ? 'শপ রেজিস্টার করুন' : 'REGISTER SHOP'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Social Register Section */}
        <div className="pt-8 pb-1 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3.5 font-normal">
            Or Sign Up Using
          </p>
          <div className="flex items-center justify-center gap-4">
            {/* Facebook */}
            <button
              type="button"
              onClick={() => handleSocialClick('Facebook')}
              className="w-10 h-10 rounded-full bg-[#1877F2] hover:bg-[#166fe5] flex items-center justify-center text-white shadow-sm hover:scale-110 active:scale-95 transition-all cursor-pointer"
              title="Sign up with Facebook"
            >
              <FacebookIcon className="w-4 h-4" />
            </button>

            {/* Google / Gmail */}
            <button
              type="button"
              onClick={() => handleSocialClick('Google')}
              className="w-10 h-10 rounded-full bg-[#EA4335] hover:bg-[#d63a2c] flex items-center justify-center text-white shadow-sm hover:scale-110 active:scale-95 transition-all cursor-pointer"
              title="Sign up with Gmail"
            >
              <GoogleIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Login Link */}
        <div className="pt-6 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
          <p>{locale === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট রয়েছে?' : 'Already have an account?'}</p>
          <Link
            href="/login"
            className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors inline-flex items-center gap-1.5 pt-0.5"
          >
            <LogIn className="w-3.5 h-3.5 text-slate-500" />
            <span>LOGIN</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
