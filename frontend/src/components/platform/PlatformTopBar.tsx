'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Menu,
  KeyRound,
  CheckCircle2,
  Loader2,
  LogOut,
  Search,
  Bell,
  User,
  Shield,
  Mail,
  Phone,
  Calendar,
  Clock,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { usePlatformAuthStore, PlatformRole } from '@/lib/store/platform-auth-store';
import { platformApi } from '@/lib/api/platform-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/components/feedback/ToastContext';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { resetPlatformSessionCache } from './PlatformProtectedRoute';

export function PlatformTopBar({ onOpenMobileSidebar }: { onOpenMobileSidebar: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, clearPlatformAuth } = usePlatformAuthStore();
  const toast = useToast();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'security'>('details');

  // Password form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch full and fresh admin profile when modal opens
  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ['platform', 'auth', 'me'],
    queryFn: () => platformApi.auth.getMe(),
    enabled: isProfileOpen,
  });

  const currentAdmin = profileData || admin;

  const getPageTitle = () => {
    if (pathname.includes('/businesses')) return 'Businesses';
    if (pathname.includes('/invoices')) return 'Transactions & Revenue';
    if (pathname.includes('/support')) return 'Support Desk';
    if (pathname.includes('/plans')) return 'Subscription Plans';
    if (pathname.includes('/settings')) return 'System Settings';
    if (pathname.includes('/admins')) return 'Staff & Admins';
    if (pathname.includes('/audit-logs')) return 'Audit Trail';
    return 'Dashboard';
  };

  const handleLogout = () => {
    resetPlatformSessionCache();
    clearPlatformAuth();
    toast.show('প্ল্যাটফর্ম অ্যাডমিন লগআউট সফল হয়েছে', 'success');
    router.replace('/platform/login');
  };

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.show('Copied to clipboard', 'info');
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      toast.show('Please fill in both current and new password.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      toast.show('New password must be at least 8 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.show('New password and confirm password do not match.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await platformApi.auth.changePassword({ oldPassword, newPassword });
      toast.show('Password updated successfully.', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveTab('details');
    } catch (err: any) {
      toast.show(err.message || 'Password update failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-400 dark:border-orange-800">
            <ShieldCheck className="w-3 h-3 shrink-0" />
            <span>Super Admin</span>
          </span>
        );
      case 'BILLING_ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800">
            <Shield className="w-3 h-3 shrink-0" />
            <span>Billing Admin</span>
          </span>
        );
      case 'PLATFORM_SUPPORT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800">
            <Shield className="w-3 h-3 shrink-0" />
            <span>Platform Support</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span>Admin</span>
          </span>
        );
    }
  };

  return (
    <>
      <header className="h-16 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-sans tracking-tight">
            {getPageTitle()}
          </h2>
        </div>

        {/* Right Controls: Search, Bell, Theme, User Profile */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Search Bar pill */}
          <div className="relative hidden md:block w-56 lg:w-64">
            <Input
              type="text"
              placeholder="Search here..."
              className="h-9 pl-9 pr-4 text-xs rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
          </div>

          {/* Notifications Icon Button */}
          <button
            type="button"
            className="relative w-9 h-9 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer shadow-2xs"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white dark:ring-slate-900"></span>
          </button>

          <ThemeToggle />

          {/* Profile / Admin Dropdown Pill */}
          <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('details');
                setIsProfileOpen(true);
              }}
              className="flex items-center gap-2.5 py-1 px-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer text-left group"
              title="Click to view Admin Details & Settings"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                {currentAdmin?.firstName ? currentAdmin.firstName.charAt(0).toUpperCase() : 'P'}
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight group-hover:text-orange-500 transition-colors">
                  {currentAdmin ? `${currentAdmin.firstName} ${currentAdmin.lastName}` : 'Platform Admin'}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">
                  {currentAdmin?.role === 'SUPER_ADMIN' ? 'Super Admin' : currentAdmin?.role === 'BILLING_ADMIN' ? 'Billing Admin' : 'Admin'}
                </span>
              </div>
            </button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="h-8 px-2.5 rounded-lg border-slate-200 dark:border-slate-800 hover:border-rose-300 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 bg-white dark:bg-slate-900 shadow-2xs font-semibold cursor-pointer"
              title="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Admin Profile & Password Modal */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl rounded-3xl p-0">
          {/* Modal Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-slate-50/80 to-transparent dark:from-slate-800/40 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-orange-500/25 shrink-0">
                {currentAdmin?.firstName ? currentAdmin.firstName.charAt(0).toUpperCase() : 'P'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">
                    {currentAdmin ? `${currentAdmin.firstName} ${currentAdmin.lastName}` : 'Platform Admin'}
                  </h3>
                  {getRoleBadge(currentAdmin?.role)}
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {currentAdmin?.email || 'admin@pos.com'}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Active Master Console Session
                  </span>
                </div>
              </div>
            </div>

            {/* Tab Pills */}
            <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/70">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'details'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Admin Details</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'security'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Change Password</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Profile Details */}
          {activeTab === 'details' && (
            <div className="p-6 space-y-4">
              {isProfileLoading && !profileData ? (
                <div className="py-8 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                  <p className="text-xs">Loading profile telemetry...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Full Name */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Full Name
                      </span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {currentAdmin?.firstName} {currentAdmin?.lastName}
                      </p>
                    </div>

                    {/* Email */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Email Address
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(currentAdmin?.email || '', 'email')}
                          className="text-slate-400 hover:text-orange-500 transition-colors"
                          title="Copy Email"
                        >
                          {copiedKey === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5 font-mono">
                        {currentAdmin?.email}
                      </p>
                    </div>

                    {/* Phone */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Phone Contact
                      </span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                        {currentAdmin?.phone || 'Not configured'}
                      </p>
                    </div>

                    {/* Assigned Role */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Assigned Role
                      </span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {currentAdmin?.role}
                      </p>
                    </div>

                    {/* Created Date */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Account Created
                      </span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {currentAdmin?.createdAt
                          ? new Date(currentAdmin.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'System Provisioned'}
                      </p>
                    </div>

                    {/* Last Login */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Last Active Session
                      </span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {currentAdmin?.lastLoginAt
                          ? new Date(currentAdmin.lastLoginAt).toLocaleString('en-US', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Live Active'}
                      </p>
                    </div>
                  </div>

                  {/* Admin ID Strip with Copy */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Operator UUID
                      </span>
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-300 truncate block">
                        {currentAdmin?.id || 'master-console-operator'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(currentAdmin?.id || '', 'id')}
                      className="h-7 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-orange-500 hover:border-orange-500 text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                    >
                      {copiedKey === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'id' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* Governance Privileges Notice */}
                  <div className="p-3.5 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 text-xs text-orange-950 dark:text-orange-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" />
                      <span>Administrative Governance Scope:</span>
                    </div>
                    <p className="text-[11px] text-orange-900/80 dark:text-orange-400">
                      {currentAdmin?.role === 'SUPER_ADMIN'
                        ? 'Full system oversight, tenant suspension controls, billing adjustments, and master configuration access.'
                        : currentAdmin?.role === 'BILLING_ADMIN'
                        ? 'Subscription invoice registry, payments verification, and price override capabilities.'
                        : 'Merchant support ticket management, shop view, and inquiry resolution.'}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="h-9 px-4 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('security')}
                      className="h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/25 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Change Password</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab 2: Change Password Form */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword}>
              <div className="p-6 space-y-4 text-xs">
                {/* Security hint */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                  Password changes take effect immediately across all active sessions. Ensure your new password contains at least 8 characters.
                </div>

                {/* Old Password */}
                <div>
                  <label className="font-bold block mb-1.5 text-slate-700 dark:text-slate-300">
                    Current Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showOldPass ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                      className="h-10 pr-9 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPass(!showOldPass)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="font-bold block mb-1.5 text-slate-700 dark:text-slate-300">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      required
                      className="h-10 pr-9 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="font-bold block mb-1.5 text-slate-700 dark:text-slate-300">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      className="h-10 pr-9 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[11px] text-rose-500 mt-1 font-semibold">
                      Passwords do not match.
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex items-center justify-end gap-2.5 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs cursor-pointer"
                >
                  Back to Details
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !oldPassword || !newPassword || newPassword !== confirmPassword}
                  className="h-9 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>Save New Password</span>
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
