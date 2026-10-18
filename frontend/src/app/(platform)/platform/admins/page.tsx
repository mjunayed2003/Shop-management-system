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
          Only <span className="text-indigo-400 font-mono">SUPER_ADMIN</span> administrators can provision
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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Platform Administrators
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Manage platform operator accounts, role boundaries, and access credentials.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Platform Admin
        </Button>
      </div>

      {/* Rules Notice */}
      <Card className="bg-slate-900 border-slate-800 p-4 border-l-4 border-l-indigo-500">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-slate-100">Platform RBAC Safeguards</p>
            <p className="text-slate-400">
              Administrators cannot deactivate or demote their own active session. The last remaining{' '}
              <code className="text-indigo-400 font-mono">SUPER_ADMIN</code> is permanently protected from deactivation.
            </p>
          </div>
        </div>
      </Card>

      {/* Admins Table */}
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Admin Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Loading platform administrators...
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
                      <tr key={admin.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs uppercase">
                              {admin.first_name?.[0] || 'A'}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-100 flex items-center gap-1.5">
                                {admin.first_name} {admin.last_name}
                                {isSelf && (
                                  <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] px-1 py-0">
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

                        <td className="py-3 px-4 font-mono text-xs text-slate-300">
                          {admin.email}
                        </td>

                        <td className="py-3 px-4">
                          <Badge
                            className={
                              admin.role === PlatformRole.SUPER_ADMIN
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                                : admin.role === PlatformRole.BILLING_ADMIN
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-300'
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
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }
                          >
                            {admin.is_active ? 'Active' : 'Disabled'}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-xs text-slate-400 font-mono">
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
                              className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs h-7 px-2"
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
                              className={`text-xs h-7 px-2 ${
                                admin.is_active
                                  ? 'border-slate-800 text-rose-400 hover:bg-rose-950/20'
                                  : 'border-slate-800 text-emerald-400 hover:bg-emerald-950/20'
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
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-400">
              <Users className="w-5 h-5" />
              Create Platform Administrator
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Provision a new internal platform operator account with defined role privileges.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-3.5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300">
                  First Name <span className="text-rose-400">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Tanzim"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-100 mt-1 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">Last Name</label>
                <Input
                  placeholder="e.g. Ahmed"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-slate-100 mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">
                Email Address <span className="text-rose-400">*</span>
              </label>
              <Input
                type="email"
                required
                placeholder="admin@shopmanagement.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="bg-slate-950 border-slate-800 text-slate-100 mt-1 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">
                Password <span className="text-rose-400">*</span>
              </label>
              <Input
                type="password"
                required
                placeholder="Minimum 8 characters..."
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="bg-slate-950 border-slate-800 text-slate-100 mt-1 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">Phone (Optional)</label>
              <Input
                placeholder="017XXXXXXXX"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                className="bg-slate-950 border-slate-800 text-slate-100 mt-1 text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">
                Assigned Platform Role <span className="text-rose-400">*</span>
              </label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-md py-2 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                className="border-slate-800 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {createMutation.isPending ? 'Provisioning...' : 'Provision Admin'}
              </Button>
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

      {/* CHANGE ROLE DIALOG */}
      <Dialog open={Boolean(changeRoleTarget)} onOpenChange={(open) => !open && setChangeRoleTarget(null)}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-400">
              <Shield className="w-5 h-5" />
              Change Administrator Role
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Update role privileges for {changeRoleTarget?.first_name} {changeRoleTarget?.last_name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-slate-300">Select Role</label>
              <select
                value={newSelectedRole}
                onChange={(e) => setNewSelectedRole(e.target.value as any)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-md py-2 px-3 text-xs text-slate-200 focus:outline-none"
              >
                <option value={PlatformRole.PLATFORM_SUPPORT}>PLATFORM_SUPPORT</option>
                <option value={PlatformRole.BILLING_ADMIN}>BILLING_ADMIN</option>
                <option value={PlatformRole.SUPER_ADMIN}>SUPER_ADMIN</option>
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setChangeRoleTarget(null)}
                className="border-slate-800 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={updateMutation.isPending}
                onClick={() =>
                  changeRoleTarget &&
                  updateMutation.mutate({
                    id: changeRoleTarget.id,
                    payload: { role: newSelectedRole },
                  })
                }
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {updateMutation.isPending ? 'Updating...' : 'Save Role'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
