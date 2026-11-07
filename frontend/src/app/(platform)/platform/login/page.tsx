'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePlatformAuthStore } from '@/lib/store/platform-auth-store';
import { platformApi } from '@/lib/api/platform-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Mail, AlertCircle, Loader2, Eye, EyeOff, Sparkles, Check } from 'lucide-react';

function PlatformLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setPlatformAuth, isAuthenticated } = usePlatformAuthStore();

  const [email, setEmail] = useState('admin@pos.com');
  const [password, setPassword] = useState('SuperAdmin123!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated as platform admin, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/platform/dashboard');
    }
  }, [isAuthenticated, router]);

  const reason = searchParams.get('reason');

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('SuperAdmin123!');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await platformApi.auth.login({
        email: email.trim(),
        password,
      });

      setPlatformAuth({
        accessToken: res.accessToken,
        admin: res.admin,
      });

      router.replace('/platform/dashboard');
    } catch (err: any) {
      setError(
        err?.message ||
          'লগইন ব্যর্থ হয়েছে। দয়া করে সঠিক ইমেইল ও পাসওয়ার্ড প্রদান করুন অথবা ব্যাকএন্ড সার্ভার চালু আছে কিনা নিশ্চিত করুন।'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4 antialiased text-slate-800 dark:text-slate-100 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-2xl shadow-orange-500/10 space-y-6 animate-fadeIn">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-orange-500/25">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Platform Administration
          </h1>
          <div className="inline-flex">
            <Badge className="bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full">
              Master Console Login
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            SaaS সেন্ট্রাল প্ল্যাটফর্ম অ্যাডমিনিস্ট্রেশন ও সাপোর্ট প্যানেল
          </p>
        </div>

        {/* Quick Demo Credentials Autofill */}
        <div className="p-3 bg-orange-50/50 dark:bg-orange-950/20 rounded-2xl border border-orange-100 dark:border-orange-900/40 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-950 dark:text-orange-200">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>ক্লিক করে ডেমো অ্যাকাউন্ট ফিল করুন:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => fillDemo('admin@pos.com')}
              className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                email === 'admin@pos.com'
                  ? 'bg-orange-500 text-white border-orange-500 shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 border-orange-200 dark:border-slate-700 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-slate-700'
              }`}
            >
              admin@pos.com
            </button>
            <button
              type="button"
              onClick={() => fillDemo('admin@shop-platform.com')}
              className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                email === 'admin@shop-platform.com'
                  ? 'bg-orange-500 text-white border-orange-500 shadow-sm font-bold'
                  : 'bg-white dark:bg-slate-800 border-orange-200 dark:border-slate-700 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-slate-700'
              }`}
            >
              admin@shop-platform.com
            </button>
          </div>
        </div>

        {/* Notices */}
        {reason === 'idle_timeout' && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Session expired due to 15 minutes of inactivity. Please log in again.</span>
          </div>
        )}

        {reason === 'session_expired' && (
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Your session has expired. Please log in again.</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pos.com"
                required
                className="pl-9 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-950 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="pl-9 pr-9 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-950 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 mt-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            <span>Sign In to Platform</span>
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-center space-y-1.5">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            দোকানদার বা শোরুম ক্যাশিয়ার লগইন করতে চান?{' '}
            <a href="/login" className="text-orange-600 dark:text-orange-400 hover:underline font-bold">
              দোকান লগইন (Store Login)
            </a>
          </p>
          <p className="text-[10px] text-slate-400">
            নতুন দোকান রেজিস্টার করতে:{' '}
            <a href="/register" className="text-slate-600 dark:text-slate-300 hover:underline font-semibold">
              রেজিস্ট্রেশন পেইজ
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PlatformLoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
        </div>
      }
    >
      <PlatformLoginForm />
    </React.Suspense>
  );
}
