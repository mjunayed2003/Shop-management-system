/**
 * Calculates SMS segment count, character count, and detects Unicode/GSM encoding.
 * Standard GSM 7-bit: 160 characters for 1 segment, 153 per concatenated segment.
 * Unicode (Bangla, Emojis, UTF-16): 70 characters for 1 segment, 67 per concatenated segment.
 */
export function calculateSmsSegments(text: string): {
  charCount: number;
  isUnicode: boolean;
  segmentCount: number;
  remainingInSegment: number;
} {
  const charCount = text.length;
  if (charCount === 0) {
    return { charCount: 0, isUnicode: false, segmentCount: 0, remainingInSegment: 160 };
  }

  // Detect non-standard ASCII characters
  const isUnicode = /[^\u0020-\u007E\n\r]/.test(text);

  let segmentCount = 1;
  let remainingInSegment = 0;

  if (isUnicode) {
    if (charCount <= 70) {
      segmentCount = 1;
      remainingInSegment = 70 - charCount;
    } else {
      segmentCount = Math.ceil(charCount / 67);
      const usedInLast = charCount % 67;
      remainingInSegment = usedInLast === 0 ? 0 : 67 - usedInLast;
    }
  } else {
    if (charCount <= 160) {
      segmentCount = 1;
      remainingInSegment = 160 - charCount;
    } else {
      segmentCount = Math.ceil(charCount / 153);
      const usedInLast = charCount % 153;
      remainingInSegment = usedInLast === 0 ? 0 : 153 - usedInLast;
    }
  }

  return {
    charCount,
    isUnicode,
    segmentCount,
    remainingInSegment,
  };
}

/**
 * Sanitizes a string for CSV export to prevent Formula Injection (CSV Injection).
 * Prefix cells starting with =, +, -, @, or tab/carriage return with a single quote.
 */
export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}
