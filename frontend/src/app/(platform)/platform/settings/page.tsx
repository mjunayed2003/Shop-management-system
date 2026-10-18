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
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl">
        <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-100">Restricted Platform Zone</h2>
        <p className="text-slate-400 text-sm mt-1">
          Only users with the <span className="text-indigo-400 font-mono">SUPER_ADMIN</span> role can inspect
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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-indigo-400" />
            System Configuration & Secrets
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Manage global operational flags, SMS integrations, payment gateway keys, and encrypted secrets.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Configuration Key
        </Button>
      </div>

      {/* Security Rule Card */}
      <Card className="bg-slate-900 border-slate-800 p-4 border-l-4 border-l-amber-500">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-slate-100">
              Zero-Exposure Secret Management Policy
            </p>
            <p className="text-slate-400">
              Settings marked as <code className="text-amber-400">is_encrypted</code> are encrypted at rest with AES-256-GCM.
              Decrypted values are NEVER sent to the browser or stored in query caches. Secret rotation is write-only.
            </p>
          </div>
        </div>
      </Card>

      {/* Filter and Category Bar */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'All Keys' },
              { id: 'sms', label: 'SMS & Telco' },
              { id: 'gateway', label: 'Payment Gateways' },
              { id: 'billing', label: 'Billing & Grace' },
              { id: 'general', label: 'General System' },
            ].map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-xs h-7 px-3 ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </Button>
            ))}
          </div>

          <div className="w-full md:w-64">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <Input
                placeholder="Search key or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-800 text-xs text-slate-100 placeholder:text-slate-600"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Settings Table */}
      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Key Name</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Updated At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Loading system configuration parameters...
                    </td>
                  </tr>
                ) : filteredSettings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No configuration keys found matching current filter.
                    </td>
                  </tr>
                ) : (
                  filteredSettings.map((s: any) => {
                    const isEncrypted = Boolean(s.is_encrypted);
                    return (
                      <tr key={s.key} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono font-medium text-slate-100 flex items-center gap-2">
                          {isEncrypted ? (
                            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <Sliders className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                          {s.key}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {isEncrypted ? (
                            <Badge className="bg-slate-950 text-amber-400 border-amber-500/30 font-mono tracking-widest text-[11px]">
                              ●●●●●●●●
                            </Badge>
                          ) : (
                            <span className="text-slate-300 max-w-xs truncate block">
                              {s.value}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px] border-slate-700">
                            {getCategory(s.key)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400 max-w-xs truncate">
                          {s.description || '—'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400 font-mono">
                          {formatDateTime(s.updated_at || s.created_at)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(s)}
                            className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs h-7 px-2.5"
                          >
                            {isEncrypted ? (
                              <>
                                <KeyRound className="w-3.5 h-3.5 mr-1 text-amber-400" />
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
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-400">
              <Sliders className="w-5 h-5" />
              Configure System Parameter
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Add or update global configuration flags and system operational properties.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRegularSetting} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-slate-300">
                Key Identifier <span className="text-rose-400">*</span>
              </label>
              <Input
                required
                placeholder="e.g. billing.default_grace_days"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                className="bg-slate-950 border-slate-800 text-slate-100 mt-1 font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">
                Value <span className="text-rose-400">*</span>
              </label>
              <Textarea
                rows={3}
                required
                placeholder="Parameter value..."
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="bg-slate-950 border-slate-800 text-slate-100 mt-1 font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">Description</label>
              <Input
                placeholder="Explains how this property is used by backend services..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-slate-950 border-slate-800 text-slate-100 mt-1 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isEncryptedCheckbox"
                checked={formData.isEncrypted}
                onChange={(e) => setFormData({ ...formData, isEncrypted: e.target.checked })}
                className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-slate-950"
              />
              <label htmlFor="isEncryptedCheckbox" className="text-xs font-medium text-amber-400 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                Encrypt value at rest with AES-256-GCM
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="border-slate-800 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={setSettingMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {setSettingMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* REPLACE SECRET MODAL (WRITE-ONLY) */}
      <Dialog open={replaceSecretModalOpen} onOpenChange={setReplaceSecretModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <KeyRound className="w-5 h-5" />
              Replace Encrypted Secret (Write-Only)
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              For security, the existing secret value is never readable. Entering a new secret here will overwrite the old key.
            </DialogDescription>
          </DialogHeader>

          {targetSecretSetting && (
            <form onSubmit={handleSaveSecretReplacement} className="space-y-4 py-2">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1">
                <span className="text-slate-400">Target Key:</span>
                <p className="font-mono text-slate-100 font-semibold">{targetSecretSetting.key}</p>
                <p className="text-[11px] text-slate-500">{targetSecretSetting.description}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">
                  New Secret Value <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="password"
                  required
                  placeholder="Enter replacement secret / token..."
                  value={newSecretValue}
                  onChange={(e) => setNewSecretValue(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 mt-1 font-mono text-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Will be encrypted with the server's master key before storage.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReplaceSecretModalOpen(false)}
                  className="border-slate-800 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={setSettingMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {setSettingMutation.isPending ? 'Updating...' : 'Rotate & Overwrite Secret'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
