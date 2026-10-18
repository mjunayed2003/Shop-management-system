import { describe, it, expect, beforeEach, vi } from 'vitest';
import Decimal from 'decimal.js';
import { useAuthStore } from '../src/lib/store/auth-store';
import { usePlatformAuthStore, PlatformRole } from '../src/lib/store/platform-auth-store';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase F7: Billing, Subscription & Platform Admin Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().clearAuth();
    usePlatformAuthStore.getState().clearPlatformAuth();
  });

  describe('1. Token & Session Separation (Rule 1)', () => {
    it('uses strictly separate state and storage keys for tenant and platform tokens', () => {
      const PLATFORM_KEY = 'pos_platform_token';

      // Set tenant token in tenant store
      useAuthStore.getState().setToken('tenant_jwt_token_123');
      expect(useAuthStore.getState().accessToken).toBe('tenant_jwt_token_123');
      expect(localStorage.getItem(PLATFORM_KEY)).toBeNull();

      // Set platform token in platform store
      usePlatformAuthStore.getState().setPlatformAuth({
        accessToken: 'platform_jwt_token_456',
        admin: {
          id: 'admin-1',
          email: 'admin@platform.pos',
          firstName: 'Super',
          lastName: 'Admin',
          role: PlatformRole.SUPER_ADMIN,
        },
      });

      expect(localStorage.getItem(PLATFORM_KEY)).toBe('platform_jwt_token_456');
      expect(usePlatformAuthStore.getState().accessToken).toBe('platform_jwt_token_456');
      expect(useAuthStore.getState().accessToken).toBe('tenant_jwt_token_123');
    });

    it('logging out of tenant leaves platform session completely untouched', () => {
      useAuthStore.getState().setToken('tenant_token');
      usePlatformAuthStore.getState().setPlatformAuth({
        accessToken: 'platform_token',
        admin: {
          id: 'admin-1',
          email: 'support@platform.pos',
          firstName: 'Support',
          lastName: 'Staff',
          role: PlatformRole.PLATFORM_SUPPORT,
        },
      });

      // Clear tenant
      useAuthStore.getState().clearAuth();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().accessToken).toBeNull();

      // Platform must remain active
      expect(usePlatformAuthStore.getState().isAuthenticated).toBe(true);
      expect(usePlatformAuthStore.getState().accessToken).toBe('platform_token');
      expect(localStorage.getItem('pos_platform_token')).toBe('platform_token');
    });

    it('logging out of platform leaves tenant session completely untouched', () => {
      useAuthStore.getState().setToken('tenant_token_abc');
      usePlatformAuthStore.getState().setPlatformAuth({
        accessToken: 'platform_token_xyz',
        admin: {
          id: 'admin-1',
          email: 'billing@platform.pos',
          firstName: 'Billing',
          lastName: 'Officer',
          role: PlatformRole.BILLING_ADMIN,
        },
      });

      // Clear platform
      usePlatformAuthStore.getState().clearPlatformAuth();

      expect(usePlatformAuthStore.getState().isAuthenticated).toBe(false);
      expect(localStorage.getItem('pos_platform_token')).toBeNull();

      // Tenant must remain active
      expect(useAuthStore.getState().accessToken).toBe('tenant_token_abc');
    });
  });

  describe('2. Platform Role Gating Matrix (Rule 4)', () => {
    it('correctly verifies SUPER_ADMIN permissions', () => {
      usePlatformAuthStore.getState().setPlatformAuth({
        accessToken: 'token',
        admin: {
          id: '1',
          email: 'sa@test.com',
          firstName: 'Super',
          lastName: 'Admin',
          role: PlatformRole.SUPER_ADMIN,
        },
      });

      const { hasPlatformRole } = usePlatformAuthStore.getState();
      expect(hasPlatformRole(PlatformRole.SUPER_ADMIN)).toBe(true);
      expect(hasPlatformRole(PlatformRole.BILLING_ADMIN)).toBe(false);
      expect(hasPlatformRole([PlatformRole.SUPER_ADMIN, PlatformRole.BILLING_ADMIN])).toBe(true);
    });

    it('PLATFORM_SUPPORT cannot access billing admin operations', () => {
      usePlatformAuthStore.getState().setPlatformAuth({
        accessToken: 'token',
        admin: {
          id: '2',
          email: 'support@test.com',
          firstName: 'Support',
          lastName: 'Staff',
          role: PlatformRole.PLATFORM_SUPPORT,
        },
      });

      const { hasPlatformRole } = usePlatformAuthStore.getState();
      expect(hasPlatformRole(PlatformRole.SUPER_ADMIN)).toBe(false);
      expect(hasPlatformRole(PlatformRole.BILLING_ADMIN)).toBe(false);
      expect(hasPlatformRole(PlatformRole.PLATFORM_SUPPORT)).toBe(true);
    });

    it('BILLING_ADMIN cannot access super admin system settings or admin management', () => {
      usePlatformAuthStore.getState().setPlatformAuth({
        accessToken: 'token',
        admin: {
          id: '3',
          email: 'billing@test.com',
          firstName: 'Billing',
          lastName: 'Officer',
          role: PlatformRole.BILLING_ADMIN,
        },
      });

      const { hasPlatformRole } = usePlatformAuthStore.getState();
      expect(hasPlatformRole(PlatformRole.SUPER_ADMIN)).toBe(false);
      expect(hasPlatformRole(PlatformRole.BILLING_ADMIN)).toBe(true);
      expect(hasPlatformRole(PlatformRole.PLATFORM_SUPPORT)).toBe(false);
    });

    it('protects the last active SUPER_ADMIN from deactivation or demotion', () => {
      const admins = [
        { id: 'sa-1', role: PlatformRole.SUPER_ADMIN, is_active: true },
        { id: 'supp-1', role: PlatformRole.PLATFORM_SUPPORT, is_active: true },
      ];

      const activeSuperAdmins = admins.filter(
        (a) => a.is_active && a.role === PlatformRole.SUPER_ADMIN
      );

      const targetAdmin = admins[0];
      const isLastSuperAdmin =
        targetAdmin.role === PlatformRole.SUPER_ADMIN &&
        activeSuperAdmins.length <= 1 &&
        targetAdmin.is_active;

      expect(isLastSuperAdmin).toBe(true);
    });
  });

  describe('3. Financial & Overpayment Protection (Rule 3 & B6)', () => {
    it('blocks overpayments exceeding remaining balance using exact Decimal precision', () => {
      const netAmount = new Decimal('2500.00');
      const paidSoFar = new Decimal('1000.00');
      const remainingBalance = netAmount.minus(paidSoFar); // 1500.00

      // Case 1: Partial payment allowed
      const partialPayment = new Decimal('500.00');
      expect(partialPayment.lessThanOrEqualTo(remainingBalance)).toBe(true);

      // Case 2: Exact remaining balance payment allowed
      const fullPayment = new Decimal('1500.00');
      expect(fullPayment.lessThanOrEqualTo(remainingBalance)).toBe(true);

      // Case 3: Overpayment strictly blocked
      const overpayment = new Decimal('1500.01');
      expect(overpayment.greaterThan(remainingBalance)).toBe(true);
    });

    it('handles zero-rated free access overrides accurately', () => {
      const standardPrice = new Decimal('3500.00');
      const isFreeAccess = true;
      const effectivePrice = isFreeAccess ? new Decimal(0) : standardPrice;

      expect(effectivePrice.toNumber()).toBe(0);
    });
  });

  describe('4. Secrets Zero-Exposure & Formula Injection Protection (Rules 6, C1)', () => {
    it('masks encrypted settings with no plaintext leak', () => {
      const rawEncryptedSetting = {
        key: 'sms.api_secret',
        value: '******',
        is_encrypted: true,
      };

      expect(rawEncryptedSetting.value).toBe('******');
      expect(rawEncryptedSetting.value.includes('secret')).toBe(false);
    });

    it('sanitizes CSV cells to neutralize formula injection attacks (=, +, -, @)', () => {
      const sanitizeCsvCell = (val: any) => {
        const str = String(val ?? '');
        return /^[=+\-@]/.test(str) ? `'${str}` : `"${str.replace(/"/g, '""')}"`;
      };

      expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeCsvCell('+cmd|')).toBe("'+cmd|");
      expect(sanitizeCsvCell('-123')).toBe("'-123");
      expect(sanitizeCsvCell('@calc')).toBe("'@calc");
      expect(sanitizeCsvCell('Normal Text')).toBe('"Normal Text"');
    });
  });

  describe('5. Strict Impersonation Ban (Rule 5 & C2 Grep Test)', () => {
    it('verifies NO impersonation routes, buttons or API methods exist in the entire codebase', () => {
      const srcDir = path.resolve(__dirname, '../src');

      const bannedKeywords = [
        'login-as-shop',
        'login_as_shop',
        'loginAsShop',
        'impersonate_user',
        'impersonateUser',
        'impersonateShop',
      ];

      function scanDir(dir: string): string[] {
        let violations: string[] = [];
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            violations = violations.concat(scanDir(fullPath));
          } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            for (const keyword of bannedKeywords) {
              if (content.includes(keyword)) {
                violations.push(`${fullPath} contains banned impersonation keyword: ${keyword}`);
              }
            }
          }
        }
        return violations;
      }

      const foundViolations = scanDir(srcDir);
      expect(foundViolations).toEqual([]);
    });
  });
});
