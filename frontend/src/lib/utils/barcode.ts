/**
 * Barcode validation and format detection utilities
 */

/**
 * Validates an EAN-13 string (13 digits with correct checksum)
 */
export function isValidEan13(code: string): boolean {
  if (!code || !/^\d{13}$/.test(code)) return false;

  const digits = code.split('').map(Number);
  const checkDigit = digits[12];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += i % 2 === 0 ? digits[i] : digits[i] * 3;
  }

  const remainder = sum % 10;
  const calculatedCheckDigit = remainder === 0 ? 0 : 10 - remainder;

  return calculatedCheckDigit === checkDigit;
}

/**
 * Validates Code 128 (standard ASCII 0-127 printable characters)
 */
export function isValidCode128(code: string): boolean {
  if (!code || code.trim().length === 0) return false;
  // Code 128 supports ASCII values 0-127
  return /^[\x20-\x7E]+$/.test(code);
}

/**
 * Resolves safe barcode format for JsBarcode rendering
 * Falls back to CODE128 if not a valid EAN-13
 */
export function resolveBarcodeFormat(
  code: string,
  preferredFormat?: 'EAN13' | 'CODE128',
): 'EAN13' | 'CODE128' {
  if (preferredFormat === 'EAN13' || (!preferredFormat && isValidEan13(code))) {
    if (isValidEan13(code)) {
      return 'EAN13';
    }
  }
  return 'CODE128';
}
