import { ENV } from '../config/env';
import { usePlatformAuthStore } from '../store/platform-auth-store';
import { normalizeHttpError } from './errors';

export interface PlatformRequestOptions extends RequestInit {
  idempotencyKey?: string;
  params?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Dedicated Platform API Client
 * Rule 1: Tenant app and platform admin are TWO separate apps inside one codebase.
 * - Uses pos_platform_token only.
 * - Never sends x-branch-id header.
 * - Base host points to platform endpoints (/platform/*).
 * - Automatic 401 redirects to /platform/login.
 */
class PlatformApiClient {
  private baseHost: string;

  constructor(apiUrl: string) {
    // Strip trailing slash and trailing /api/v1 if present so /platform/* paths resolve correctly
    this.baseHost = apiUrl.replace(/\/$/, '').replace(/\/api\/v1\/?$/, '');
  }

  async request<T = any>(endpoint: string, options: PlatformRequestOptions = {}): Promise<T> {
    const { idempotencyKey, params, ...customConfig } = options;

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = endpoint.startsWith('http') ? endpoint : `${this.baseHost}${cleanEndpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }

    const headers = new Headers(customConfig.headers || {});
    if (!headers.has('Content-Type') && !(customConfig.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    // Attach Platform Bearer Token ONLY
    const platformToken = usePlatformAuthStore.getState().accessToken;
    if (platformToken) {
      headers.set('Authorization', `Bearer ${platformToken}`);
    }

    if (idempotencyKey) {
      headers.set('x-idempotency-key', idempotencyKey);
    }

    // Track platform admin activity for idle timeout
    usePlatformAuthStore.getState().updateActivity();

    const config: RequestInit = {
      ...customConfig,
      headers,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        if (response.status === 401) {
          // Clear platform session and redirect to platform login
          usePlatformAuthStore.getState().clearPlatformAuth();
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/platform/login')) {
            window.location.href = '/platform/login';
          }
        }
        let errorData: any = null;
        try {
          errorData = await response.json();
        } catch {
          try {
            errorData = await response.text();
          } catch {}
        }
        throw normalizeHttpError(response.status, errorData);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return (await response.json()) as T;
      }

      return (await response.text()) as unknown as T;
    } catch (error) {
      throw error;
    }
  }

  // Convenient HTTP verbs
  get<T = any>(endpoint: string, options?: PlatformRequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = any>(endpoint: string, data?: any, options?: PlatformRequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  patch<T = any>(endpoint: string, data?: any, options?: PlatformRequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  delete<T = any>(endpoint: string, options?: PlatformRequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const platformApiClient = new PlatformApiClient(ENV.API_URL || 'http://localhost:4000');

/**
 * Platform Endpoints Registry
 */
export const platformApi = {
  auth: {
    login: (body: { email: string; pass?: string; password?: string }) =>
      platformApiClient.post<{ accessToken: string; admin: any }>('/platform/auth/login', body),
    logout: () => platformApiClient.post('/platform/auth/logout'),
    getMe: () => platformApiClient.get('/platform/auth/me'),
    changePassword: (body: { oldPassword: string; newPassword: string }) =>
      platformApiClient.post('/platform/auth/change-password', body),
  },

  admins: {
    list: () => platformApiClient.get<any[]>('/platform/admins'),
    create: (body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      role?: string;
    }) => platformApiClient.post('/platform/admins', body),
    update: (id: string, body: { role?: string; isActive?: boolean }) =>
      platformApiClient.patch(`/platform/admins/${id}`, body),
  },

  dashboard: {
    getMetrics: () => platformApiClient.get<any>('/platform/dashboard'),
  },

  auditLogs: {
    list: (params?: { page?: number; limit?: number; businessId?: string; action?: string; entityTable?: string }) =>
      platformApiClient.get<{ data: any[]; pagination: any }>('/platform/audit-logs', { params }),
  },

  businesses: {
    list: (params?: { page?: number; limit?: number; search?: string; status?: string; subscriptionStatus?: string }) =>
      platformApiClient.get<{ data: any[]; pagination: any }>('/platform/businesses', { params }),
    getDetail: (id: string) => platformApiClient.get<any>(`/platform/businesses/${id}`),
    suspend: (id: string, reason: string) =>
      platformApiClient.post(`/platform/businesses/${id}/suspend`, { reason }),
    reactivate: (id: string, reason: string) =>
      platformApiClient.post(`/platform/businesses/${id}/reactivate`, { reason }),
  },

  overrides: {
    create: (body: {
      businessId: string;
      customMonthlyPrice?: number;
      customYearlyPrice?: number;
      discountPercentage?: number;
      isFreeAccess?: boolean;
      overrideMaxBranches?: number;
      overrideMaxUsers?: number;
      overrideMaxProducts?: number;
      overrideMaxVariants?: number;
      trialExtendedDays?: number;
      validUntil?: string;
      reason: string;
    }) => platformApiClient.post('/platform/overrides', body),
    expire: (id: string) => platformApiClient.patch(`/platform/overrides/${id}/expire`),
  },

  plans: {
    list: () => platformApiClient.get<any[]>('/platform/plans'),
    create: (body: any) => platformApiClient.post('/platform/plans', body),
    update: (id: string, body: any) => platformApiClient.patch(`/platform/plans/${id}`, body),
    delete: (id: string) => platformApiClient.delete(`/platform/plans/${id}`),
  },

  invoices: {
    list: (params?: { page?: number; limit?: number; status?: string; businessId?: string }) =>
      platformApiClient.get<{ data: any[]; pagination: any }>('/platform/invoices', { params }),
    void: (id: string) => platformApiClient.post(`/platform/invoices/${id}/void`),
    markOverdue: (id: string) => platformApiClient.post(`/platform/invoices/${id}/mark-overdue`),
    recordPayment: (
      id: string,
      body: { amount: number; paymentMethod: string; transactionId?: string },
      options?: { idempotencyKey?: string },
    ) => platformApiClient.post(`/platform/invoices/${id}/pay`, body, options),
    getRevenueSummary: () => platformApiClient.get<any>('/platform/revenue/summary'),
  },

  support: {
    list: (params?: { page?: number; limit?: number; status?: string; priority?: string; businessId?: string }) =>
      platformApiClient.get<{ data: any[]; pagination: any }>('/platform/tickets', { params }),
    getThread: (id: string) => platformApiClient.get<any>(`/platform/tickets/${id}`),
    assign: (id: string, adminId: string) => platformApiClient.patch(`/platform/tickets/${id}/assign`, { adminId }),
    updateStatus: (id: string, status: string) =>
      platformApiClient.patch(`/platform/tickets/${id}/status`, { status }),
    reply: (id: string, message: string) => platformApiClient.post(`/platform/tickets/${id}/messages`, { message }),
  },

  settings: {
    list: () => platformApiClient.get<any[]>('/platform/settings'),
    get: (key: string) => platformApiClient.get<any>(`/platform/settings/${key}`),
    set: (body: { key: string; value: string; description?: string; isEncrypted?: boolean }) =>
      platformApiClient.post('/platform/settings', body),
  },
};
