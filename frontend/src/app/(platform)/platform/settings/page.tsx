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
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  Settings,
  Lock,
  KeyRound,
  EyeOff,
  Plus,
  Edit2,
  RefreshCw,
  ShieldAlert,
  Search,
  MessageSquare,
  CreditCard,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

export default function PlatformSettingsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const currentAdmin = usePlatformAuthStore((state) => state.admin);

  const isSuperAdmin = currentAdmin?.role === PlatformRole.SUPER_ADMIN;

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [replaceSecretModalOpen, setReplaceSecretModalOpen] = useState(false);
  const [targetSecretSetting, setTargetSecretSetting] = useState<any | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    description: '',
    isEncrypted: false,
  });

  const [newSecretValue, setNewSecretValue] = useState('');

  // Query: System Settings
  const { data: settings = [], isLoading, refetch } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: () => platformApi.settings.list(),
    enabled: isSuperAdmin,
  });

  // Mutation: Set Setting (Upsert)
  const setSettingMutation = useMutation({
    mutationFn: (payload: { key: string; value: string; description?: string; isEncrypted?: boolean }) =>
      platformApi.settings.set(payload),
    onSuccess: () => {
      showToast('System configuration saved successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      setModalOpen(false);
      setReplaceSecretModalOpen(false);
      setTargetSecretSetting(null);
      setNewSecretValue('');
      setFormData({ key: '', value: '', description: '', isEncrypted: false });
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to save setting.', 'error');
    },
  });

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Restricted Platform Zone</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Only users with the <span className="text-indigo-600 dark:text-indigo-400 font-mono">SUPER_ADMIN</span> role can inspect
          or adjust low-level system configuration parameters.
        </p>
      </div>
    );
  }

  // Group settings by category prefix
  const getCategory = (key: string): string => {
    if (key.startsWith('sms.')) return 'sms';
    if (key.startsWith('billing.') || key.startsWith('subscription.')) return 'billing';
    if (key.startsWith('gateway.') || key.startsWith('bkash.') || key.startsWith('nagad.')) return 'gateway';
    return 'general';
  };

  const filteredSettings = settings.filter((s: any) => {
    const matchesSearch =
      s.key.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCat =
      selectedCategory === 'ALL' || getCategory(s.key) === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleOpenEdit = (setting: any) => {
    if (setting.is_encrypted) {
      setTargetSecretSetting(setting);
      setNewSecretValue('');
      setReplaceSecretModalOpen(true);
    } else {
      setFormData({
        key: setting.key,
        value: setting.value,
        description: setting.description || '',
        isEncrypted: false,
      });
      setModalOpen(true);
    }
  };

  const handleOpenCreate = () => {
    setFormData({
      key: '',
      value: '',
      description: '',
      isEncrypted: false,
    });
    setModalOpen(true);
  };

  const handleSaveRegularSetting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.key.trim()) {
      showToast('Setting key is required.', 'error');
      return;
    }
    setSettingMutation.mutate({
      key: formData.key.trim(),
      value: formData.value,
      description: formData.description.trim() || undefined,
      isEncrypted: formData.isEncrypted,
    });
  };

  const handleSaveSecretReplacement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSecretSetting) return;
    if (!newSecretValue.trim()) {
      showToast('Please enter a new secret value to replace.', 'error');
      return;
    }

    setSettingMutation.mutate({
      key: targetSecretSetting.key,
      value: newSecretValue.trim(),
      description: targetSecretSetting.description,
      isEncrypted: true,
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 dark:text-slate-100 font-sans pb-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              System Configuration &amp; Settings
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Manage global operational flags, SMS integrations, payment gateway keys, and encrypted secrets.
            </p>
          </div>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="text-xs h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 cursor-pointer font-bold flex items-center gap-1.5 self-end sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Configuration Key</span>
        </Button>
      </div>

      {/* Security Rule Card */}
      <Card className="bg-slate-50/70 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 border-l-4 border-l-orange-500 rounded-3xl shadow-sm shadow-slate-200/40 dark:shadow-none">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-800 dark:text-slate-300 space-y-1">
            <p className="font-bold text-slate-900 dark:text-slate-100">
              Zero-Exposure Secret Management Policy
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              Settings marked as <code className="text-orange-600 dark:text-orange-400 font-bold">is_encrypted</code> are encrypted at rest with AES-256-GCM.
              Decrypted values are NEVER sent to the browser or stored in query caches. Secret rotation is write-only.
            </p>
          </div>
        </div>
      </Card>

      {/* Filter and Category Bar */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl shadow-sm shadow-slate-200/40 dark:shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'All Keys' },
              { id: 'sms', label: 'SMS & Telco' },
              { id: 'gateway', label: 'Payment Gateways' },
              { id: 'billing', label: 'Billing & Grace' },
              { id: 'general', label: 'General System' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-xs h-7 px-3 rounded-full font-bold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                    : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-orange-500 hover:text-orange-500'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="w-full md:w-64">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search key or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Settings Table */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-sm shadow-slate-200/40 dark:shadow-none rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-950/60 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Key Name</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Updated At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      Loading system configuration parameters...
                    </td>
                  </tr>
                ) : filteredSettings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">
                      No configuration keys found matching current filter.
                    </td>
                  </tr>
                ) : (
                  filteredSettings.map((s: any) => {
                    const isEncrypted = Boolean(s.is_encrypted);
                    return (
                      <tr key={s.key} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          {isEncrypted ? (
                            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          ) : (
                            <Sliders className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          )}
                          {s.key}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {isEncrypted ? (
                            <Badge className="bg-amber-50 dark:bg-slate-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 font-mono tracking-widest text-[11px]">
                              ●●●●●●●●
                            </Badge>
                          ) : (
                            <span className="text-slate-700 dark:text-slate-300 max-w-xs truncate block">
                              {s.value}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                            {getCategory(s.key)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                          {s.description || '—'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {formatDateTime(s.updated_at || s.created_at)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(s)}
                            className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs h-7 px-2.5 bg-white dark:bg-slate-900"
                          >
                            {isEncrypted ? (
                              <>
                                <KeyRound className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
                                Replace
                              </>
                            ) : (
                              <>
                                <Edit2 className="w-3.5 h-3.5 mr-1" />
                                Edit
                              </>
                            )}
                          </Button>
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

      {/* CREATE / EDIT REGULAR SETTING MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl rounded-3xl p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Configure System Parameter
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                Add or update global configuration flags and system operational properties.
              </DialogDescription>
            </div>
          </div>

          <form onSubmit={handleSaveRegularSetting} className="space-y-4 px-6 py-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Key Identifier <span className="text-rose-500">*</span>
              </label>
              <Input
                required
                placeholder="e.g. billing.default_grace_days"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 mt-1 font-mono text-xs rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Value <span className="text-rose-500">*</span>
              </label>
              <Textarea
                rows={3}
                required
                placeholder="Parameter value..."
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 mt-1 font-mono text-xs rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description</label>
              <Input
                placeholder="Explains how this property is used by backend services..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 mt-1 text-xs rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isEncryptedCheckbox"
                checked={formData.isEncrypted}
                onChange={(e) => setFormData({ ...formData, isEncrypted: e.target.checked })}
                className="rounded border-slate-300 dark:border-slate-800 text-orange-500 focus:ring-orange-500 w-4 h-4 bg-white dark:bg-slate-950 cursor-pointer"
              />
              <label htmlFor="isEncryptedCheckbox" className="text-xs font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1 cursor-pointer">
                <Lock className="w-3.5 h-3.5" />
                Encrypt value at rest with AES-256-GCM
              </label>
            </div>

            <DialogFooter className="px-6 py-3.5 -mx-6 -mb-4 mt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-end gap-2.5 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={setSettingMutation.isPending}
                className="h-9 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/25 cursor-pointer flex items-center gap-1.5"
              >
                {setSettingMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* REPLACE SECRET MODAL (WRITE-ONLY) */}
      <Dialog open={replaceSecretModalOpen} onOpenChange={setReplaceSecretModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl rounded-3xl p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Replace Encrypted Secret (Write-Only)
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                For security, the existing secret value is never readable. Entering a new secret here will overwrite the old key.
              </DialogDescription>
            </div>
          </div>

          {targetSecretSetting && (
            <form onSubmit={handleSaveSecretReplacement} className="space-y-4 px-6 py-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs space-y-1">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Target Key:</span>
                <p className="font-mono text-slate-900 dark:text-slate-100 font-bold">{targetSecretSetting.key}</p>
                <p className="text-[11px] text-slate-400">{targetSecretSetting.description}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  New Secret Value <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="password"
                  required
                  placeholder="Enter replacement secret / token..."
                  value={newSecretValue}
                  onChange={(e) => setNewSecretValue(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 mt-1 font-mono text-xs rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Will be encrypted with the server's master key before storage.
                </p>
              </div>

              <DialogFooter className="px-6 py-3.5 -mx-6 -mb-4 mt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-end gap-2.5 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setReplaceSecretModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={setSettingMutation.isPending}
                  className="h-9 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/25 cursor-pointer flex items-center gap-1.5"
                >
                  {setSettingMutation.isPending ? 'Updating...' : 'Rotate & Overwrite Secret'}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
