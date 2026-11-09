/**
 * Currency & Date formatting utilities
 */

export function formatBDT(
  amount: number | string | { toString(): string } | null | undefined,
  locale: 'bn' | 'en' = 'en',
): string {
  const symbol = locale === 'bn' ? '৳' : 'BDT';
  if (amount === null || amount === undefined) {
    return `${symbol} 0.00`;
  }
  const str = typeof amount === 'object' && amount !== null && 'toString' in amount ? amount.toString() : String(amount);
  const num = Number(str);
  if (isNaN(num)) {
    return `${symbol} 0.00`;
  }
  return `${symbol} ${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateInput: string | Date | null | undefined, locale: 'bn' | 'en' = 'en'): string {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';

  if (locale === 'bn') {
    return date.toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateInput: string | Date | null | undefined, locale: 'bn' | 'en' = 'en'): string {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';

  if (locale === 'bn') {
    return date.toLocaleString('bn-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
