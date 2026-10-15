import { describe, it, expect } from 'vitest';
import { normalizeBDPhone, isValidBDPhone, formatBDPhoneDisplay } from '@/lib/utils/phone';

describe('Bangladesh Phone Normalization and Validation', () => {
  it('normalizes standard 11-digit local phone number', () => {
    expect(normalizeBDPhone('01712345678')).toBe('01712345678');
  });

  it('normalizes +880 international prefix', () => {
    expect(normalizeBDPhone('+8801712345678')).toBe('01712345678');
  });

  it('normalizes 880 prefix without plus', () => {
    expect(normalizeBDPhone('8801712345678')).toBe('01712345678');
  });

  it('removes dashes, spaces and parentheses', () => {
    expect(normalizeBDPhone('01712-345678')).toBe('01712345678');
    expect(normalizeBDPhone('+88 01712 345 678')).toBe('01712345678');
    expect(normalizeBDPhone('(018) 12345678')).toBe('01812345678');
  });

  it('validates genuine BD mobile operator codes (013-019)', () => {
    expect(isValidBDPhone('01712345678')).toBe(true);
    expect(isValidBDPhone('01812345678')).toBe(true);
    expect(isValidBDPhone('01912345678')).toBe(true);
    expect(isValidBDPhone('01312345678')).toBe(true);
    expect(isValidBDPhone('01412345678')).toBe(true);
    expect(isValidBDPhone('01512345678')).toBe(true);
    expect(isValidBDPhone('01612345678')).toBe(true);

    // With prefix
    expect(isValidBDPhone('+8801712345678')).toBe(true);
    expect(isValidBDPhone('8801812345678')).toBe(true);
  });

  it('rejects invalid lengths and non-BD codes', () => {
    expect(isValidBDPhone('01212345678')).toBe(false); // 012 does not exist
    expect(isValidBDPhone('0171234567')).toBe(false); // 10 digits
    expect(isValidBDPhone('017123456789')).toBe(false); // 12 digits
    expect(isValidBDPhone('abcdefghijk')).toBe(false);
  });

  it('formats display format nicely', () => {
    expect(formatBDPhoneDisplay('01712345678')).toBe('01712-345678');
  });
});
