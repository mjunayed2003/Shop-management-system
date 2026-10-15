import { create } from 'zustand';
import type { QueryClient } from '@tanstack/react-query';

export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  phone?: string;
  isMain?: boolean;
  isActive?: boolean;
  is_default?: boolean;
}

interface BranchState {
  currentBranchId: string | null;
  currentBranch: Branch | null;
  branches: Branch[];

  setBranches: (branches: Branch[]) => void;
  switchBranch: (branchId: string, queryClient?: QueryClient) => void;
  clearBranchState: () => void;
}

const BRANCH_STORAGE_KEY = 'pos_branch_id';

export const useBranchStore = create<BranchState>((set, get) => ({
  currentBranchId: null,
  currentBranch: null,
  branches: [],

  setBranches: (branches: Branch[]) => {
    if (!branches || branches.length === 0) {
      set({ branches: [], currentBranch: null, currentBranchId: null });
      return;
    }

    // Try reading persisted branch from storage
    let selectedId: string | null = null;
    try {
      selectedId = localStorage.getItem(BRANCH_STORAGE_KEY);
    } catch {
      // ignore
    }

    // If persisted branch is valid for this user
    let matchingBranch = branches.find((b) => b.id === selectedId);

    // If not found, look for default branch, or fallback to first
    if (!matchingBranch) {
      matchingBranch = branches.find((b) => b.is_default || b.isMain) || branches[0];
    }

    if (matchingBranch) {
      try {
        localStorage.setItem(BRANCH_STORAGE_KEY, matchingBranch.id);
      } catch {
        // ignore
      }
    }

    set({
      branches,
      currentBranchId: matchingBranch ? matchingBranch.id : null,
      currentBranch: matchingBranch || null,
    });
  },

  switchBranch: (branchId: string, queryClient?: QueryClient) => {
    const { branches, currentBranchId } = get();
    if (currentBranchId === branchId) return;

    const targetBranch = branches.find((b) => b.id === branchId);
    if (!targetBranch) return;

    // Persist choice
    try {
      localStorage.setItem(BRANCH_STORAGE_KEY, branchId);
    } catch {
      // ignore
    }

    set({
      currentBranchId: branchId,
      currentBranch: targetBranch,
    });

    // CRITICAL REQUIREMENT: Clear ALL cached query data on branch change
    // so one branch's data can never appear under another!
    if (queryClient) {
      queryClient.clear();
    }
  },

  clearBranchState: () => {
    try {
      localStorage.removeItem(BRANCH_STORAGE_KEY);
    } catch {
      // ignore
    }
    set({
      currentBranchId: null,
      currentBranch: null,
      branches: [],
    });
  },
}));
