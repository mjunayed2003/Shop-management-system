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

  // Catalog
  catalog: {
    // Master Data: Categories
    categories: {
      list: (params?: { search?: string; includeInactive?: boolean }) =>
        apiClient.get<any[]>('/api/v1/catalog/categories', { params }),
      get: (id: string) => apiClient.get<any>(`/api/v1/catalog/categories/${id}`),
      create: (data: { name: string; code?: string; parentId?: string }, options?: RequestOptions) =>
        apiClient.post<any>('/api/v1/catalog/categories', data, options),
      update: (id: string, data: { name?: string; code?: string; parentId?: string | null; isActive?: boolean }) =>
        apiClient.patch<any>(`/api/v1/catalog/categories/${id}`, data),
      delete: (id: string) => apiClient.delete<any>(`/api/v1/catalog/categories/${id}`),
    },

    // Master Data: Brands
    brands: {
      list: (params?: { search?: string }) =>
        apiClient.get<any[]>('/api/v1/catalog/brands', { params }),
      get: (id: string) => apiClient.get<any>(`/api/v1/catalog/brands/${id}`),
      create: (data: { name: string; code?: string }, options?: RequestOptions) =>
        apiClient.post<any>('/api/v1/catalog/brands', data, options),
      update: (id: string, data: { name?: string; code?: string; isActive?: boolean }) =>
        apiClient.patch<any>(`/api/v1/catalog/brands/${id}`, data),
      delete: (id: string) => apiClient.delete<any>(`/api/v1/catalog/brands/${id}`),
    },

    // Master Data: Seasons
    seasons: {
      list: (params?: { search?: string }) =>
        apiClient.get<any[]>('/api/v1/catalog/seasons', { params }),
      get: (id: string) => apiClient.get<any>(`/api/v1/catalog/seasons/${id}`),
      create: (data: { name: string; code?: string }, options?: RequestOptions) =>
        apiClient.post<any>('/api/v1/catalog/seasons', data, options),
      update: (id: string, data: { name?: string; code?: string; isActive?: boolean }) =>
        apiClient.patch<any>(`/api/v1/catalog/seasons/${id}`, data),
      delete: (id: string) => apiClient.delete<any>(`/api/v1/catalog/seasons/${id}`),
    },

    // Master Data: Sizes
    sizes: {
      list: () => apiClient.get<any[]>('/api/v1/catalog/sizes'),
      get: (id: string) => apiClient.get<any>(`/api/v1/catalog/sizes/${id}`),
      create: (data: { name: string; code?: string; sortOrder?: number }, options?: RequestOptions) =>
        apiClient.post<any>('/api/v1/catalog/sizes', data, options),
      update: (id: string, data: { name?: string; code?: string; sortOrder?: number; isActive?: boolean }) =>
        apiClient.patch<any>(`/api/v1/catalog/sizes/${id}`, data),
      delete: (id: string) => apiClient.delete<any>(`/api/v1/catalog/sizes/${id}`),
    },

    // Master Data: Colors
    colors: {
      list: () => apiClient.get<any[]>('/api/v1/catalog/colors'),
      get: (id: string) => apiClient.get<any>(`/api/v1/catalog/colors/${id}`),
      create: (data: { name: string; code?: string; hexCode?: string }, options?: RequestOptions) =>
        apiClient.post<any>('/api/v1/catalog/colors', data, options),
      update: (id: string, data: { name?: string; code?: string; hexCode?: string; isActive?: boolean }) =>
        apiClient.patch<any>(`/api/v1/catalog/colors/${id}`, data),
      delete: (id: string) => apiClient.delete<any>(`/api/v1/catalog/colors/${id}`),
    },

    // Master Data: Units
    units: {
      list: () => apiClient.get<any[]>('/api/v1/catalog/units'),
      get: (id: string) => apiClient.get<any>(`/api/v1/catalog/units/${id}`),
      create: (data: { name: string; code?: string; allowDecimal?: boolean }, options?: RequestOptions) =>
        apiClient.post<any>('/api/v1/catalog/units', data, options),
      update: (id: string, data: { name?: string; code?: string; allowDecimal?: boolean; isActive?: boolean }) =>
        apiClient.patch<any>(`/api/v1/catalog/units/${id}`, data),
      delete: (id: string) => apiClient.delete<any>(`/api/v1/catalog/units/${id}`),
    },

    // Products
    products: {
      list: (params?: {
        page?: number;
        limit?: number;
        search?: string;
        categoryId?: string;
        brandId?: string;
        seasonId?: string;
        gender?: string;
        isActive?: boolean;
        branchId?: string;
        sortBy?: string;
        sortOrder?: string;
      }) =>
        apiClient.get<{
          data: any[];
          meta: { total: number; page: number; limit: number; totalPages: number };
        }>('/api/v1/catalog/products', { params }),

      get: (id: string) => apiClient.get<any>(`/api/v1/catalog/products/${id}`),

      create: (data: any, options?: RequestOptions) =>
        apiClient.post<any>('/api/v1/catalog/products', data, options),

      update: (id: string, data: any) =>
        apiClient.patch<any>(`/api/v1/catalog/products/${id}`, data),

      delete: (id: string) => apiClient.delete<any>(`/api/v1/catalog/products/${id}`),
    },

    // Variants
    variants: {
      create: (productId: string, data: any, options?: RequestOptions) =>
        apiClient.post<any>(`/api/v1/catalog/variants/products/${productId}`, data, options),

      update: (id: string, data: any) =>
        apiClient.patch<any>(`/api/v1/catalog/variants/${id}`, data),

      deactivate: (id: string) =>
        apiClient.delete<any>(`/api/v1/catalog/variants/${id}`),

      bulkGenerate: (productId: string, data: any, options?: RequestOptions) =>
        apiClient.post<any>(`/api/v1/catalog/variants/products/${productId}/bulk`, data, options),
    },

    // Product Branches
    branches: {
      activate: (data: { productId: string; branchId: string }) =>
        apiClient.post<any>('/api/v1/catalog/product-branches/activate', data),

      deactivate: (data: { productId: string; branchId: string; force?: boolean }) =>
        apiClient.post<any>('/api/v1/catalog/product-branches/deactivate', data),
    },

    productBranches: {
      activate: (data: { productId: string; branchId: string }) =>
        apiClient.post<any>('/api/v1/catalog/product-branches/activate', data),

      deactivate: (data: { productId: string; branchId: string; force?: boolean }) =>
        apiClient.post<any>('/api/v1/catalog/product-branches/deactivate', data),
    },

    // Barcodes
    barcodes: {
      lookup: (barcode: string) =>
        apiClient.get<any>(`/api/v1/catalog/barcodes/lookup/${encodeURIComponent(barcode)}`),

      print: (data: {
        variantId: string;
        productUnitId?: string;
        quantity?: number;
        printType?: 'INITIAL_PRINT' | 'REPRINT';
        reason?: string;
      }) => apiClient.post<any>('/api/v1/catalog/barcodes/print', data),
    },

    // Price Lists
    priceLists: {
      list: () => apiClient.get<any[]>('/api/v1/catalog/price-lists'),

      get: (id: string) => apiClient.get<any>(`/api/v1/catalog/price-lists/${id}`),

      create: (data: { name: string; code?: string; type?: string; isDefault?: boolean }, options?: RequestOptions) =>
        apiClient.post<any>('/api/v1/catalog/price-lists', data, options),

      update: (id: string, data: { name?: string; isDefault?: boolean; isActive?: boolean }) =>
        apiClient.patch<any>(`/api/v1/catalog/price-lists/${id}`, data),

      setItem: (id: string, data: { variantId: string; price: number }) =>
        apiClient.post<any>(`/api/v1/catalog/price-lists/${id}/items`, data),

      removeItem: (id: string, variantId: string) =>
        apiClient.delete<any>(`/api/v1/catalog/price-lists/${id}/items/${variantId}`),
    },
  },

  // Purchasing & Suppliers
  purchases: {
    // Suppliers
    suppliers: {
      list: (params?: { page?: number; limit?: number; search?: string; isActive?: boolean }) =>
        apiClient.get<{
          data: any[];
          meta: { page: number; limit: number; total: number; totalPages: number };
        }>('/api/v1/inventory/suppliers', { params }),

      get: (id: string) =>
        apiClient.get<any>(`/api/v1/inventory/suppliers/${id}`),

      create: (
        data: {
          name: string;
          code: string;
          companyName?: string;
          phone: string;
          email?: string;
          address?: string;
          city?: string;
          openingBalance?: number;
        },
        options?: RequestOptions,
      ) => apiClient.post<any>('/api/v1/inventory/suppliers', data, options),

      update: (
        id: string,
        data: {
          name?: string;
          companyName?: string;
          phone?: string;
          email?: string;
          address?: string;
          city?: string;
          isActive?: boolean;
        },
      ) => apiClient.patch<any>(`/api/v1/inventory/suppliers/${id}`, data),

      delete: (id: string) =>
        apiClient.delete<any>(`/api/v1/inventory/suppliers/${id}`),

      ledger: (id: string, params?: { startDate?: string; endDate?: string }) =>
        apiClient.get<{
          supplier: {
            id: string;
            name: string;
            code: string;
            openingBalance: number;
            currentBalance: number;
          };
          ledger: {
            date: string;
            type: 'PURCHASE' | 'RETURN' | 'PAYMENT';
            referenceNo: string;
            description?: string | null;
            debit: number;
            credit: number;
            amount: number;
            runningBalance: number;
          }[];
        }>(`/api/v1/inventory/suppliers/${id}/ledger`, { params }),
    },

    // Purchase Orders
    orders: {
      list: (params?: { page?: number; limit?: number; status?: string; supplierId?: string; search?: string }) =>
        apiClient.get<{
          data: any[];
          meta: { page: number; limit: number; total: number; totalPages: number };
        }>('/api/v1/inventory/purchase-orders', { params }),

      get: (id: string) =>
        apiClient.get<any>(`/api/v1/inventory/purchase-orders/${id}`),

      create: (
        data: {
          supplierId: string;
          expectedDelivery?: string;
          notes?: string;
          items: { variantId: string; quantity: number; unitCost: number }[];
        },
        options?: RequestOptions,
      ) => apiClient.post<any>('/api/v1/inventory/purchase-orders', data, options),

      update: (
        id: string,
        data: {
          supplierId?: string;
          expectedDelivery?: string;
          notes?: string;
          items?: { variantId: string; quantity: number; unitCost: number }[];
        },
      ) => apiClient.patch<any>(`/api/v1/inventory/purchase-orders/${id}`, data),

      issue: (id: string) =>
        apiClient.post<any>(`/api/v1/inventory/purchase-orders/${id}/issue`),

      cancel: (id: string) =>
        apiClient.post<any>(`/api/v1/inventory/purchase-orders/${id}/cancel`),
    },

    // Purchases (Goods Receipts)
    purchases: {
      list: (params?: {
        page?: number;
        limit?: number;
        status?: string;
        supplierId?: string;
        search?: string;
        startDate?: string;
        endDate?: string;
      }) =>
        apiClient.get<{
          data: any[];
          meta: { page: number; limit: number; total: number; totalPages: number };
        }>('/api/v1/inventory/purchases', { params }),

      get: (id: string) =>
        apiClient.get<any>(`/api/v1/inventory/purchases/${id}`),

      create: (
        data: {
          supplierId: string;
          purchaseOrderId?: string;
          supplierInvoiceNo?: string;
          purchaseDate?: string;
          discountAmount?: number;
          taxAmount?: number;
          shippingCost?: number;
          paidAmount?: number;
          paymentMethod?: string;
          paymentReference?: string;
          landedCost?: boolean;
          notes?: string;
          items: {
            variantId: string;
            quantity: number;
            unitCost: number;
            vatPercentage?: number;
          }[];
        },
        options?: RequestOptions,
      ) => apiClient.post<any>('/api/v1/inventory/purchases', data, options),

      cancel: (id: string) =>
        apiClient.post<any>(`/api/v1/inventory/purchases/${id}/cancel`),
    },

    // Supplier Payments
    payments: {
      list: (params?: { page?: number; limit?: number; supplierId?: string; purchaseId?: string; search?: string }) =>
        apiClient.get<{
          data: any[];
          meta: { page: number; limit: number; total: number; totalPages: number };
        }>('/api/v1/inventory/supplier-payments', { params }),

      get: (id: string) =>
        apiClient.get<any>(`/api/v1/inventory/supplier-payments/${id}`),

      create: (
        data: {
          supplierId: string;
          purchaseId?: string;
          amount: number;
          paymentMethod: string;
          referenceNo?: string;
          paymentDate?: string;
          notes?: string;
        },
        options?: RequestOptions,
      ) => apiClient.post<any>('/api/v1/inventory/supplier-payments', data, options),
    },

    // Purchase Returns
    returns: {
      list: (params?: { page?: number; limit?: number; status?: string; supplierId?: string; purchaseId?: string }) =>
        apiClient.get<{
          data: any[];
          meta: { page: number; limit: number; total: number; totalPages: number };
        }>('/api/v1/inventory/purchase-returns', { params }),

      get: (id: string) =>
        apiClient.get<any>(`/api/v1/inventory/purchase-returns/${id}`),

      create: (
        data: {
          supplierId: string;
          purchaseId?: string;
          reason?: string;
          status?: 'DRAFT' | 'COMPLETED';
          items: { variantId: string; quantity: number; unitCost: number }[];
        },
        options?: RequestOptions,
      ) => apiClient.post<any>('/api/v1/inventory/purchase-returns', data, options),

      complete: (id: string) =>
        apiClient.post<any>(`/api/v1/inventory/purchase-returns/${id}/complete`),

      cancel: (id: string) =>
        apiClient.post<any>(`/api/v1/inventory/purchase-returns/${id}/cancel`),
    },
  },

  // Inventory & Stock
  inventory: {
    stock: {
      list: (params?: {
        page?: number;
        limit?: number;
        brandId?: string;
        categoryId?: string;
        seasonId?: string;
        gender?: string;
        lowStockOnly?: boolean;
        zeroStockOnly?: boolean;
        search?: string;
      }) =>
        apiClient.get<{
          data: any[];
          meta: { page: number; limit: number; total: number; totalPages: number };
          totals?: { totalQuantity: number; totalCostValue: number };
        }>('/api/v1/inventory/stock', { params }),

      summary: () =>
        apiClient.get<{
          summary: { totalQuantity: number; totalCostValue: number; totalVariants: number };
          byBrand: any[];
          byCategory: any[];
          variants: any[];
        }>('/api/v1/inventory/stock/all-branches-summary'),

      movements: (params: {
        page?: number;
        limit?: number;
        variantId?: string;
        movementType?: string;
        referenceType?: string;
        startDate?: string;
        endDate?: string;
      }) =>
        apiClient.get<{
          data: any[];
          meta: { total: number; page: number; limit: number; totalPages: number };
        }>('/api/v1/inventory/stock/movements', { params }),

      lowStockReport: () =>
        apiClient.get<{
          branchId: string;
          totalLowStockVariants: number;
          items: any[];
        }>('/api/v1/inventory/stock/low-stock-report'),

      valuation: () =>
        apiClient.get<{
          branchId: string;
          totalQuantity: number;
          totalCostValue: number;
          totalItems: number;
          totalVariants?: number;
          totalUnits?: number;
          byCategory: any[];
          byBrand: any[];
        }>('/api/v1/inventory/stock/valuation'),

      enterOpening: (
        data: {
          variantId: string;
          quantity: number;
          unitCost: number;
        },
        options?: RequestOptions,
      ) => apiClient.post<any>('/api/v1/inventory/stock/opening', data, options),

      checkConsistency: () =>
        apiClient.get<{
          totalBalancesChecked: number;
          mismatchCount: number;
          mismatches: any[];
        }>('/api/v1/inventory/stock/consistency-check'),
    },

    transfers: {
      list: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
        apiClient.get<{
          data: any[];
          meta: { page: number; limit: number; total: number; totalPages: number };
        }>('/api/v1/inventory/transfers', { params }),

      get: (id: string) =>
        apiClient.get<any>(`/api/v1/inventory/transfers/${id}`),

      create: (
        data: {
          toBranchId: string;
          notes?: string;
          items: { variantId: string; sentQty: number }[];
        },
        options?: RequestOptions,
      ) => apiClient.post<any>('/api/v1/inventory/transfers', data, options),

      dispatch: (id: string) =>
        apiClient.post<any>(`/api/v1/inventory/transfers/${id}/dispatch`),

      receive: (
        id: string,
        data: {
          items: { itemId: string; receivedQty: number; discrepancyNote?: string }[];
        },
      ) => apiClient.post<any>(`/api/v1/inventory/transfers/${id}/receive`, data),

      reject: (id: string) =>
        apiClient.post<any>(`/api/v1/inventory/transfers/${id}/reject`),

      cancel: (id: string) =>
        apiClient.post<any>(`/api/v1/inventory/transfers/${id}/cancel`),

      instant: (
        data: {
          fromBranchId: string;
          toBranchId: string;
          notes?: string;
          idempotencyKey?: string;
          items: { variantId: string; quantity: number }[];
        },
        options?: RequestOptions,
      ) => apiClient.post<any>('/api/v1/inventory/transfers/instant', data, options),
    },

    adjustments: {
      list: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
        apiClient.get<{
          data: any[];
          meta: { page: number; limit: number; total: number; totalPages: number };
        }>('/api/v1/inventory/adjustments', { params }),

      get: (id: string) =>
        apiClient.get<any>(`/api/v1/inventory/adjustments/${id}`),

      create: (
        data: {
          reason: string;
          notes?: string;
          items: { variantId: string; physicalQty: number }[];
        },
        options?: RequestOptions,
      ) => apiClient.post<any>('/api/v1/inventory/adjustments', data, options),

      approve: (id: string) =>
        apiClient.post<any>(`/api/v1/inventory/adjustments/${id}/approve`),

      cancel: (id: string) =>
        apiClient.post<any>(`/api/v1/inventory/adjustments/${id}/cancel`),
    },

    stocktakes: {
      list: (params?: { page?: number; limit?: number; status?: string }) =>
        apiClient.get<{
          data: any[];
          meta: { page: number; limit: number; total: number; totalPages: number };
        }>('/api/v1/inventory/stocktakes', { params }),

      get: (id: string) =>
        apiClient.get<any>(`/api/v1/inventory/stocktakes/${id}`),

      start: (
        data: { categoryId?: string; brandId?: string; notes?: string },
        options?: RequestOptions,
      ) => apiClient.post<any>('/api/v1/inventory/stocktakes/start', data, options),

      recordCounts: (
        id: string,
        data: { counts: { itemId: string; countedQty: number }[] },
      ) => apiClient.post<any>(`/api/v1/inventory/stocktakes/${id}/counts`, data),

      complete: (id: string, data?: { createAdjustment?: boolean }) =>
        apiClient.post<any>(`/api/v1/inventory/stocktakes/${id}/complete`, data),

      cancel: (id: string) =>
        apiClient.post<any>(`/api/v1/inventory/stocktakes/${id}/cancel`),
    },

    damagedStock: {
      list: (params?: { page?: number; limit?: number; status?: string }) =>
        apiClient.get<{
          data: any[];
          meta: { page: number; limit: number; total: number; totalPages: number };
        }>('/api/v1/inventory/damaged-stock', { params }),

      report: (
        data: { variantId: string; quantity: number; reason: string },
        options?: RequestOptions,
      ) => apiClient.post<any>('/api/v1/inventory/damaged-stock', data, options),

      approve: (id: string) =>
        apiClient.post<any>(`/api/v1/inventory/damaged-stock/${id}/approve`),

      writeOff: (id: string) =>
        apiClient.post<any>(`/api/v1/inventory/damaged-stock/${id}/write-off`),
    },
  },

  // Customers (Business-Wide)
  customers: {
    list: (params?: { page?: number; limit?: number; search?: string }) =>
      apiClient.get<{
        data: any[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>('/api/v1/customers', { params }),

    get: (id: string) => apiClient.get<any>(`/api/v1/customers/${id}`),

    lookup: (phone: string) =>
      apiClient.get<any>('/api/v1/customers/lookup', { params: { phone } }),

    quickCreate: (data: { name: string; phone: string }, options?: RequestOptions) =>
      apiClient.post<any>('/api/v1/customers/quick', data, options),

    create: (data: any, options?: RequestOptions) =>
      apiClient.post<any>('/api/v1/customers', data, options),

    update: (id: string, data: any) =>
      apiClient.put<any>(`/api/v1/customers/${id}`, data),

    delete: (id: string) =>
      apiClient.delete<any>(`/api/v1/customers/${id}`),

    ledger: (id: string, params?: { startDate?: string; endDate?: string; page?: number; limit?: number }) =>
      apiClient.get<any>(`/api/v1/customers/ledger/${id}`, { params }),

    dueSummary: () =>
      apiClient.get<any>('/api/v1/customers/due-summary'),
  },

  // Sales & POS
  sales: {
    calculate: (data: {
      items: {
        variantId?: string;
        barcode?: string;
        quantity: number;
        unitPrice?: number;
        discountAmount?: number;
        sourceBranchId?: string;
        productUnitBarcode?: string;
      }[];
      saleType?: 'RETAIL' | 'WHOLESALE';
      customerId?: string;
      couponCode?: string;
    }) => apiClient.post<any>('/api/v1/sales/calculate', data),

    create: (
      data: {
        idempotencyKey: string;
        customerId?: string;
        saleType?: 'RETAIL' | 'WHOLESALE';
        items: {
          variantId?: string;
          barcode?: string;
          quantity: number;
          unitPrice?: number;
          discountAmount?: number;
          sourceBranchId?: string;
          productUnitBarcode?: string;
          productUnitBarcodes?: string[];
        }[];
        payments: {
          paymentMethod: string;
          amount: number;
          transactionNo?: string;
          idempotencyKey?: string;
        }[];
        couponCode?: string;
        notes?: string;
        registerSessionId?: string;
        isOffline?: boolean;
      },
      options?: RequestOptions,
    ) => apiClient.post<any>('/api/v1/sales', data, options),

    list: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      customerId?: string;
      saleType?: string;
      startDate?: string;
      endDate?: string;
      cashierId?: string;
      branchId?: string;
    }) =>
      apiClient.get<{
        data: any[];
        meta: { page: number; limit: number; total: number; totalPages: number };
        summary?: { totalSalesCount: number; totalSalesAmount: number; totalPaidAmount: number; totalDueAmount: number };
      }>('/api/v1/sales', { params }),

    get: (identifier: string) =>
      apiClient.get<any>(`/api/v1/sales/${encodeURIComponent(identifier)}`),

    void: (id: string, data: { reason: string }) =>
      apiClient.post<any>(`/api/v1/sales/${id}/void`, data),

    dailySummary: (params?: { date?: string }) =>
      apiClient.get<any>('/api/v1/sales/reports/daily-summary', { params }),

    byGroup: (params?: { startDate?: string; endDate?: string; groupBy?: 'product' | 'brand' | 'category' }) =>
      apiClient.get<any>('/api/v1/sales/reports/by-group', { params }),

    // Held Carts
    held: {
      hold: (
        data: {
          referenceName: string;
          customerId?: string;
          items: { variantId: string; quantity: number; unitPrice?: number; discountAmount?: number }[];
        },
        options?: RequestOptions,
      ) => apiClient.post<any>('/api/v1/sales/held', data, options),

      list: () => apiClient.get<any[]>('/api/v1/sales/held'),

      retrieve: (id: string) => apiClient.post<any>(`/api/v1/sales/held/${id}/retrieve`),

      delete: (id: string) => apiClient.delete<any>(`/api/v1/sales/held/${id}`),
    },

    // Register Sessions
    registerSessions: {
      current: () => apiClient.get<any>('/api/v1/sales/register-sessions/current'),

      open: (
        data: { cashRegisterId: string; openingBalance: number },
        options?: RequestOptions,
      ) => apiClient.post<any>('/api/v1/sales/register-sessions/open', data, options),

      close: (
        data: { closingBalance: number; registerSessionId?: string },
        options?: RequestOptions,
      ) => apiClient.post<any>('/api/v1/sales/register-sessions/close', data, options),

      summary: () => apiClient.get<any>('/api/v1/sales/register-sessions/summary'),

      summaryById: (id: string) =>
        apiClient.get<any>(`/api/v1/sales/register-sessions/${id}/summary`),

      cashMovements: (sessionId?: string) =>
        apiClient.get<any[]>('/api/v1/sales/register-sessions/cash-movements', {
          params: sessionId ? { sessionId } : undefined,
        }),

      createCashMovement: (
        data: {
          type: 'PAY_IN' | 'PAY_OUT';
          amount: number;
          reason: string;
          registerSessionId?: string;
        },
        options?: RequestOptions,
      ) => apiClient.post<any>('/api/v1/sales/register-sessions/cash-movements', data, options),

      cashBook: (params?: { date?: string }) =>
        apiClient.get<any>('/api/v1/sales/register-sessions/cash-book', { params }),
    },
  },

  // Aliases for quick access
  categories: {
    list: (params?: { search?: string; includeInactive?: boolean }) =>
      apiClient.get<any[]>('/api/v1/catalog/categories', { params }),
    get: (id: string) => apiClient.get<any>(`/api/v1/catalog/categories/${id}`),
  },

  products: {
    list: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      categoryId?: string;
      brandId?: string;
      seasonId?: string;
      gender?: string;
      isActive?: boolean;
      branchId?: string;
      sortBy?: string;
      sortOrder?: string;
    }) =>
      apiClient.get<{
        data: any[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      }>('/api/v1/catalog/products', { params }),
    get: (id: string) => apiClient.get<any>(`/api/v1/catalog/products/${id}`),
  },

  barcodes: {
    lookup: (barcode: string) =>
      apiClient.get<any>(`/api/v1/catalog/barcodes/lookup/${encodeURIComponent(barcode)}`),
    print: (data: {
      variantId: string;
      productUnitId?: string;
      quantity?: number;
      printType?: 'INITIAL_PRINT' | 'REPRINT';
      reason?: string;
    }) => apiClient.post<any>('/api/v1/catalog/barcodes/print', data),
  },
};
