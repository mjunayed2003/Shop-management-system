import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useAuthStore } from '@/lib/store/auth-store';

describe('PermissionGate Component', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('hides children when user lacks required permission', () => {
    useAuthStore.getState().setAuth({
      user: {
        id: 'u-1',
        firstName: 'Staff',
        lastName: 'Member',
        email: 'staff@test.com',
        phone: '01700000000',
        isOwner: false,
        role: { id: 'r-1', name: 'Cashier', code: 'CASHIER' },
      },
      business: { id: 'b-1', name: 'Shop', slug: 'shop' },
      permissions: ['sales:create', 'sales:read'],
    });

    render(
      <PermissionGate permission="roles:manage">
        <button data-testid="secret-btn">Manage Roles</button>
      </PermissionGate>,
    );

    expect(screen.queryByTestId('secret-btn')).not.toBeInTheDocument();
  });

  it('renders children when user possesses required permission', () => {
    useAuthStore.getState().setAuth({
      user: {
        id: 'u-1',
        firstName: 'Manager',
        lastName: 'User',
        email: 'manager@test.com',
        phone: '01700000000',
        isOwner: false,
        role: { id: 'r-1', name: 'Manager', code: 'MANAGER' },
      },
      business: { id: 'b-1', name: 'Shop', slug: 'shop' },
      permissions: ['users:read', 'users:create'],
    });

    render(
      <PermissionGate permission="users:read">
        <button data-testid="visible-btn">View Users</button>
      </PermissionGate>,
    );

    expect(screen.getByTestId('visible-btn')).toBeInTheDocument();
  });

  it('owner with isOwner: true bypasses all permission checks', () => {
    useAuthStore.getState().setAuth({
      user: {
        id: 'u-owner',
        firstName: 'Shop',
        lastName: 'Owner',
        email: 'owner@test.com',
        phone: '01700000000',
        isOwner: true,
        role: { id: 'r-owner', name: 'Owner', code: 'OWNER' },
      },
      business: { id: 'b-1', name: 'Shop', slug: 'shop' },
      permissions: ['*'],
    });

    render(
      <PermissionGate permission="special:unassigned:permission">
        <span data-testid="owner-access">Owner Access Guaranteed</span>
      </PermissionGate>,
    );

    expect(screen.getByTestId('owner-access')).toBeInTheDocument();
  });

  it('renders fallback when specified and permission denied', () => {
    render(
      <PermissionGate
        permission="admin:access"
        fallback={<p data-testid="denied-msg">Permission Denied</p>}
      >
        <span>Restricted</span>
      </PermissionGate>,
    );

    expect(screen.getByTestId('denied-msg')).toBeInTheDocument();
  });
});
