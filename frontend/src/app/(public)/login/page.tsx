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
import { Eye, EyeOff, Lock, User, AlertTriangle, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, 'Email or phone number is required')
    .refine((val) => {
      const clean = val.trim();
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
      const isPhone = /^(\+?88)?01[3-9]\d{8}$/.test(clean.replace(/[\s-]/g, ''));
      return isEmail || isPhone;
    }, 'Please enter a valid email or phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/dashboard';

  const { t, locale } = useTranslation();
  const toast = useToast();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setBranches = useBranchStore((s) => s.setBranches);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
      rememberMe: true,
    },
  });

  const handleSocialClick = (provider: string) => {
    toast.info(
      locale === 'bn'
        ? `${provider} সোশ্যাল লগইন ফিচার শীঘ্রই আসছে!`
        : `${provider} social login is coming soon!`,
    );
  };

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      // Direct login: identifies account purely by unique email or mobile number
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: values.identifier.trim(),
          password: values.password,
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

      // Populate Zustand store
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

      // Direct fresh browser redirect to avoid RSC chunk hydration mismatch
      window.location.href = redirectTarget;
    } catch (err: any) {
      setServerError(
        err?.message ||
          (locale === 'bn' ? 'সার্ভারে সংযোগ করা সম্ভব হচ্ছে না' : 'Unable to connect to the server.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] w-full flex items-center justify-center p-4 sm:p-6 sm:py-12 overflow-hidden bg-gradient-to-tr from-[#22d3ee] via-[#6366f1] to-[#ec4899] dark:from-[#083344] dark:via-[#1e1b4b] dark:to-[#4a044e]">
      {/* Background Soft Facets & Polygons matching reference image */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-300/40 rounded-full blur-3xl transform rotate-45" />
        <div
          className="absolute top-1/4 -left-16 w-80 h-80 bg-cyan-400/25 transform rotate-12"
          style={{ clipPath: 'polygon(0 0, 100% 0, 70% 100%, 0% 100%)' }}
        />
        <div className="absolute -bottom-28 -right-28 w-96 h-96 bg-fuchsia-400/40 rounded-full blur-3xl" />
        <div
          className="absolute top-1/3 -right-20 w-96 h-96 bg-purple-500/20 transform -rotate-12"
          style={{ clipPath: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)' }}
        />
      </div>

      {/* Main Centered Login Card */}
      <div className="relative z-10 w-full max-w-[430px] bg-white dark:bg-slate-900 rounded-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] p-8 sm:p-12 transition-all">
        {/* Title */}
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white text-center tracking-tight mb-8">
          Login
        </h1>

        {/* Server Error Alert */}
        {serverError && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{serverError}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {/* Username / Identifier Input */}
          <div className="space-y-1">
            <label
              htmlFor="identifier"
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 block"
            >
              Username
            </label>
            <div className="relative flex items-center border-b border-slate-300 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 transition-colors pb-1">
              <User className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                placeholder={
                  locale === 'bn' ? 'ইমেইল অথবা মোবাইল নাম্বার' : 'Type your username'
                }
                {...register('identifier')}
                className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none py-1.5"
              />
            </div>
            {errors.identifier && (
              <p className="text-[11px] text-rose-500 font-medium pt-1">
                {errors.identifier.message}
              </p>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label
              htmlFor="password"
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 block"
            >
              Password
            </label>
            <div className="relative flex items-center border-b border-slate-300 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 transition-colors pb-1">
              <Lock className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={locale === 'bn' ? 'পাসওয়ার্ড দিন' : 'Type your password'}
                {...register('password')}
                className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none py-1.5 pr-8"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-rose-500 font-medium pt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Forgot password */}
          <div className="flex justify-end pt-1">
            <Link
              href="/forgot-password"
              className="text-xs text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Gradient Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full font-bold text-sm tracking-wider uppercase text-white shadow-lg shadow-purple-500/25 bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#ec4899] hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{locale === 'bn' ? 'লগইন হচ্ছে...' : 'LOGGING IN...'}</span>
                </>
              ) : (
                'LOGIN'
              )}
            </button>
          </div>
        </form>

        {/* Social Icons Section */}
        <div className="pt-9 pb-2 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 font-normal">
            Or Sign Up Using
          </p>
          <div className="flex items-center justify-center gap-4">
            {/* Facebook */}
            <button
              type="button"
              onClick={() => handleSocialClick('Facebook')}
              className="w-10 h-10 rounded-full bg-[#1877F2] hover:bg-[#166fe5] flex items-center justify-center text-white shadow-sm hover:scale-110 active:scale-95 transition-all cursor-pointer"
              title="Continue with Facebook"
            >
              <FacebookIcon className="w-4 h-4" />
            </button>

            {/* Google / Gmail */}
            <button
              type="button"
              onClick={() => handleSocialClick('Google')}
              className="w-10 h-10 rounded-full bg-[#EA4335] hover:bg-[#d63a2c] flex items-center justify-center text-white shadow-sm hover:scale-110 active:scale-95 transition-all cursor-pointer"
              title="Continue with Gmail"
            >
              <GoogleIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Sign Up Link */}
        <div className="pt-8 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
          <p>Or Sign Up Using</p>
          <Link
            href="/register"
            className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors inline-block pt-1"
          >
            SIGN UP
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <p className="text-sm font-medium text-slate-500">Loading...</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
