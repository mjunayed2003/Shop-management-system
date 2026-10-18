import { create } from 'zustand';

export const PlatformRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  PLATFORM_SUPPORT: 'PLATFORM_SUPPORT',
  BILLING_ADMIN: 'BILLING_ADMIN',
} as const;

export type PlatformRole = (typeof PlatformRole)[keyof typeof PlatformRole];

export interface PlatformAdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: PlatformRole;
}

interface PlatformAuthState {
  admin: PlatformAdminUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoadingSession: boolean;
  lastActivity: number;

  setPlatformAuth: (payload: { admin: PlatformAdminUser; accessToken: string }) => void;
  clearPlatformAuth: () => void;
  updateActivity: () => void;
  hasPlatformRole: (roles: PlatformRole | PlatformRole[]) => boolean;
}

const STORAGE_KEY = 'pos_platform_token';
const ADMIN_STORAGE_KEY = 'pos_platform_admin';

export const usePlatformAuthStore = create<PlatformAuthState>((set, get) => {
  // Initialize from client-side storage safely
  let initialToken: string | null = null;
  let initialAdmin: PlatformAdminUser | null = null;

  if (typeof window !== 'undefined') {
    initialToken = localStorage.getItem(STORAGE_KEY);
    const storedAdmin = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (storedAdmin) {
      try {
        initialAdmin = JSON.parse(storedAdmin);
      } catch {
        // ignore
      }
    }
  }

  return {
    admin: initialAdmin,
    accessToken: initialToken,
    isAuthenticated: Boolean(initialToken && initialAdmin),
    isLoadingSession: false,
    lastActivity: Date.now(),

    setPlatformAuth: ({ admin, accessToken }) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, accessToken);
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin));
      }
      set({
        admin,
        accessToken,
        isAuthenticated: true,
        isLoadingSession: false,
        lastActivity: Date.now(),
      });
    },

    clearPlatformAuth: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(ADMIN_STORAGE_KEY);
      }
      set({
        admin: null,
        accessToken: null,
        isAuthenticated: false,
        isLoadingSession: false,
        lastActivity: Date.now(),
      });
    },

    updateActivity: () => {
      set({ lastActivity: Date.now() });
    },

    hasPlatformRole: (required) => {
      const { admin } = get();
      if (!admin) return false;
      if (Array.isArray(required)) {
        return required.includes(admin.role);
      }
      return admin.role === required;
    },
  };
});
