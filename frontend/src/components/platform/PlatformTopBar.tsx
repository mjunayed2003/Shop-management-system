'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Menu,
  KeyRound,
  CheckCircle2,
  Loader2,
  LogOut,
  Search,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { usePlatformAuthStore } from '@/lib/store/platform-auth-store';
import { platformApi } from '@/lib/api/platform-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      toast.show('Please fill in both old and new password.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      toast.show('New password must be at least 8 characters.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await platformApi.auth.changePassword({ oldPassword, newPassword });
      toast.show('Platform password updated successfully.', 'success');
      setIsChangePassOpen(false);
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.show(err.message || 'Password update failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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

      {/* Right Controls: Search, Bell, Theme, User Profile (Foodpoint style) */}
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
            onClick={() => setIsChangePassOpen(true)}
            className="flex items-center gap-2.5 py-1 px-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer text-left"
            title="Account settings"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              {admin ? admin.firstName.charAt(0) : 'T'}
            </div>
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                {admin ? `${admin.firstName} ${admin.lastName}` : 'Thomas Harris'}
              </span>
              <span className="text-[10px] text-slate-400 block font-medium">
                {admin?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
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

      {/* Change Password Dialog */}
      <Dialog open={isChangePassOpen} onOpenChange={setIsChangePassOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl rounded-2xl p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Change Admin Password
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Update master credentials for {admin?.email}
              </DialogDescription>
            </div>
          </div>

          <form onSubmit={handleChangePassword}>
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold block mb-1.5 text-slate-700 dark:text-slate-300">Old Password</label>
                <Input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="h-10 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="font-bold block mb-1.5 text-slate-700 dark:text-slate-300">New Password (min 8 chars)</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter strong new password"
                  required
                  className="h-10 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex items-center justify-end gap-2.5 rounded-b-2xl">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsChangePassOpen(false)}
                className="h-9 px-4 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/25 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>Save New Password</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
