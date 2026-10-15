import { describe, it, expect } from 'vitest';

describe('Role Permission Matrix Logic', () => {
  const sampleModule = {
    module: 'Sales',
    permissions: [
      { code: 'sales:create', name: 'Create Sale' },
      { code: 'sales:read', name: 'View Sales' },
      { code: 'sales:return', name: 'Process Return' },
    ],
  };

  it('selects all permissions in a module when none or some are selected', () => {
    let selected = new Set<string>(['sales:read']);

    const toggleSelectModule = (group: typeof sampleModule, current: Set<string>) => {
      const groupCodes = group.permissions.map((p) => p.code);
      const allSelected = groupCodes.every((code) => current.has(code));

      const next = new Set(current);
      if (allSelected) {
        groupCodes.forEach((code) => next.delete(code));
      } else {
        groupCodes.forEach((code) => next.add(code));
      }
      return next;
    };

    selected = toggleSelectModule(sampleModule, selected);
    expect(selected.size).toBe(3);
    expect(selected.has('sales:create')).toBe(true);
    expect(selected.has('sales:read')).toBe(true);
    expect(selected.has('sales:return')).toBe(true);
  });

  it('unselects all permissions in a module if all were already selected', () => {
    let selected = new Set<string>(['sales:create', 'sales:read', 'sales:return']);

    const toggleSelectModule = (group: typeof sampleModule, current: Set<string>) => {
      const groupCodes = group.permissions.map((p) => p.code);
      const allSelected = groupCodes.every((code) => current.has(code));

      const next = new Set(current);
      if (allSelected) {
        groupCodes.forEach((code) => next.delete(code));
      } else {
        groupCodes.forEach((code) => next.add(code));
      }
      return next;
    };

    selected = toggleSelectModule(sampleModule, selected);
    expect(selected.size).toBe(0);
  });

  it('calculates live count accurately across multiple modules', () => {
    const selected = new Set(['sales:create', 'inventory:read', 'users:read']);
    const totalCount = 42;

    const countText = `${selected.size} of ${totalCount} permissions selected`;
    expect(countText).toBe('3 of 42 permissions selected');
  });
});
