'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { FormFieldWrapper } from '@/components/shared/FormFieldWrapper';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Lock, User, ShoppingBag, AlertTriangle, Loader2, Sparkles, Shield } from 'lucide-react';

const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, 'ইমেইল বা ফোন নম্বর আবশ্যক')
    .refine((val) => {
      const clean = val.trim();
      // Allow email format OR phone (at least 10 digits)
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
      const isPhone = /^(\+?88)?01[3-9]\d{8}$/.test(clean.replace(/[\s-]/g, ''));
      return isEmail || isPhone;
    }, 'বৈধ ইমেইল অথবা বাংলাদেশি মোবাইল নম্বর প্রদান করুন'),
  password: z.string().min(6, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'),
  businessSlug: z.string().optional(),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/dashboard';

  const { t } = useTranslation();
  const toast = useToast();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setBranches = useBranchStore((s) => s.setBranches);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: 'owner@shop.com',
      password: 'ShopOwner123!',
      businessSlug: 'demo-fashion',
      rememberMe: true,
    },
  });

  const fillStoreDemo = (id: string, pass: string, slug?: string) => {
    setValue('identifier', id);
    setValue('password', pass);
    setValue('businessSlug', slug || undefined);
    setServerError(null);
  };

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const isDemo =
        values.identifier.trim().toLowerCase() === 'owner@shop.com' ||
        values.identifier.trim().toLowerCase() === 'cashier@shop.com';

      // For custom user emails/phones, do not lock to 'demo-fashion'
      const effectiveSlug = isDemo
        ? (values.businessSlug || 'demo-fashion')
        : (values.businessSlug && values.businessSlug !== 'demo-fashion' ? values.businessSlug.trim() : undefined);

      // Authenticate via Next.js BFF proxy to set secure httpOnly cookie
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: values.identifier.trim(),
          password: values.password,
          businessSlug: effectiveSlug,
          rememberMe: values.rememberMe,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.message || t('auth.invalidCredentials');
        if (res.status === 401) {
          setServerError(t('auth.invalidCredentials'));
        } else if (res.status === 403) {
          if (String(msg).toLowerCase().includes('lockout') || String(msg).toLowerCase().includes('locked')) {
            setServerError(t('auth.accountLocked'));
          } else if (String(msg).toLowerCase().includes('suspended')) {
            setServerError(t('auth.subscriptionSuspended'));
          } else {
            setServerError(msg);
          }
        } else if (res.status === 429) {
          setServerError(t('auth.rateLimited'));
        } else {
          setServerError(msg);
        }
        return;
      }

      // Populate Zustand stores
      setAuth({
        user: data.user,
        business: data.business,
        accessToken: data.accessToken,
        permissions: data.user?.permissions || [],
      });

      if (data.branches && data.branches.length > 0) {
        setBranches(data.branches);
      }

      toast.success(t('auth.loginSuccess'));

      // Clean browser navigation to target to ensure fresh session cookies & avoid cross-layout RSC chunk collisions
      window.location.href = redirectTarget;
    } catch (err: any) {
      setServerError(err?.message || 'সার্ভারে সংযোগ করা সম্ভব হচ্ছে না');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none animate-fadeIn">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white mx-auto flex items-center justify-center shadow-md shadow-sky-500/25">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t('auth.loginTitle')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{serverError}</div>
          </div>
        )}

        {/* Demo Credentials Quick-Fill */}
        <div className="p-3 bg-sky-50/70 dark:bg-sky-950/30 rounded-xl border border-sky-200/80 dark:border-sky-800/50 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-900 dark:text-sky-200">
            <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>ক্লিক করে ডেমো অ্যাকাউন্ট ফিল করুন:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => fillStoreDemo('owner@shop.com', 'ShopOwner123!', 'demo-fashion')}
              className="text-[11px] px-2.5 py-1 rounded-lg border font-medium bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              Store Owner (মালিক)
            </button>
            <button
              type="button"
              onClick={() => fillStoreDemo('cashier@shop.com', 'Cashier123!', 'demo-fashion')}
              className="text-[11px] px-2.5 py-1 rounded-lg border font-medium bg-white dark:bg-slate-800 border-sky-200 dark:border-slate-700 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              Cashier (ক্যাশিয়ার)
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormFieldWrapper
            id="identifier"
            label={t('auth.identifierLabel')}
            required
            error={errors.identifier}
          >
            <Input
              id="identifier"
              type="text"
              autoComplete="username"
              leftIcon={<User className="w-4 h-4" />}
              placeholder={t('auth.identifierPlaceholder')}
              isError={Boolean(errors.identifier)}
              {...register('identifier')}
            />
          </FormFieldWrapper>

          <FormFieldWrapper
            id="password"
            label={t('auth.passwordLabel')}
            required
            error={errors.password}
          >
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                leftIcon={<Lock className="w-4 h-4" />}
                placeholder={t('auth.passwordPlaceholder')}
                isError={Boolean(errors.password)}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FormFieldWrapper>

          {/* Remember me & Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                {...register('rememberMe')}
              />
              <span>{t('auth.rememberMe')}</span>
            </label>

            <Link
              href="/forgot-password"
              className="font-medium text-sky-600 dark:text-sky-400 hover:underline"
            >
              {t('auth.forgotPassword')}
            </Link>
          </div>

          {/* Submit Button (disabled while request is in flight) */}
          <div className="pt-2">
            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-xs"
              isLoading={isSubmitting}
              loadingText={t('auth.signingIn')}
              disabled={isSubmitting}
            >
              {t('auth.signInButton')}
            </Button>
          </div>
        </form>

        {/* Footer Link */}
        <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 space-y-1.5">
          <div>
            <span>{t('auth.noAccount')} </span>
            <Link
              href="/register"
              className="font-semibold text-sky-600 dark:text-sky-400 hover:underline"
            >
              {t('auth.registerLink')}
            </Link>
          </div>
          <div>
            <Link
              href="/platform/login"
              className="text-[11px] text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:underline inline-flex items-center gap-1"
            >
              <Shield className="w-3 h-3" />
              <span>প্ল্যাটফর্ম সুপার অ্যাডমিন লগইন (Platform Console)</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <p className="text-sm font-medium text-slate-500">লোড হচ্ছে...</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
