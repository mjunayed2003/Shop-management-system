'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePlatformAuthStore } from '@/lib/store/platform-auth-store';
import { platformApi } from '@/lib/api/platform-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

function PlatformLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setPlatformAuth, isAuthenticated } = usePlatformAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated as platform admin, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/platform/dashboard');
    }
  }, [isAuthenticated, router]);

  const reason = searchParams.get('reason');

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
      setError(err?.message || 'Invalid credentials or inactive account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 antialiased text-slate-100 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-indigo-950/40 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/25">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">Platform Administration</h1>
          <Badge className="bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-bold text-[10px] tracking-wider uppercase">
            Master Console Login
          </Badge>
          <p className="text-xs text-slate-400">
            Restricted access for platform administrators and support operators only.
          </p>
        </div>

        {/* Notices */}
        {reason === 'idle_timeout' && (
          <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Session expired due to 15 minutes of inactivity. Please log in again.</span>
          </div>
        )}

        {reason === 'session_expired' && (
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Your session has expired. Please log in again.</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold block mb-1 text-slate-300">Admin Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@shop-platform.com"
                required
                className="pl-9 h-10 text-xs rounded-xl bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-1 text-slate-300">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="pl-9 h-10 text-xs rounded-xl bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-indigo-500"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            <span>Sign In to Platform</span>
          </Button>
        </form>

        <div className="pt-2 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500">
            Looking for store checkout?{' '}
            <a href="/login" className="text-indigo-400 hover:underline font-semibold">
              Go to Tenant POS Login
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
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      }
    >
      <PlatformLoginForm />
    </React.Suspense>
  );
}
