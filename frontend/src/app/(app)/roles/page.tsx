'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, RoleDto, PermissionGroup } from '@/lib/api/endpoints';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FormFieldWrapper } from '@/components/shared/FormFieldWrapper';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SearchInput } from '@/components/shared/SearchInput';
import { TableSkeleton } from '@/components/ui/skeleton';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Users,
  AlertTriangle,
  CheckSquare,
  Square,
  Search,
  X,
  Lock,
} from 'lucide-react';

export default function RolesPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch Roles
  const {
    data: roles = [],
    isLoading: isLoadingRoles,
    error: rolesError,
  } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.roles.list(),
  });

  // Fetch all permissions grouped
  const { data: permissionGroups = [], isLoading: isLoadingPermissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => api.roles.listPermissions(),
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDto | null>(null);

  // Form State
  const [roleName, setRoleName] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [permissionSearch, setPermissionSearch] = useState('');

  // Delete State
  const [deleteConfirmRole, setDeleteConfirmRole] = useState<RoleDto | null>(null);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: { name: string; code?: string; description?: string; permissionCodes: string[] }) =>
      api.roles.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success(t('roles.saveSuccess'));
      handleCloseModal();
    },
    onError: (err: any) => {
      toast.error(err.message || 'রোল তৈরি করা যায়নি');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      api.roles.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success(t('roles.saveSuccess'));
      handleCloseModal();
    },
    onError: (err: any) => {
      toast.error(err.message || 'রোল আপডেট করা যায়নি');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.roles.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success(t('roles.deleteSuccess'));
      setDeleteConfirmRole(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'রোল মুছে ফেলা যায়নি');
    },
  });

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleCode('');
    setDescription('');
    setSelectedPermissions(new Set());
    setPermissionSearch('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (role: RoleDto) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleCode(role.code);
    setDescription(role.description || '');
    setSelectedPermissions(new Set(role.permissions.map((p) => p.code)));
    setPermissionSearch('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
  };

  // Permission selection toggle
  const togglePermission = (code: string) => {
    const next = new Set(selectedPermissions);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    setSelectedPermissions(next);
  };

  // Select all in a module
  const toggleSelectModule = (group: PermissionGroup) => {
    const groupCodes = group.permissions.map((p) => p.code);
    const allSelected = groupCodes.every((code) => selectedPermissions.has(code));

    const next = new Set(selectedPermissions);
    if (allSelected) {
      groupCodes.forEach((code) => next.delete(code));
    } else {
      groupCodes.forEach((code) => next.add(code));
    }
    setSelectedPermissions(next);
  };

  // Total permissions count across all groups
  const totalPermissionsCount = useMemo(() => {
    return permissionGroups.reduce((acc, g) => acc + g.permissions.length, 0);
  }, [permissionGroups]);

  // Filtered permission groups based on search
  const filteredGroups = useMemo(() => {
    if (!permissionSearch.trim()) return permissionGroups;
    const q = permissionSearch.trim().toLowerCase();

    return permissionGroups
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.permissions.length > 0);
  }, [permissionGroups, permissionSearch]);

  const handleSubmitRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      toast.error('রোলের নাম আবশ্যক');
      return;
    }

    if (selectedPermissions.size === 0) {
      toast.error('কমপক্ষে একটি অনুমতি নির্বাচন করতে হবে');
      return;
    }

    const permissionCodes = Array.from(selectedPermissions);

    if (editingRole) {
      updateMutation.mutate({
        id: editingRole.id,
        payload: {
          name: roleName.trim(),
          description: description.trim() || undefined,
          permissionCodes,
        },
      });
    } else {
      createMutation.mutate({
        name: roleName.trim(),
        code: roleCode.trim() || undefined,
        description: description.trim() || undefined,
        permissionCodes,
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <span>{t('roles.title')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('roles.subtitle')}
          </p>
        </div>

        <Button onClick={handleOpenCreate} leftIcon={<Plus className="w-4 h-4" />}>
          {t('roles.createRole')}
        </Button>
      </div>

      {/* Role Cards List */}
      {isLoadingRoles ? (
        <TableSkeleton rows={4} cols={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map((role) => {
            const isOwner = role.code === 'OWNER';
            return (
              <div
                key={role.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{role.name}</span>
                        {isOwner && (
                          <span title="সিস্টেম মালিক রোল">
                            <Lock className="w-3.5 h-3.5 text-amber-500" />
                          </span>
                        )}
                      </h3>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{role.code}</p>
                    </div>

                    <Badge variant={role.isSystem ? 'default' : 'info'} size="sm">
                      {role.isSystem ? t('roles.systemRoleBadge') : t('roles.customRoleBadge')}
                    </Badge>
                  </div>

                  {role.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {role.description}
                    </p>
                  )}

                  <div className="pt-2 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <strong>{role.usersCount}</strong> জন কর্মী
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <strong>{isOwner ? 'সকল' : role.permissionsCount}</strong> টি অনুমতি
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(role)}
                    disabled={isOwner}
                    leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                  >
                    {t('edit')}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirmRole(role)}
                    disabled={role.isSystem || role.usersCount > 0}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title={
                      role.isSystem
                        ? t('roles.cannotDeleteSystem')
                        : role.usersCount > 0
                        ? `এই রোলে ${role.usersCount} জন কর্মী যুক্ত আছেন, মুছে ফেলা সম্ভব নয়`
                        : undefined
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Role Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingRole ? t('roles.editRole') : t('roles.createRole')}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingRole ? `রোল সম্পাদনা: ${editingRole.name}` : 'নতুন কাস্টম পদবী ও পারমিশন ম্যাট্রিক্স তৈরি করুন'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSaving}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitRole} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Warning when editing role with assigned users */}
              {editingRole && editingRole.usersCount > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    {t('roles.assignedUsersWarning', { count: editingRole.usersCount })}
                  </div>
                </div>
              )}

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormFieldWrapper label={t('roles.roleName')} required>
                  <Input
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder={t('roles.roleNamePlaceholder')}
                    required
                  />
                </FormFieldWrapper>

                <FormFieldWrapper label={t('roles.roleCode')} hint="যেমন: INVENTORY_CLERK">
                  <Input
                    value={roleCode}
                    onChange={(e) => setRoleCode(e.target.value)}
                    placeholder={t('roles.roleCodePlaceholder')}
                    disabled={Boolean(editingRole)}
                  />
                </FormFieldWrapper>
              </div>

              <FormFieldWrapper label={t('roles.description')}>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('roles.descriptionPlaceholder')}
                />
              </FormFieldWrapper>

              {/* Permission Matrix Section */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      {t('roles.permissionMatrix')}
                    </h4>
                    {/* Live count of selected permissions */}
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                      {t('roles.selectedCount', {
                        selected: selectedPermissions.size,
                        total: totalPermissionsCount,
                      })}
                    </p>
                  </div>

                  <div className="w-full sm:w-64">
                    <SearchInput
                      value={permissionSearch}
                      onChange={setPermissionSearch}
                      placeholder={t('roles.searchPermissions')}
                    />
                  </div>
                </div>

                {isLoadingPermissions ? (
                  <TableSkeleton rows={4} cols={2} />
                ) : (
                  <div className="space-y-4">
                    {filteredGroups.map((group) => {
                      const allModuleSelected = group.permissions.every((p) =>
                        selectedPermissions.has(p.code),
                      );

                      return (
                        <div
                          key={group.module}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-3"
                        >
                          {/* Module Header with Select All Button */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                              {group.module} মডিউল ({group.permissions.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleSelectModule(group)}
                              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 select-none"
                            >
                              {allModuleSelected ? (
                                <>
                                  <CheckSquare className="w-3.5 h-3.5" />
                                  <span>সব বাতিল</span>
                                </>
                              ) : (
                                <>
                                  <Square className="w-3.5 h-3.5" />
                                  <span>{t('roles.selectAllModule')}</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Permission Checkboxes Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {group.permissions.map((p) => {
                              const isChecked = selectedPermissions.has(p.code);
                              return (
                                <label
                                  key={p.code}
                                  className={`
                                    flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer select-none transition-colors
                                    ${
                                      isChecked
                                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
                                        : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                    }
                                  `}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => togglePermission(p.code)}
                                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold leading-tight">{p.name}</p>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.code}</p>
                                    {p.description && (
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                                        {p.description}
                                      </p>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900">
                <Button variant="outline" type="button" onClick={handleCloseModal} disabled={isSaving}>
                  {t('cancel')}
                </Button>
                <Button type="submit" isLoading={isSaving} disabled={isSaving}>
                  {t('save')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmRole)}
        onClose={() => setDeleteConfirmRole(null)}
        onConfirm={() => {
          if (deleteConfirmRole) {
            deleteMutation.mutate(deleteConfirmRole.id);
          }
        }}
        title="রোল মুছে ফেলার নিশ্চয়তা"
        description={`আপনি কি নিশ্চিতভাবে "${deleteConfirmRole?.name}" রোলটি মুছে ফেলতে চান? এটি আর পুনরুদ্ধার করা যাবে না।`}
        confirmText={t('delete')}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
