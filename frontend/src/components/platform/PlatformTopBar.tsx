'use client';

import React, { useState } from 'react';
import { Menu, Shield, KeyRound, CheckCircle2, Loader2 } from 'lucide-react';
import { usePlatformAuthStore } from '@/lib/store/platform-auth-store';
import { platformApi } from '@/lib/api/platform-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/feedback/ToastContext';

export function PlatformTopBar({ onOpenMobileSidebar }: { onOpenMobileSidebar: () => void }) {
  const { admin } = usePlatformAuthStore();
  const toast = useToast();

  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Badge className="bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-black text-[10px] tracking-wider uppercase">
            Platform Master Console
          </Badge>
          <span className="hidden sm:inline text-xs text-slate-400 font-medium">
            Cross-Tenant Governance
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsChangePassOpen(true)}
          className="text-xs text-slate-300 hover:text-white hover:bg-slate-900 h-8 px-2.5 rounded-lg flex items-center gap-1.5"
        >
          <KeyRound className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Change Password</span>
        </Button>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={isChangePassOpen} onOpenChange={setIsChangePassOpen}>
        <DialogContent className="max-w-sm p-6 space-y-4 rounded-3xl bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-400" />
              <span>Change Admin Password</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Update credentials for {admin?.email}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold block mb-1 text-slate-300">Current Password</label>
              <Input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="h-9 text-xs rounded-xl bg-slate-950 border-slate-800 text-white"
                required
              />
            </div>

            <div>
              <label className="font-semibold block mb-1 text-slate-300">New Password (min 8 chars)</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-9 text-xs rounded-xl bg-slate-950 border-slate-800 text-white"
                required
              />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsChangePassOpen(false)}
                className="text-xs h-9 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="text-xs h-9 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
