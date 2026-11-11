'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '@/lib/api/platform-client';
import { usePlatformAuthStore, PlatformRole } from '@/lib/store/platform-auth-store';
import { formatDate, formatDateTime } from '@/lib/utils/formatters';
import { useToast } from '@/components/feedback/ToastContext';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  Users,
  Shield,
  ShieldCheck,
  Plus,
  Edit2,
  Power,
  ShieldAlert,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Clock,
  KeyRound,
} from 'lucide-react';

export default function PlatformAdminsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const currentAdmin = usePlatformAuthStore((state) => state.admin);

  const isSuperAdmin = currentAdmin?.role === PlatformRole.SUPER_ADMIN;

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [toggleActiveTarget, setToggleActiveTarget] = useState<any | null>(null);
  const [changeRoleTarget, setChangeRoleTarget] = useState<any | null>(null);
  const [newSelectedRole, setNewSelectedRole] = useState<PlatformRole>(PlatformRole.PLATFORM_SUPPORT);

  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: PlatformRole.PLATFORM_SUPPORT,
  });

  // Query: Admins list
  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['platform-admins'],
    queryFn: () => platformApi.admins.list(),
    enabled: isSuperAdmin,
  });

  // Mutation: Create Admin
  const createMutation = useMutation({
    mutationFn: (payload: any) => platformApi.admins.create(payload),
    onSuccess: () => {
      showToast('New platform administrator created.', 'success');
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      setCreateModalOpen(false);
      setCreateForm({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        role: PlatformRole.PLATFORM_SUPPORT,
      });
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to create platform admin.', 'error');
    },
  });

  // Mutation: Update Admin (Active status / Role)
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      platformApi.admins.update(id, payload),
    onSuccess: () => {
      showToast('Admin profile updated.', 'success');
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      setToggleActiveTarget(null);
      setChangeRoleTarget(null);
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to update admin.', 'error');
    },
  });

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl">
        <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-100">Access Restricted</h2>
        <p className="text-slate-400 text-sm mt-1">
          Only <span className="text-orange-500 font-mono font-bold">SUPER_ADMIN</span> administrators can provision
          or configure platform administrator accounts.
        </p>
      </div>
    );
  }

  // Count active super admins to protect last one
  const activeSuperAdmins = admins.filter(
    (a: any) => a.is_active && a.role === PlatformRole.SUPER_ADMIN
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email.trim() || !createForm.password.trim() || !createForm.firstName.trim()) {
      showToast('Email, password, and first name are required.', 'error');
      return;
    }
    createMutation.mutate({
      email: createForm.email.trim().toLowerCase(),
      password: createForm.password,
      firstName: createForm.firstName.trim(),
      lastName: createForm.lastName.trim(),
      phone: createForm.phone.trim() || undefined,
      role: createForm.role,
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 dark:text-slate-100 font-sans pb-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Staff &amp; Admins
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Manage platform operator accounts, role boundaries, and access credentials.
            </p>
          </div>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="text-xs h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 cursor-pointer font-bold flex items-center gap-1.5 self-end sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Platform Admin</span>
        </Button>
      </div>

      {/* Rules Notice */}
      <Card className="bg-slate-50/70 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 border-l-4 border-l-orange-500 rounded-3xl shadow-sm shadow-slate-200/40 dark:shadow-none">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <p className="font-bold text-slate-900 dark:text-slate-100">Platform RBAC Safeguards</p>
            <p className="text-slate-500 dark:text-slate-400">
              Administrators cannot deactivate or demote their own active session. The last remaining{' '}
              <code className="text-orange-600 dark:text-orange-400 font-mono font-bold">SUPER_ADMIN</code> is permanently protected from deactivation.
            </p>
          </div>
        </div>
      </Card>

      {/* Admins Table */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-3xl shadow-sm shadow-slate-200/40 dark:shadow-none overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-950/60 text-slate-400 font-bold text-[11px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Admin Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Loading platform administrators from server...
                    </td>
                  </tr>
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No platform administrators found.
                    </td>
                  </tr>
                ) : (
                  admins.map((admin: any) => {
                    const isSelf = currentAdmin?.id === admin.id;
                    const isLastSuperAdmin =
                      admin.role === PlatformRole.SUPER_ADMIN &&
                      activeSuperAdmins.length <= 1 &&
                      admin.is_active;

                    return (
                      <tr key={admin.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                              {admin.first_name?.[0] || 'A'}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                {admin.first_name} {admin.last_name}
                                {isSelf && (
                                  <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-[10px] px-1 py-0 font-bold">
                                    You
                                  </Badge>
                                )}
                              </p>
                              {admin.phone && (
                                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {admin.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                          {admin.email}
                        </td>

                        <td className="py-3 px-4">
                          <Badge
                            className={
                              admin.role === PlatformRole.SUPER_ADMIN
                                ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 font-bold'
                                : admin.role === PlatformRole.BILLING_ADMIN
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-bold'
                                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold'
                            }
                          >
                            {admin.role}
                          </Badge>
                        </td>

                        <td className="py-3 px-4">
                          <Badge
                            variant={admin.is_active ? 'default' : 'secondary'}
                            className={
                              admin.is_active
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                            }
                          >
                            {admin.is_active ? 'Active' : 'Disabled'}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {admin.last_login_at ? formatDateTime(admin.last_login_at) : 'Never'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Role change button */}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isSelf || isLastSuperAdmin}
                              onClick={() => {
                                setChangeRoleTarget(admin);
                                setNewSelectedRole(admin.role);
                              }}
                              className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs h-7 px-2"
                              title={
                                isSelf
                                  ? 'You cannot alter your own role.'
                                  : isLastSuperAdmin
                                  ? 'Cannot demote the last remaining SUPER_ADMIN.'
                                  : 'Change Admin Role'
                              }
                            >
                              Role
                            </Button>

                            {/* Active toggle button */}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isSelf || (isLastSuperAdmin && admin.is_active)}
                              onClick={() => setToggleActiveTarget(admin)}
                              className={`text-xs h-7 px-2 bg-white dark:bg-slate-900 ${
                                admin.is_active
                                  ? 'border-rose-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                                  : 'border-emerald-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                              }`}
                              title={
                                isSelf
                                  ? 'You cannot disable your own account.'
                                  : isLastSuperAdmin && admin.is_active
                                  ? 'Cannot disable the last active SUPER_ADMIN.'
                                  : admin.is_active
                                  ? 'Disable account'
                                  : 'Enable account'
                              }
                            >
                              <Power className="w-3.5 h-3.5 mr-1" />
                              {admin.is_active ? 'Disable' : 'Enable'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CREATE ADMIN MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl rounded-3xl p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Create Platform Administrator
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                Provision a new internal platform operator account with defined role privileges.
              </DialogDescription>
            </div>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-3.5 px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Tanzim"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 mt-1 text-xs rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Last Name</label>
                <Input
                  placeholder="e.g. Ahmed"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 mt-1 text-xs rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <Input
                type="email"
                required
                placeholder="admin@shopmanagement.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 mt-1 text-xs rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Password <span className="text-rose-500">*</span>
              </label>
              <Input
                type="password"
                required
                placeholder="Minimum 8 characters..."
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 mt-1 text-xs rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone (Optional)</label>
              <Input
                placeholder="017XXXXXXXX"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 mt-1 text-xs font-mono rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Assigned Platform Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 cursor-pointer"
              >
                <option value={PlatformRole.PLATFORM_SUPPORT}>
                  PLATFORM_SUPPORT — Support tickets, business view & suspension
                </option>
                <option value={PlatformRole.BILLING_ADMIN}>
                  BILLING_ADMIN — Invoices, payments, revenue, overrides, plans
                </option>
                <option value={PlatformRole.SUPER_ADMIN}>
                  SUPER_ADMIN — Full system governance & administrator management
                </option>
              </select>
            </div>

            <DialogFooter className="px-6 py-3.5 -mx-6 -mb-4 mt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-end gap-2.5 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="h-9 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/25 cursor-pointer flex items-center gap-1.5"
              >
                {createMutation.isPending ? 'Provisioning...' : 'Provision Admin'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* TOGGLE ACTIVE STATUS CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(toggleActiveTarget)}
        onClose={() => setToggleActiveTarget(null)}
        onConfirm={() =>
          toggleActiveTarget &&
          updateMutation.mutate({
            id: toggleActiveTarget.id,
            payload: { isActive: !toggleActiveTarget.is_active },
          })
        }
        title={
          toggleActiveTarget?.is_active
            ? `Deactivate Admin: ${toggleActiveTarget?.first_name}`
            : `Reactivate Admin: ${toggleActiveTarget?.first_name}`
        }
        description={
          toggleActiveTarget?.is_active
            ? 'Disabling this administrator will revoke their credentials immediately. They will not be able to log in to the platform console.'
            : 'Enabling this administrator will restore their ability to log into the platform console with their existing password.'
        }
        confirmText={toggleActiveTarget?.is_active ? 'Disable Admin' : 'Enable Admin'}
        variant={toggleActiveTarget?.is_active ? 'destructive' : 'default'}
        isLoading={updateMutation.isPending}
      />

      {/* CHANGE ROLE DIALOG (Foodpoint Theme) */}
      <Dialog open={Boolean(changeRoleTarget)} onOpenChange={(open) => !open && setChangeRoleTarget(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl rounded-3xl p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Change Administrator Role
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                Update role privileges for {changeRoleTarget?.first_name} {changeRoleTarget?.last_name}.
              </DialogDescription>
            </div>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Select Platform Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={newSelectedRole}
                onChange={(e) => setNewSelectedRole(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 cursor-pointer font-medium"
              >
                <option value={PlatformRole.PLATFORM_SUPPORT}>
                  PLATFORM_SUPPORT — Merchant support & shop view
                </option>
                <option value={PlatformRole.BILLING_ADMIN}>
                  BILLING_ADMIN — Invoices, revenue, plans & overrides
                </option>
                <option value={PlatformRole.SUPER_ADMIN}>
                  SUPER_ADMIN — Full system oversight & security governance
                </option>
              </select>
            </div>

            <div className="p-3.5 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 text-xs text-orange-950 dark:text-orange-300 space-y-1">
              <span className="font-bold block text-[11px] text-orange-600 dark:text-orange-400">
                Security Policy Notice:
              </span>
              <p className="text-[11px] leading-relaxed text-orange-900/80 dark:text-orange-300">
                Role changes take effect upon the operator&apos;s next authenticated session. Revoking Super Admin role requires at least one active Super Admin to remain on the platform.
              </p>
            </div>

            <DialogFooter className="px-6 py-3.5 -mx-6 -mb-5 mt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-end gap-2.5 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setChangeRoleTarget(null)}
                className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updateMutation.isPending}
                onClick={() =>
                  changeRoleTarget &&
                  updateMutation.mutate({
                    id: changeRoleTarget.id,
                    payload: { role: newSelectedRole },
                  })
                }
                className="h-9 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/25 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Updating...' : 'Save Role'}
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
