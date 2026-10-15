'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { api } from '@/lib/api/endpoints';
import { FormFieldWrapper } from '@/components/shared/FormFieldWrapper';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { KeyRound, ArrowLeft, Mail, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const toast = useToast();

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg('ইমেইল বা ফোন নম্বর আবশ্যক');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await api.auth.forgotPassword(identifier.trim());
      toast.info('পাসওয়ার্ড রিসেট ওটিপি আপনার নম্বরে/ইমেইলে পাঠানো হয়েছে (অথবা ব্যাকএন্ড লগ দেখুন)');
      setStep('reset');
    } catch (err: any) {
      setErrorMsg(err.message || 'অনুরোধ সম্পন্ন করা যায়নি');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setErrorMsg('ওটিপি কোড দিন');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('পাসওয়ার্ড নিশ্চিতকরণ মিলছে না');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await api.auth.resetPassword({
        identifier: identifier.trim(),
        otp: otp.trim(),
        newPassword,
      });

      toast.success('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! নতুন পাসওয়ার্ড দিয়ে লগইন করুন।');
      router.push('/login');
    } catch (err: any) {
      setErrorMsg(err.message || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl animate-fadeIn">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {step === 'request' ? 'পাসওয়ার্ড পুনরুদ্ধার' : 'নতুন পাসওয়ার্ড সেট করুন'}
          </h1>
          <p className="text-xs text-slate-500">
            {step === 'request'
              ? 'আপনার নিবন্ধিত ইমেইল বা মোবাইল নম্বর দিন'
              : `ওটিপি কোড এবং নতুন পাসওয়ার্ড প্রদান করুন (${identifier})`}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <FormFieldWrapper label="ইমেইল অথবা মোবাইল নম্বর" required>
              <Input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="01XXXXXXXXX বা email@shop.com"
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />
            </FormFieldWrapper>

            <Button type="submit" className="w-full" isLoading={isLoading} disabled={isLoading}>
              ওটিপি পাঠান
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <FormFieldWrapper label="ওটিপি (OTP) কোড" required>
              <Input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="যেমন: 123456"
                required
              />
            </FormFieldWrapper>

            <FormFieldWrapper label="নতুন পাসওয়ার্ড" required>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />
            </FormFieldWrapper>

            <FormFieldWrapper label="পাসওয়ার্ড নিশ্চিত করুন" required>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="নতুন পাসওয়ার্ড আবার লিখুন"
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />
            </FormFieldWrapper>

            <Button type="submit" className="w-full" isLoading={isLoading} disabled={isLoading}>
              পাসওয়ার্ড রিসেট সম্পন্ন করুন
            </Button>
          </form>
        )}

        <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>লগইন পাতায় ফিরে যান</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
