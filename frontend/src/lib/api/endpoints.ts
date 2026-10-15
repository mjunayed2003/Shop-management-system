import { apiClient, RequestOptions } from './client';
import type { Branch } from '../store/branch-store';

export interface LoginRequest {
  identifier: string;
  password: string;
  businessSlug?: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    isOwner: boolean;
    role: {
      id: string;
      name: string;
      code: string;
    };
    permissions: string[];
  };
  business: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    timezone: string;
    subscription: any;
  };
  branches: Branch[];
}

export interface OnboardRequest {
  businessName: string;
  businessSlug: string;
  legalName?: string;
  phone: string;
  email: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  password: string;
  branchName: string;
  branchCode?: string;
  branchAddress: string;
  branchCity?: string;
  branchPhone?: string;
  planCode?: string;
}

export interface OnboardResponse {
  message: string;
  accessToken: string;
  business: {
    id: string;
    name: string;
    slug: string;
    phone: string;
    email: string;
  };
  mainBranch: Branch;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    isOwner: boolean;
  };
  subscription: any;
}

export interface RoleDto {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  usersCount: number;
  permissionsCount: number;
  permissions: {
    id: string;
    code: string;
    name: string;
    module: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface PermissionGroup {
  module: string;
  permissions: {
    id: string;
    code: string;
    name: string;
    module: string;
    description?: string;
  }[];
}

export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  isOwner: boolean;
  isActive: boolean;
  role: {
    id: string;
    name: string;
    code: string;
    isSystem: boolean;
    permissions?: string[];
  };
  branches: {
    id: string;
    name: string;
    code: string;
    isDefault: boolean;
  }[];
  defaultBranch: {
    id: string;
    name: string;
    code: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponse {
  data: UserDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserSessionDto {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
}

export const api = {
  // Auth Endpoints
  auth: {
    login: (data: LoginRequest) =>
      apiClient.post<LoginResponse>('/api/v1/auth/login', data, { skipBranchHeader: true }),

    logout: () => apiClient.post<{ success: boolean }>('/api/v1/auth/logout'),

    getProfile: () => apiClient.get<LoginResponse>('/api/v1/auth/me', { skipBranchHeader: true }),

    updateProfile: (data: { firstName?: string; lastName?: string; phone?: string; email?: string }) =>
      apiClient.patch<LoginResponse>('/api/v1/auth/profile', data),

    getSessions: () => apiClient.get<UserSessionDto[]>('/api/v1/auth/sessions'),

    revokeSession: (sessionId: string) =>
      apiClient.delete<{ success: boolean }>(`/api/v1/auth/sessions/${sessionId}`),

    logoutAllDevices: () => apiClient.post<{ message: string }>('/api/v1/auth/logout-all'),

    changePassword: (data: { oldPassword: string; newPassword: string }) =>
      apiClient.post<{ success: boolean }>('/api/v1/auth/change-password', data),

    forgotPassword: (identifier: string) =>
      apiClient.post<{ success: boolean; message: string }>('/api/v1/auth/forgot-password', { identifier }),

    resetPassword: (data: { identifier: string; otp: string; newPassword: string }) =>
      apiClient.post<{ success: boolean; message: string }>('/api/v1/auth/reset-password', data),
  },

  // Onboarding Endpoint
  onboarding: {
    onboard: (data: OnboardRequest, options?: RequestOptions) =>
      apiClient.post<OnboardResponse>('/api/v1/onboarding', data, {
        ...options,
        skipBranchHeader: true,
      }),
  },

  // Branches
  branches: {
    list: (includeInactive = false) =>
      apiClient.get<Branch[]>('/api/v1/branches', {
        params: { includeInactive: String(includeInactive) },
        skipBranchHeader: true,
      }),

    get: (id: string) => apiClient.get<Branch>(`/api/v1/branches/${id}`),

    create: (data: any, options?: RequestOptions) =>
      apiClient.post<Branch>('/api/v1/branches', data, options),

    update: (id: string, data: any) => apiClient.patch<Branch>(`/api/v1/branches/${id}`, data),

    deactivate: (id: string) => apiClient.delete(`/api/v1/branches/${id}`),
  },

  // Roles & Permissions
  roles: {
    list: () => apiClient.get<RoleDto[]>('/api/v1/roles'),

    get: (id: string) => apiClient.get<RoleDto>(`/api/v1/roles/${id}`),

    create: (data: { name: string; code?: string; description?: string; permissionCodes: string[] }, options?: RequestOptions) =>
      apiClient.post<RoleDto>('/api/v1/roles', data, options),

    update: (id: string, data: { name?: string; description?: string; permissionCodes?: string[] }) =>
      apiClient.patch<RoleDto>(`/api/v1/roles/${id}`, data),

    delete: (id: string) => apiClient.delete<{ success: boolean; message: string }>(`/api/v1/roles/${id}`),

    listPermissions: () => apiClient.get<PermissionGroup[]>('/api/v1/permissions'),
  },

  // Users
  users: {
    list: (params: { page?: number; limit?: number; search?: string; roleId?: string; branchId?: string; isActive?: boolean }) =>
      apiClient.get<UserListResponse>('/api/v1/users', { params }),

    get: (id: string) => apiClient.get<UserDto>(`/api/v1/users/${id}`),

    create: (
      data: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        password: string;
        roleId: string;
        branches: { branchId: string; isDefault?: boolean }[];
      },
      options?: RequestOptions,
    ) => apiClient.post<UserDto>('/api/v1/users', data, options),

    update: (
      id: string,
      data: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        roleId?: string;
      },
    ) => apiClient.patch<UserDto>(`/api/v1/users/${id}`, data),

    updateStatus: (id: string, isActive: boolean) =>
      apiClient.patch<{ success: boolean; message: string }>(`/api/v1/users/${id}/status`, { isActive }),

    updateBranches: (id: string, branches: { branchId: string; isDefault?: boolean }[]) =>
      apiClient.put<UserDto>(`/api/v1/users/${id}/branches`, { branches }),

    resetPassword: (id: string, newPassword: string) =>
      apiClient.post<{ success: boolean; message: string }>(`/api/v1/users/${id}/reset-password`, { newPassword }),
  },
};
