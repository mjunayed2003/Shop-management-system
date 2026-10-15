import { ENV } from '../config/env';
import { useAuthStore } from '../store/auth-store';
import { useBranchStore } from '../store/branch-store';
import { normalizeHttpError } from './errors';

export interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
  skipBranchHeader?: boolean;
  params?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Core API Client
 * Enforces architectural rules:
 * 1. Attaches Bearer accessToken and x-branch-id header in this SINGLE place.
 * 2. Never sends business_id or branch_id in request bodies.
 * 3. Never logs tokens or sensitive credentials.
 * 4. Normalizes errors into typed exceptions (ValidationError, PlanLimitReachedError, SubscriptionSuspendedError, etc.)
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private cleanRequestBody(body: any): any {
    if (!body || typeof body !== 'object') return body;
    if (Array.isArray(body)) {
      return body.map((item) => this.cleanRequestBody(item));
    }

    // Defensive clone and strip tenant identifiers from body to strictly enforce Rule 1
    const cleaned = { ...body };
    delete cleaned.business_id;
    delete cleaned.businessId;
    delete cleaned.branch_id;
    delete cleaned.branchId;

    return cleaned;
  }

  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { idempotencyKey, skipBranchHeader, params, ...customConfig } = options;

    let url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

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

    // Single source of truth for headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(customConfig.headers as Record<string, string>),
    };

    // 1. Attach Access Token (added in ONE place)
    const token = useAuthStore.getState().accessToken;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 2. Attach x-branch-id header (added in ONE place)
    if (!skipBranchHeader) {
      const currentBranchId = useBranchStore.getState().currentBranchId;
      if (currentBranchId) {
        headers['x-branch-id'] = currentBranchId;
      }
    }

    // 3. Attach Idempotency Key if provided
    if (idempotencyKey) {
      headers['x-idempotency-key'] = idempotencyKey;
    }

    // Prepare body: clean body to ensure business_id and branch_id are never sent in request bodies
    let body = customConfig.body;
    if (body && typeof body === 'object' && !(body instanceof FormData)) {
      body = JSON.stringify(this.cleanRequestBody(body));
    }

    try {
      const response = await fetch(url, {
        ...customConfig,
        headers,
        body,
      });

      if (response.status === 204) {
        return {} as T;
      }

      let data: any = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { message: text } : {};
      }

      if (!response.ok) {
        // Automatically handle 401 session expiration
        if (response.status === 401 && typeof window !== 'undefined') {
          // If not already on login page, clear state and trigger login redirect
          if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
            useAuthStore.getState().clearAuth();
          }
        }

        throw normalizeHttpError(response.status, data);
      }

      return data as T;
    } catch (err: any) {
      // Re-throw normalized errors
      if (err.name?.endsWith('Error') && err.statusCode) {
        throw err;
      }
      throw normalizeHttpError(500, { message: err?.message || 'Network connection failed' });
    }
  }

  get<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: data });
  }

  patch<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body: data });
  }

  put<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: data });
  }

  delete<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(ENV.API_URL);
