'use client';

import React from 'react';
import Decimal from 'decimal.js';

export interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | string | null | undefined;
  onChange: (value: number) => void;
  currencySymbol?: string;
  isError?: boolean;
  min?: number;
  max?: number;
  allowNegative?: boolean;
  precision?: number;
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    {
      value,
      onChange,
      currencySymbol = '৳',
      isError = false,
      min = 0,
      max,
      allowNegative = false,
      precision = 2,
      disabled = false,
      className = '',
      placeholder = '0.00',
      ...rest
    },
    ref,
  ) => {
    // Formats value cleanly for display
    const formatValue = (val: number | string | null | undefined): string => {
      if (val === null || val === undefined || val === '') return '';
      return String(val);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputVal = e.target.value.trim();

      if (inputVal === '') {
        onChange(0);
        return;
      }

      // Regex validation for money input
      const regex = allowNegative
        ? /^-?\d*(\.\d{0,2})?$/
        : /^\d*(\.\d{0,2})?$/;

      if (!regex.test(inputVal)) {
        return;
      }

      try {
        const d = new Decimal(inputVal);
        let numVal = d.toNumber();

        if (!allowNegative && numVal < min) {
          numVal = min;
        }

        if (max !== undefined && numVal > max) {
          numVal = max;
        }

        onChange(numVal);
      } catch {
        // If incomplete input like "-" or "." wait for next key
      }
    };

    return (
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-medium text-xs select-none">
          {currencySymbol}
        </div>
        <input
          ref={ref}
          type="number"
          step="0.01"
          min={allowNegative ? undefined : min}
          max={max}
          value={value ?? ''}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            w-full rounded-lg border bg-white dark:bg-slate-900 pl-8 pr-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500
            transition-colors duration-150 font-mono text-right
            focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-950
            ${
              isError
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-400/30'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus:border-emerald-500 focus:ring-emerald-400/30'
            }
            disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-400
            ${className}
          `}
          {...rest}
        />
      </div>
    );
  },
);

MoneyInput.displayName = 'MoneyInput';
