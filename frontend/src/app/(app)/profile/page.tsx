'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/auth-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { api, UserSessionDto } from '@/lib/api/endpoints';
import { normalizeBDPhone, isValidBDPhone } from '@/lib/utils/phone';

import { FormFieldWrapper } from '@/components/shared/FormFieldWrapper';
import { PhoneInput } from '@/components/shared/PhoneInput';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { formatDate, formatDateTime } from '@/lib/utils/formatters';

import {
  User,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Laptop,
  Globe,
  Trash2,
  LogOut,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';

export default function ProfilePage() {
  const { t, locale } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { user, business, permissions, updateUserProfile } = useAuthStore();

  // Profile Form State
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  // Logout All Confirmation State
  const [isLogoutAllOpen, setIsLogoutAllOpen] = useState(false);

  // Fetch Active Sessions
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.auth.getSessions(),
  });

  // Fetch Permissions Grouping to display clean names
  const { data: permissionGroups = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => api.roles.listPermissions(),
  });

  // Profile Update Mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: { firstName: string; lastName: string; email: string; phone: string }) =>
      api.auth.updateProfile(data),
    onSuccess: (res) => {
      updateUserProfile({
        firstName: res.user.firstName,
        lastName: res.user.lastName,
        email: res.user.email,
        phone: res.user.phone,
      });
      toast.success(t('profile.updateSuccess'));
      setProfileMsg(locale === 'bn' ? 'প্রোফাইল তথ্য সফলভাবে সংরক্ষিত হয়েছে।' : 'Profile information updated successfully.');
    },
    onError: (err: any) => {
      setProfileMsg(err.message || (locale === 'bn' ? 'প্রোফাইল আপডেট করা যায়নি' : 'Failed to update profile'));
    },
  });

  // Password Mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { oldPassword: string; newPassword: string }) =>
      api.auth.changePassword(data),
    onSuccess: () => {
      toast.success(t('profile.passwordChangeSuccess'));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwdMsg(locale === 'bn' ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।' : 'Password changed successfully.');
    },
    onError: (err: any) => {
      setPwdMsg(err.message || (locale === 'bn' ? 'পাসওয়ার্ড পরিবর্তন করা যায়নি' : 'Failed to change password'));
    },
  });

  // Revoke Session Mutation
  const revokeSessionMutation = useMutation({
    mutationFn: (id: string) => api.auth.revokeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(locale === 'bn' ? 'সেশন সফলভাবে বাতিল করা হয়েছে' : 'Session revoked successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || (locale === 'bn' ? 'সেশন বাতিল করা সম্ভব হয়নি' : 'Failed to revoke session'));
    },
  });

  // Logout All Devices Mutation
  const logoutAllMutation = useMutation({
    mutationFn: () => api.auth.logoutAllDevices(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(t('profile.allRevokedSuccess'));
      setIsLogoutAllOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || (locale === 'bn' ? 'অনুরোধ ব্যর্থ হয়েছে' : 'Request failed'));
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);

    if (!isValidBDPhone(phone)) {
      setProfileMsg(locale === 'bn' ? 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন' : 'Enter a valid 11-digit phone number');
      return;
    }

    updateProfileMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: normalizeBDPhone(phone),
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (newPassword.length < 6) {
      setPwdMsg(locale === 'bn' ? 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdMsg(locale === 'bn' ? 'নতুন পাসওয়ার্ড নিশ্চিতকরণ মিলছে না' : 'Password confirmation does not match');
      return;
    }

    changePasswordMutation.mutate({
      oldPassword,
      newPassword,
    });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Title */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
          <User className="w-6 h-6 text-sky-600" />
          <span>{t('profile.title')}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('profile.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Card 1: Personal Information Form */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <User className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t('profile.personalInfo')}
            </h2>
          </div>

          {profileMsg && (
            <p className="text-xs font-medium p-3 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800">
              {profileMsg}
            </p>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormFieldWrapper label={t('register.firstName')} required>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </FormFieldWrapper>
              <FormFieldWrapper label={t('register.lastName')} required>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </FormFieldWrapper>
            </div>

            <FormFieldWrapper label={t('users.phone')} required>
              <PhoneInput
                value={phone}
                onChange={setPhone}
              />
            </FormFieldWrapper>

            <FormFieldWrapper label={t('users.email')} required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormFieldWrapper>

            <div className="pt-2">
              <Button
                type="submit"
                isLoading={updateProfileMutation.isPending}
                disabled={updateProfileMutation.isPending}
              >
                {t('profile.updateProfileBtn')}
              </Button>
            </div>
          </form>
        </div>

        {/* Card 2: Change Password Form */}
        <div id="password" className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <KeyRound className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t('profile.changePassword')}
            </h2>
          </div>

          {pwdMsg && (
            <p className="text-xs font-medium p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              {pwdMsg}
            </p>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <FormFieldWrapper label={t('profile.oldPassword')} required>
              <Input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </FormFieldWrapper>

            <FormFieldWrapper label={t('profile.newPassword')} required>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={locale === 'bn' ? 'কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড' : 'At least 6 characters'}
                required
              />
            </FormFieldWrapper>

            <FormFieldWrapper label={t('profile.confirmNewPassword')} required>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={locale === 'bn' ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm new password'}
                required
              />
            </FormFieldWrapper>

            <div className="pt-2">
              <Button
                type="submit"
                variant="outline"
                isLoading={changePasswordMutation.isPending}
                disabled={changePasswordMutation.isPending}
              >
                {t('profile.changePasswordBtn')}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Card 3: Read-only "My permissions" section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('profile.myPermissions')}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={user?.isOwner ? 'warning' : 'info'}>
              {user?.isOwner ? (locale === 'bn' ? 'মালিক (Owner)' : 'Store Owner') : user?.role?.name}
            </Badge>
          </div>
        </div>

        {user?.isOwner ? (
          <div className="p-4 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30 border border-sky-200 dark:border-sky-800 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-sky-600 shrink-0" />
            <p className="text-xs sm:text-sm text-sky-900 dark:text-sky-100 font-medium leading-relaxed">
              {locale === 'bn'
                ? 'আপনি এই প্রতিষ্ঠানের প্রধান মালিক (Owner)। আপনার অ্যাকাউন্টে সমস্ত মডিউল, শাখা, সেটিংস এবং আর্থিক প্রতিবেদনের ওপর পূর্ণাঙ্গ সুপার-অ্যাডমিন অনুমোদন (*) সক্রিয় রয়েছে।'
                : 'You are the primary Owner of this store. Full super-admin privileges (*) across all modules, branches, settings, and financial reports are active on your account.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              {locale === 'bn' ? (
                <>আপনার রোলে ({user?.role?.name}) মোট <strong>{permissions.length}</strong> টি অনুমতি বরাদ্দ রয়েছে:</>
              ) : (
                <>Your role ({user?.role?.name}) has <strong>{permissions.length}</strong> permissions assigned:</>
              )}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {permissions.map((permCode) => (
                <div
                  key={permCode}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="font-mono text-[11px] truncate">{permCode}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Card 4: Active Sessions List */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Laptop className="w-4 h-4 text-sky-600" />
              <span>{t('profile.activeSessions')}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('profile.sessionsDesc')}</p>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsLogoutAllOpen(true)}
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            {t('profile.logoutAllDevices')}
          </Button>
        </div>

        {isLoadingSessions ? (
          <TableSkeleton rows={3} cols={4} />
        ) : sessions.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            {locale === 'bn' ? 'কোন সক্রিয় সেশন পাওয়া যায়নি' : 'No active sessions found'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">{t('profile.deviceInfo')}</th>
                  <th className="py-2.5 px-3">{t('profile.ipAddress')}</th>
                  <th className="py-2.5 px-3">{t('profile.loginTime')}</th>
                  <th className="py-2.5 px-3 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sessions.map((sess, idx) => (
                  <tr key={sess.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        {sess.user_agent?.toLowerCase().includes('mobile') ? (
                          <Smartphone className="w-4 h-4 text-slate-400" />
                        ) : (
                          <Laptop className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="truncate max-w-xs">{sess.user_agent || 'Unknown Device'}</span>
                        {idx === 0 && (
                          <Badge variant="success" size="sm">
                            {t('profile.currentSession')}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">{sess.ip_address || '127.0.0.1'}</td>
                    <td className="py-3 px-3 text-slate-500">{formatDateTime(sess.created_at, locale)}</td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeSessionMutation.mutate(sess.id)}
                        disabled={revokeSessionMutation.isPending}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        <span>{t('profile.revokeSession')}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Logout All Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isLogoutAllOpen}
        onClose={() => setIsLogoutAllOpen(false)}
        onConfirm={() => logoutAllMutation.mutate()}
        title={locale === 'bn' ? 'সব ডিভাইস থেকে লগআউট নিশ্চিতকরণ' : 'Confirm Logout From All Devices'}
        description={locale === 'bn'
          ? 'আপনি কি নিশ্চিত যে আপনার সমস্ত সক্রিয় ব্রাউজার ও ডিভাইসের সেশন বাতিল করতে চান? এরপর সব ডিভাইসে পুনরায় পাসওয়ার্ড দিয়ে লগইন করতে হবে।'
          : 'Are you sure you want to terminate all active sessions across all devices? You will need to log in again on each device.'}
        confirmText={t('profile.logoutAllDevices')}
        variant="danger"
        isLoading={logoutAllMutation.isPending}
      />
        confirmText={t('profile.logoutAllDevices')}
        variant="danger"
        isLoading={logoutAllMutation.isPending}
      />
    </div>
  );
}
