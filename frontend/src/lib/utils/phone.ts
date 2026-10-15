/**
 * Bangladesh Mobile Phone Normalization and Validation
 * Accepted input formats:
 * - 01XXXXXXXXX
 * - +8801XXXXXXXXX
 * - 8801XXXXXXXXX
 * - Formats with spaces or dashes: 01712-345678, +88 01712 345678
 *
 * Normalizes to standard 11-digit local format: 01XXXXXXXXX
 */

export function normalizeBDPhone(input: string): string {
  if (!input) return '';
  // Remove spaces, dashes, parentheses
  let cleaned = input.replace(/[\s\-()]/g, '');

  // Strip leading +
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  // Strip leading 88 if present
  if (cleaned.startsWith('8801')) {
    cleaned = cleaned.slice(2);
  }

  return cleaned;
}

export function isValidBDPhone(input: string): boolean {
  const normalized = normalizeBDPhone(input);
  // Must be 11 digits, starting with 01 followed by 3-9
  return /^01[3-9]\d{8}$/.test(normalized);
}

export function formatBDPhoneDisplay(input: string): string {
  const normalized = normalizeBDPhone(input);
  if (normalized.length !== 11) return input;
  // Format as: 01712-345678
  return `${normalized.slice(0, 5)}-${normalized.slice(5)}`;
}
