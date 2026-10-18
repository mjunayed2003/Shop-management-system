'use client';

import { ENV } from '../config/env';
import { useAuthStore } from '../store/auth-store';
import { useBranchStore } from '../store/branch-store';
import { useOfflineStore } from '../store/offline-store';
import { soundFx } from '../utils/audio';

export interface LiveNotificationEvent {
  id: string;
  businessId: string;
  branchId?: string | null;
  userId?: string | null;
  type: string;
  title: string;
  message: string;
  createdAt: string;
}

type NotificationListener = (event: LiveNotificationEvent) => void;

class NotificationStreamService {
  private abortController: AbortController | null = null;
  private listeners = new Set<NotificationListener>();
  private seenIds = new Set<string>();
  private retryCount = 0;
  private isConnecting = false;
  private pollInterval: NodeJS.Timeout | null = null;

  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    if (this.listeners.size === 1) {
      this.connect();
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.disconnect();
      }
    };
  }

  restart(): void {
    this.disconnect();
    if (this.listeners.size > 0) {
      this.connect();
    }
  }

  disconnect(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isConnecting = false;
  }

  async connect(): Promise<void> {
    const isOnline = useOfflineStore.getState().isOnline;
    const token = useAuthStore.getState().accessToken;
    const currentBranchId = useBranchStore.getState().currentBranchId;

    if (!isOnline || !token || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.abortController = new AbortController();

    const url = `${ENV.API_URL}/api/v1/notifications/stream`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(currentBranchId ? { 'x-branch-id': currentBranchId } : {}),
          Accept: 'text/event-stream',
        },
        signal: this.abortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE stream failed with status ${response.status}`);
      }

      this.retryCount = 0;
      this.isConnecting = false;

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const jsonText = trimmed.replace(/^data:\s*/, '');
            try {
              const parsed = JSON.parse(jsonText);
              const eventData: LiveNotificationEvent = parsed.data || parsed;

              // De-duplicate by notification ID
              if (eventData?.id && !this.seenIds.has(eventData.id)) {
                this.seenIds.add(eventData.id);

                // Play sound for alert if sound is enabled
                this.handleAlertSound(eventData.type);

                // Notify all listeners
                this.listeners.forEach((fn) => fn(eventData));
              }
            } catch {
              // Ignore non-json lines / ping comments
            }
          }
        }
      }
    } catch (err: any) {
      this.isConnecting = false;
      if (err.name === 'AbortError') return;

      console.warn('SSE stream error, scheduling reconnect:', err.message);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    const isOnline = useOfflineStore.getState().isOnline;
    if (!isOnline) return;

    this.retryCount++;
    // Exponential backoff: 3s, 6s, 12s, max 30s
    const delay = Math.min(3000 * Math.pow(2, this.retryCount - 1), 30000);

    setTimeout(() => {
      this.connect();
    }, delay);

    // Fallback polling if SSE fails multiple times
    if (this.retryCount > 2 && !this.pollInterval) {
      this.startPollingFallback();
    }
  }

  private startPollingFallback(): void {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(async () => {
      // In polling fallback, caller query invalidation is handled by React Query
    }, 15000);
  }

  private handleAlertSound(type: string): void {
    if (typeof window === 'undefined') return;
    const soundEnabled = localStorage.getItem('pos_sound_notifications') !== 'false';
    if (soundEnabled && (type === 'SYSTEM_ALERT' || type === 'STOCK_TRANSFER' || type === 'LOW_STOCK')) {
      soundFx.playBeep();
    }
  }
}

export const notificationStreamService = new NotificationStreamService();
