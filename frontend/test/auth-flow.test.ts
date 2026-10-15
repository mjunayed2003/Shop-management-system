import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/lib/store/auth-store';

describe('Auth Flow, Protected Routes, and Suspended Lock State', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('populates auth store accurately on successful login', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    useAuthStore.getState().setAuth({
      user: {
        id: 'u-123',
        firstName: 'Kamal',
        lastName: 'Hossain',
        email: 'kamal@shop.com',
        phone: '01711000111',
        isOwner: true,
        role: { id: 'r-1', name: 'Business Owner', code: 'OWNER' },
      },
      business: {
        id: 'biz-1',
        name: 'Aarong Boutique',
        slug: 'aarong-boutique',
        currency: 'BDT',
        subscription: { status: 'TRIAL', planName: 'Starter Boutique' },
      },
      accessToken: 'jwt-access-token-sample',
      permissions: ['*'],
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.fullName).toBe('Kamal Hossain');
    expect(state.user?.isOwner).toBe(true);
    expect(state.isSuspended).toBe(false);
    expect(state.accessToken).toBe('jwt-access-token-sample');
    expect(state.hasPermission('any:random:permission')).toBe(true); // Owner wildcard
  });

  it('triggers isSuspended lock when subscription status is SUSPENDED', () => {
    useAuthStore.getState().setAuth({
      user: {
        id: 'u-suspended',
        firstName: 'Debtor',
        lastName: 'User',
        email: 'debtor@shop.com',
        phone: '01700000000',
        isOwner: true,
        role: { id: 'r-1', name: 'Owner', code: 'OWNER' },
      },
      business: {
        id: 'biz-suspended',
        name: 'Locked Shop Ltd.',
        slug: 'locked-shop',
        subscription: { status: 'SUSPENDED' },
      },
      accessToken: 'token-123',
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().isSuspended).toBe(true);
  });

  it('determines redirect back target correctly', () => {
    const getRedirectTarget = (urlParams: URLSearchParams | null) => {
      return urlParams?.get('redirect') || '/dashboard';
    };

    const paramsWithRedirect = new URLSearchParams('redirect=/roles?tab=matrix');
    expect(getRedirectTarget(paramsWithRedirect)).toBe('/roles?tab=matrix');

    const paramsEmpty = new URLSearchParams('');
    expect(getRedirectTarget(paramsEmpty)).toBe('/dashboard');
  });

  it('clears state on logout', () => {
    useAuthStore.getState().setAuth({
      user: {
        id: 'u-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        phone: '01700000000',
        isOwner: false,
        role: { id: 'r-1', name: 'Sales', code: 'SALES' },
      },
      business: { id: 'b-1', name: 'Shop', slug: 'shop' },
      accessToken: 'sample-token',
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().clearAuth();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
