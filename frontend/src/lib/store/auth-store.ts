import { create } from 'zustand';

export interface UserRole {
  id: string;
  name: string;
  code: string;
}

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  isOwner: boolean;
  role: UserRole;
}

export interface BusinessInfo {
  id: string;
  name: string;
  slug: string;
  currency?: string;
  timezone?: string;
  subscription?: {
    status: string;
    planName?: string;
    trialEndsAt?: string;
    currentPeriodEnd?: string;
    limits?: any;
  } | null;
  warning?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  business: BusinessInfo | null;
  permissions: string[];
  accessToken: string | null;
  isAuthenticated: boolean;
  isSuspended: boolean;
  isLoadingSession: boolean;

  setAuth: (payload: {
    user: Omit<AuthUser, 'fullName'>;
    business: BusinessInfo;
    accessToken?: string | null;
    permissions?: string[];
  }) => void;
  updateUserProfile: (updates: Partial<AuthUser>) => void;
  setToken: (token: string | null) => void;
  setLoadingSession: (loading: boolean) => void;
  clearAuth: () => void;
  hasPermission: (permissionCode: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  business: null,
  permissions: [],
  accessToken: null,
  isAuthenticated: false,
  isSuspended: false,
  isLoadingSession: true,

  setAuth: ({ user, business, accessToken, permissions = [] }) => {
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    const isSuspended = business.subscription?.status === 'SUSPENDED';

    set((state) => ({
      user: { ...user, fullName },
      business,
      accessToken: accessToken !== undefined ? accessToken : state.accessToken,
      permissions,
      isAuthenticated: true,
      isSuspended,
      isLoadingSession: false,
    }));
  },

  updateUserProfile: (updates) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...updates };
      updatedUser.fullName = `${updatedUser.firstName} ${updatedUser.lastName}`.trim();
      return { user: updatedUser };
    });
  },

  setToken: (accessToken) => {
    set({ accessToken });
  },

  setLoadingSession: (isLoadingSession) => {
    set({ isLoadingSession });
  },

  clearAuth: () => {
    set({
      user: null,
      business: null,
      permissions: [],
      accessToken: null,
      isAuthenticated: false,
      isSuspended: false,
      isLoadingSession: false,
    });
  },

  hasPermission: (permissionCode: string) => {
    const { user, permissions } = get();
    if (!user) return false;
    // Owner has wildcard '*' permission
    if (user.isOwner || permissions.includes('*')) return true;
    return permissions.includes(permissionCode);
  },
}));
