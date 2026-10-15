'use client';

import React, { useId } from 'react';
import { normalizeBDPhone, isValidBDPhone, formatBDPhoneDisplay } from '@/lib/utils/phone';
import { Phone, CheckCircle2 } from 'lucide-react';

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  isError?: boolean;
  showNormalizedHint?: boolean;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value = '',
      onChange,
      isError = false,
      showNormalizedHint = true,
      className = '',
      placeholder = '01XXXXXXXXX',
      ...props
    },
    ref,
  ) => {
    const hintId = useId();
    const normalized = normalizeBDPhone(value);
    const isValid = isValidBDPhone(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (onChange) {
        onChange(raw);
      }
    };

    return (
      <div className="w-full space-y-1">
        <div className="relative flex rounded-lg shadow-sm">
          <div className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold select-none">
            <span className="mr-1">🇧🇩</span> +88
          </div>
          <input
            ref={ref}
            type="tel"
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            className={`
              w-full rounded-r-lg border bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500
              focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-950 transition-colors duration-150
              ${
                isError
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-400/30'
                  : 'border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-400/30'
              }
              ${className}
            `}
            {...props}
          />
          {isValid && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
        </div>

        {showNormalizedHint && value && (
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>
              স্ট্যান্ডার্ড ফরম্যাট: <strong className="font-mono text-slate-700 dark:text-slate-200">{normalized || '-'}</strong>
            </span>
            {isValid ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">বৈধ নম্বর</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">১১ ডিজিট আবশ্যক</span>
            )}
          </div>
        )}
      </div>
    );
  },
);

PhoneInput.displayName = 'PhoneInput';
