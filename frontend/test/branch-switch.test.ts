import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBranchStore } from '@/lib/store/branch-store';
import { apiClient } from '@/lib/api/client';
import type { QueryClient } from '@tanstack/react-query';

describe('Branch Switching and x-branch-id header', () => {
  let mockQueryClient: QueryClient;

  beforeEach(() => {
    useBranchStore.getState().clearBranchState();
    mockQueryClient = {
      clear: vi.fn(),
      resetQueries: vi.fn(),
    } as unknown as QueryClient;
  });

  it('sets branches and auto-selects default branch', () => {
    const branches = [
      { id: 'b-1', name: 'Dhanmondi', code: 'DHD', is_default: false },
      { id: 'b-2', name: 'Gulshan Main', code: 'GLS', is_default: true },
    ];

    useBranchStore.getState().setBranches(branches);

    const state = useBranchStore.getState();
    expect(state.currentBranchId).toBe('b-2');
    expect(state.currentBranch?.name).toBe('Gulshan Main');
  });

  it('switching branch clears ALL TanStack Query cache to prevent data leaks', () => {
    const branches = [
      { id: 'b-1', name: 'Dhanmondi', code: 'DHD' },
      { id: 'b-2', name: 'Gulshan', code: 'GLS' },
    ];

    useBranchStore.getState().setBranches(branches);
    expect(useBranchStore.getState().currentBranchId).toBe('b-1');

    // Switch to b-2
    useBranchStore.getState().switchBranch('b-2', mockQueryClient);

    expect(useBranchStore.getState().currentBranchId).toBe('b-2');
    expect(useBranchStore.getState().currentBranch?.name).toBe('Gulshan');
    // Verifies cache is completely cleared
    expect(mockQueryClient.clear).toHaveBeenCalledTimes(1);
  });

  it('apiClient cleanly strips business_id and branch_id from request bodies', async () => {
    const originalFetch = global.fetch;
    let interceptedBody: any = null;
    let interceptedHeaders: any = null;

    global.fetch = vi.fn().mockImplementation(async (_url, options) => {
      interceptedBody = options.body ? JSON.parse(options.body) : null;
      interceptedHeaders = options.headers;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      };
    });

    // Set branch in store
    useBranchStore.getState().setBranches([{ id: 'branch-uuid-999', name: 'Test Branch', code: 'TB' }]);

    // Make request sending forbidden body properties
    await apiClient.post('/api/test', {
      business_id: 'forbidden-biz',
      branch_id: 'forbidden-branch',
      businessId: 'forbidden-biz-camel',
      branchId: 'forbidden-branch-camel',
      itemName: 'Cotton Kurti',
      price: 1500,
    });

    // Verify headers have x-branch-id
    expect(interceptedHeaders['x-branch-id']).toBe('branch-uuid-999');

    // Verify body NEVER has business_id or branch_id
    expect(interceptedBody.business_id).toBeUndefined();
    expect(interceptedBody.branch_id).toBeUndefined();
    expect(interceptedBody.businessId).toBeUndefined();
    expect(interceptedBody.branchId).toBeUndefined();
    expect(interceptedBody.itemName).toBe('Cotton Kurti');

    global.fetch = originalFetch;
  });
});
