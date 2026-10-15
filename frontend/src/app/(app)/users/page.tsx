'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, UserDto } from '@/lib/api/endpoints';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore, Branch } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { generateIdempotencyKey } from '@/lib/utils/idempotency';
import { normalizeBDPhone, isValidBDPhone } from '@/lib/utils/phone';

import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FormFieldWrapper } from '@/components/shared/FormFieldWrapper';
import { PhoneInput } from '@/components/shared/PhoneInput';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PlanLimitDialog } from '@/components/feedback/PlanLimitDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import {
  Users,
  Plus,
  Edit2,
  KeyRound,
  UserCheck,
  UserX,
  Store,
  ShieldCheck,
  X,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function UsersPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  // Filters State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [filterRoleId, setFilterRoleId] = useState<string>('');
  const [filterBranchId, setFilterBranchId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Fetch Users
  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ['users', { page, limit, search, roleId: filterRoleId, branchId: filterBranchId, isActive: filterStatus }],
    queryFn: () =>
      api.users.list({
        page,
        limit,
        search: search || undefined,
        roleId: filterRoleId || undefined,
        branchId: filterBranchId || undefined,
        isActive: filterStatus === 'active' ? true : filterStatus === 'inactive' ? false : undefined,
      }),
  });

  // Fetch Roles for selector
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.roles.list(),
  });

  // Fetch Branches for selector
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.branches.list(false),
  });

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);

  // User Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [selectedBranches, setSelectedBranches] = useState<{ branchId: string; isDefault: boolean }[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Status Change Dialog State
  const [statusDialogUser, setStatusDialogUser] = useState<UserDto | null>(null);

  // Reset Password Dialog State
  const [resetPwdUser, setResetPwdUser] = useState<UserDto | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Plan Limit Dialog
  const [planLimitReachedError, setPlanLimitReachedError] = useState<string | null>(null);

  // Form Idempotency Key (generated once per form open, reused on retry)
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => api.users.create(payload, { idempotencyKey }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('users.createSuccess'));
      handleCloseForm();
    },
    onError: (err: any) => {
      if (err.name === 'PlanLimitReachedError') {
        setPlanLimitReachedError(err.message);
      } else {
        setFormError(err.message || 'কর্মী যোগ করা সম্ভব হয়নি');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => api.users.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('users.updateSuccess'));
      handleCloseForm();
    },
    onError: (err: any) => {
      setFormError(err.message || 'কর্মী তথ্য আপডেট করা যায়নি');
    },
  });

  const updateBranchesMutation = useMutation({
    mutationFn: ({ id, branches }: { id: string; branches: { branchId: string; isDefault: boolean }[] }) =>
      api.users.updateBranches(id, branches),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.users.updateStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('users.statusChangeSuccess'));
      setStatusDialogUser(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'অবস্থা পরিবর্তন করা সম্ভব হয়নি');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, pwd }: { id: string; pwd: string }) =>
      api.users.resetPassword(id, pwd),
    onSuccess: () => {
      toast.success('পাসওয়ার্ড রিসেট সফল হয়েছে। কর্মী নতুন পাসওয়ার্ডে লগইন করবেন।');
      setResetPwdUser(null);
      setNewPassword('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে');
    },
  });

  // Open Create
  const handleOpenCreate = () => {
    setEditingUser(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRoleId(roles[0]?.id || '');

    // Default to selecting first branch
    if (branches.length > 0) {
      setSelectedBranches([{ branchId: branches[0].id, isDefault: true }]);
    } else {
      setSelectedBranches([]);
    }

    setFormError(null);
    setIdempotencyKey(generateIdempotencyKey());
    setIsFormOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (user: UserDto) => {
    setEditingUser(user);
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
    setPhone(user.phone);
    setPassword('');
    setRoleId(user.role.id);

    setSelectedBranches(
      user.branches.map((b) => ({
        branchId: b.id,
        isDefault: b.isDefault,
      })),
    );

    setFormError(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
    setFormError(null);
  };

  // Branch Access Editor Toggles
  const handleToggleBranch = (branchId: string) => {
    const exists = selectedBranches.some((b) => b.branchId === branchId);
    let next = [...selectedBranches];

    if (exists) {
      next = next.filter((b) => b.branchId !== branchId);
      // If we removed the default branch, assign default to first remaining
      if (next.length > 0 && !next.some((b) => b.isDefault)) {
        next[0].isDefault = true;
      }
    } else {
      // Add new branch
      const isDefault = next.length === 0;
      next.push({ branchId, isDefault });
    }

    setSelectedBranches(next);
  };

  const handleSetDefaultBranch = (branchId: string) => {
    const next = selectedBranches.map((b) => ({
      ...b,
      isDefault: b.branchId === branchId,
    }));
    setSelectedBranches(next);
  };

  // Submit User
  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // CRITICAL REQUIREMENT: The UI must prevent saving a user with zero branches!
    if (selectedBranches.length === 0) {
      setFormError(t('users.zeroBranchesError'));
      return;
    }

    if (!isValidBDPhone(phone)) {
      setFormError('সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)');
      return;
    }

    const cleanPhone = normalizeBDPhone(phone);

    if (editingUser) {
      updateMutation.mutate(
        {
          id: editingUser.id,
          payload: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim().toLowerCase(),
            phone: cleanPhone,
            roleId,
          },
        },
        {
          onSuccess: () => {
            // Also update branches if changed
            updateBranchesMutation.mutate({
              id: editingUser.id,
              branches: selectedBranches,
            });
          },
        },
      );
    } else {
      if (!password || password.length < 6) {
        setFormError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
        return;
      }

      createMutation.mutate({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        password,
        roleId,
        branches: selectedBranches,
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Table Columns Definition
  const columns: Column<UserDto>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('users.name'),
        render: (user) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{user.fullName}</span>
                {user.isOwner && (
                  <Badge variant="warning" size="sm">
                    মালিক (Owner)
                  </Badge>
                )}
              </p>
              <p className="text-xs text-slate-500 font-mono">{user.email}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'phone',
        header: t('users.phone'),
        render: (user) => <span className="font-mono text-xs">{user.phone}</span>,
      },
      {
        key: 'role',
        header: t('users.role'),
        render: (user) => (
          <Badge variant={user.role.isSystem ? 'default' : 'info'} size="sm">
            <ShieldCheck className="w-3 h-3" />
            <span>{user.role.name}</span>
          </Badge>
        ),
      },
      {
        key: 'branches',
        header: t('users.branches'),
        render: (user) => (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {user.branches.map((b) => (
              <span
                key={b.id}
                className={`text-[11px] px-2 py-0.5 rounded-full border ${
                  b.isDefault
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 font-semibold'
                    : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200'
                }`}
                title={b.isDefault ? 'ডিফল্ট শাখা' : undefined}
              >
                {b.name} {b.isDefault && '★'}
              </span>
            ))}
          </div>
        ),
      },
      {
        key: 'status',
        header: t('status'),
        render: (user) => <StatusBadge status={user.isActive} />,
      },
      {
        key: 'actions',
        header: t('actions'),
        headerClassName: 'text-right',
        className: 'text-right',
        render: (user) => {
          const isCurrent = currentUser?.id === user.id;
          const isOwner = user.isOwner;

          return (
            <div className="inline-flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleOpenEdit(user)}
                title={t('edit')}
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              </Button>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setResetPwdUser(user);
                  setNewPassword('');
                }}
                title={t('users.resetPassword')}
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              </Button>

              {/* Deactivate / Reactivate button */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setStatusDialogUser(user)}
                disabled={isOwner || (isCurrent && user.isActive)}
                title={
                  isOwner
                    ? t('users.ownerCannotDeactivate')
                    : isCurrent
                    ? t('users.selfDeactivateError')
                    : user.isActive
                    ? t('users.deactivate')
                    : t('users.reactivate')
                }
                className={
                  user.isActive
                    ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }
              >
                {user.isActive ? (
                  <UserX className="w-3.5 h-3.5" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          );
        },
      },
    ],
    [currentUser, t],
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>{t('users.title')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('users.subtitle')}
          </p>
        </div>

        <Button onClick={handleOpenCreate} leftIcon={<Plus className="w-4 h-4" />}>
          {t('users.createUser')}
        </Button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row items-center gap-3 justify-between bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="w-full lg:w-72">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="নাম, ফোন বা ইমেইল খুঁজুন..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Role Filter */}
          <select
            value={filterRoleId}
            onChange={(e) => {
              setFilterRoleId(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">{t('users.allRoles')}</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Branch Filter */}
          <select
            value={filterBranchId}
            onChange={(e) => {
              setFilterBranchId(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">{t('users.allBranches')}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">{t('users.allStatus')}</option>
            <option value="active">{t('active')}</option>
            <option value="inactive">{t('inactive')}</option>
          </select>
        </div>
      </div>

      {/* Users DataTable */}
      <DataTable
        columns={columns}
        data={usersResponse?.data || []}
        isLoading={isLoading}
        totalRows={usersResponse?.meta?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
      />

      {/* Create / Edit User Modal */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingUser ? t('users.editUser') : t('users.createUser')}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingUser ? `${editingUser.fullName} এর তথ্য আপডেট` : 'নতুন স্টাফ সদস্যের তথ্য ও শাখা অনুমোদন দিন'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseForm}
                disabled={isSaving}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitUser} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                  <X className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormFieldWrapper label={t('register.firstName')} required>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t('register.firstNamePlaceholder')}
                    required
                  />
                </FormFieldWrapper>

                <FormFieldWrapper label={t('register.lastName')} required>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t('register.lastNamePlaceholder')}
                    required
                  />
                </FormFieldWrapper>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    placeholder="staff@shop.com"
                    required
                  />
                </FormFieldWrapper>
              </div>

              {/* Password (only on create, or optional) */}
              {!editingUser && (
                <FormFieldWrapper label={t('register.password')} required>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
                    required
                  />
                </FormFieldWrapper>
              )}

              {/* Role Selection */}
              <FormFieldWrapper label={t('users.role')} required>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </FormFieldWrapper>

              {/* Branch Access Editor (choose which branches the user can access; block saving user with zero branches) */}
              <div className="space-y-3 pt-2">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {t('users.branches')} <span className="text-rose-500">*</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    কমপক্ষে একটি শাখা নির্বাচন আবশ্যক। নির্বাচিত শাখার মধ্য থেকে ডিফল্ট শোরুম নির্ধারণ করুন।
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {branches.map((b) => {
                    const isSelected = selectedBranches.some((sb) => sb.branchId === b.id);
                    const isDefault = selectedBranches.find((sb) => sb.branchId === b.id)?.isDefault || false;

                    return (
                      <div
                        key={b.id}
                        className={`p-3 rounded-xl border transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                            : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleBranch(b.id)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                          />
                          <div className="truncate">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {b.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">{b.code}</p>
                          </div>
                        </label>

                        {isSelected && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultBranch(b.id)}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ml-2 shrink-0 ${
                              isDefault
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-300 hover:text-emerald-600'
                            }`}
                            title="ডিফল্ট শাখা হিসেবে সেট করুন"
                          >
                            {isDefault ? '★ ডিফল্ট' : 'ডিফল্ট করুন'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedBranches.length === 0 && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                    {t('users.zeroBranchesError')}
                  </p>
                )}
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900">
                <Button variant="outline" type="button" onClick={handleCloseForm} disabled={isSaving}>
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  isLoading={isSaving}
                  disabled={isSaving || selectedBranches.length === 0}
                >
                  {t('save')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate / Reactivate Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(statusDialogUser)}
        onClose={() => setStatusDialogUser(null)}
        onConfirm={() => {
          if (statusDialogUser) {
            statusMutation.mutate({
              id: statusDialogUser.id,
              isActive: !statusDialogUser.isActive,
            });
          }
        }}
        title={
          statusDialogUser?.isActive
            ? `${statusDialogUser.fullName} কে নিষ্ক্রিয় করবেন?`
            : `${statusDialogUser?.fullName} কে সক্রিয় করবেন?`
        }
        description={
          statusDialogUser?.isActive
            ? t('users.deactivateConfirmDesc')
            : 'সক্রিয় করার পর ব্যবহারকারী পুনরায় সফটওয়্যারে লগইন করতে পারবেন।'
        }
        confirmText={statusDialogUser?.isActive ? t('users.deactivate') : t('users.reactivate')}
        variant={statusDialogUser?.isActive ? 'danger' : 'default'}
        isLoading={statusMutation.isPending}
      />

      {/* Reset Password Modal */}
      {resetPwdUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                <span>{t('users.resetPassword')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setResetPwdUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {resetPwdUser.fullName} ({resetPwdUser.email}) এর জন্য নতুন পাসওয়ার্ড সেট করুন।
              আগের সব সেশন স্বয়ংক্রিয়ভাবে বাতিল হয়ে যাবে।
            </p>

            <FormFieldWrapper label="নতুন পাসওয়ার্ড" required>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('users.newPasswordPlaceholder')}
                required
              />
            </FormFieldWrapper>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setResetPwdUser(null)}
                disabled={resetPasswordMutation.isPending}
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={() => {
                  if (newPassword.length >= 6) {
                    resetPasswordMutation.mutate({
                      id: resetPwdUser.id,
                      pwd: newPassword,
                    });
                  } else {
                    toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
                  }
                }}
                isLoading={resetPasswordMutation.isPending}
                disabled={resetPasswordMutation.isPending || newPassword.length < 6}
              >
                {t('confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Limit Reached Upgrade Message Dialog */}
      <PlanLimitDialog
        isOpen={Boolean(planLimitReachedError)}
        onClose={() => setPlanLimitReachedError(null)}
        message={planLimitReachedError || undefined}
      />
    </div>
  );
}
