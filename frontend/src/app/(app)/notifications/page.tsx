'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  Check,
  Filter,
  Volume2,
  VolumeX,
  AlertCircle,
  ArrowLeftRight,
  TrendingDown,
  Info,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { currentBranchId } = useBranchStore();

  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  // Load sound setting and browser notification status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSound = localStorage.getItem('pos_sound_notifications');
      setSoundEnabled(storedSound !== 'false');

      if ('Notification' in window) {
        setBrowserPermission(Notification.permission);
      }
    }
  }, []);

  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('pos_sound_notifications', String(nextVal));
  };

  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
      if (perm === 'granted') {
        toast.success('Browser notifications enabled.');
      } else {
        toast.info('Browser notification permission was not granted.');
      }
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'list', currentBranchId, page, unreadOnly],
    queryFn: () => api.notifications.list({ page, limit: 15, unreadOnly }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read.');
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const rawItems = data?.data || [];
  const filteredItems =
    selectedType === 'ALL'
      ? rawItems
      : rawItems.filter((item: any) => item.type === selectedType);

  const totalPages = data?.pagination?.totalPages || 1;

  const getDeepLink = (notification: any) => {
    switch (notification.type) {
      case 'STOCK_TRANSFER':
        return '/inventory/transfers';
      case 'LOW_STOCK':
        return '/inventory/stock?lowStock=true';
      case 'SYSTEM_ALERT':
        return '/sync/conflicts';
      case 'CUSTOMER_CREDIT_LIMIT':
        return '/customers/due';
      case 'SUBSCRIPTION_EXPIRING':
        return '/settings/subscription';
      default:
        return '#';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'STOCK_TRANSFER':
        return <ArrowLeftRight className="w-4 h-4 text-blue-500" />;
      case 'LOW_STOCK':
        return <TrendingDown className="w-4 h-4 text-amber-500" />;
      case 'SYSTEM_ALERT':
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      default:
        return <Info className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-emerald-600" />
            <span>Notifications &amp; Activity Center</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time shop updates, low stock alerts, sync conflicts, and system notices
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleSound}
            className="text-xs h-9 rounded-xl border-slate-200 dark:border-slate-800"
            title={soundEnabled ? 'Sound alerts enabled' : 'Sound alerts muted'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Sound On
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                Muted
              </>
            )}
          </Button>

          {/* Browser Permission Prompt */}
          {browserPermission !== 'granted' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={requestBrowserPermission}
              className="text-xs h-9 rounded-xl border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            >
              <Bell className="w-3.5 h-3.5 mr-1.5" />
              Enable Push
            </Button>
          )}

          {/* Mark All Read */}
          <Button
            type="button"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="text-xs h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
            Mark all read
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => { setSelectedType('ALL'); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
            selectedType === 'ALL'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => { setSelectedType('SYSTEM_ALERT'); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
            selectedType === 'SYSTEM_ALERT'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          System Alerts
        </button>
        <button
          type="button"
          onClick={() => { setSelectedType('LOW_STOCK'); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
            selectedType === 'LOW_STOCK'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Low Stock
        </button>
        <button
          type="button"
          onClick={() => { setSelectedType('STOCK_TRANSFER'); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
            selectedType === 'STOCK_TRANSFER'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Transfers
        </button>

        <div className="ml-auto flex items-center gap-2 pr-1">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }}
              className="w-3.5 h-3.5 rounded text-emerald-600"
            />
            <span>Unread only</span>
          </label>
        </div>
      </div>

      {/* Notifications List */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading notifications...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Bell className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-xs text-slate-400 font-medium">No notifications matching selected filters</p>
          </div>
        ) : (
          filteredItems.map((n: any) => (
            <div
              key={n.id}
              className={`p-4 transition-colors flex items-start gap-3.5 ${
                !n.is_read ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
              }`}
            >
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {n.title}
                    </h3>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {n.message}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-1">
                  {getDeepLink(n) !== '#' && (
                    <Link
                      href={getDeepLink(n)}
                      onClick={() => !n.is_read && markReadMutation.mutate(n.id)}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Take Action</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={() => markReadMutation.mutate(n.id)}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 inline-flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Mark read</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
