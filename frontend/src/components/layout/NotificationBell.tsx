'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useTranslation } from '@/lib/i18n';
import { notificationStreamService, LiveNotificationEvent } from '@/lib/notifications/notification-stream';
import { useBranchStore } from '@/lib/store/branch-store';
import { useToast } from '@/components/feedback/ToastContext';
import Link from 'next/link';
import {
  Bell,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  Package,
  ArrowLeftRight,
  TrendingDown,
  Info,
  CheckCheck,
} from 'lucide-react';

export function NotificationBell() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { currentBranchId } = useBranchStore();

  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // 1. Query Unread Count
  const { data: countData } = useQuery({
    queryKey: ['notifications', 'unread-count', currentBranchId],
    queryFn: () => api.notifications.unreadCount(),
    refetchInterval: 60000, // background refresh
  });

  // 2. Query Latest 10 Notifications
  const { data: listData } = useQuery({
    queryKey: ['notifications', 'latest', currentBranchId],
    queryFn: () => api.notifications.list({ page: 1, limit: 10 }),
    enabled: isOpen,
  });

  // 3. Mark All as Read Mutation
  const markAllMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // 4. Mark Single as Read
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // 5. Connect SSE stream and listen for live events
  useEffect(() => {
    // Restart stream on branch switch to enforce branch isolation
    notificationStreamService.restart();

    const unsubscribe = notificationStreamService.subscribe((event: LiveNotificationEvent) => {
      // Invalidate queries to fetch fresh state
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Trigger user-visible toast for high priority alerts
      if (event.type === 'SYSTEM_ALERT' || event.type === 'LOW_STOCK' || event.type === 'STOCK_TRANSFER') {
        toast.info(event.message, event.title);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentBranchId, queryClient, toast]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = countData?.unreadCount || 0;
  const items = listData?.data || [];

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
        return '/notifications';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'STOCK_TRANSFER':
        return <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />;
      case 'LOW_STOCK':
        return <TrendingDown className="w-3.5 h-3.5 text-amber-500" />;
      case 'SYSTEM_ALERT':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-500" />;
      default:
        return <Info className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  return (
    <div className="relative" ref={bellRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 relative"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] text-[10px] font-bold rounded-full bg-rose-600 text-white flex items-center justify-center animate-pulse shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 p-3 space-y-2 animate-scaleIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{t('shell.notifications')}</h4>
              {unreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {items.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {t('shell.noNotifications')}
              </div>
            ) : (
              items.map((n: any) => (
                <div
                  key={n.id}
                  className={`p-2.5 rounded-xl transition-colors text-left flex items-start gap-2.5 ${
                    !n.is_read
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 font-medium'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <Link
                        href={getDeepLink(n)}
                        onClick={() => {
                          if (!n.is_read) markReadMutation.mutate(n.id);
                          setIsOpen(false);
                        }}
                        className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate hover:underline"
                      >
                        {n.title}
                      </Link>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {n.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer View All */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              <span>View all notifications</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
