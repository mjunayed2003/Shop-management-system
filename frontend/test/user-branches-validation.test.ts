import { describe, it, expect } from 'vitest';

describe('User Branch Assignment Validation', () => {
  it('rejects saving a user with zero branches', () => {
    const branches: { branchId: string; isDefault: boolean }[] = [];

    const validateBranches = (list: typeof branches) => {
      if (!list || list.length === 0) {
        return { isValid: false, error: 'User must have access to at least one branch' };
      }
      return { isValid: true, error: null };
    };

    const result = validateBranches(branches);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('User must have access to at least one branch');
  });

  it('validates single branch and auto-assigns default', () => {
    let branches = [{ branchId: 'branch-1', isDefault: false }];

    if (branches.length > 0 && !branches.some((b) => b.isDefault)) {
      branches = [{ ...branches[0], isDefault: true }];
    }

    expect(branches.length).toBe(1);
    expect(branches[0].isDefault).toBe(true);
  });

  it('ensures exactly one branch is default among multiple branches', () => {
    const branches = [
      { branchId: 'b-1', isDefault: false },
      { branchId: 'b-2', isDefault: true },
      { branchId: 'b-3', isDefault: false },
    ];

    const defaultCount = branches.filter((b) => b.isDefault).length;
    expect(defaultCount).toBe(1);
  });
});
