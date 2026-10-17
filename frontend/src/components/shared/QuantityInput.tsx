'use client';

import React from 'react';
import { Minus, Plus, Info } from 'lucide-react';
import Decimal from 'decimal.js';

export interface QuantityInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | string | null | undefined;
  onChange: (value: number) => void;
  trackIndividually?: boolean;
  allowDecimal?: boolean;
  min?: number;
  max?: number;
  step?: number;
  isError?: boolean;
  showStepButtons?: boolean;
  tooltipText?: string;
}

export const QuantityInput = React.forwardRef<HTMLInputElement, QuantityInputProps>(
  (
    {
      value,
      onChange,
      trackIndividually = false,
      allowDecimal = false,
      min = 0,
      max,
      step,
      isError = false,
      showStepButtons = false,
      tooltipText,
      disabled = false,
      className = '',
      ...rest
    },
    ref,
  ) => {
    // If trackIndividually is true, decimal is never allowed
    const isIntegerOnly = trackIndividually || !allowDecimal;
    const computedStep = step !== undefined ? step : isIntegerOnly ? 1 : 0.1;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputVal = e.target.value.trim();

      if (inputVal === '') {
        onChange(0);
        return;
      }

      if (isIntegerOnly) {
        // Only whole positive numbers
        const clean = inputVal.replace(/[^\d]/g, '');
        let numVal = clean ? parseInt(clean, 10) : 0;
        if (min !== undefined && numVal < min) numVal = min;
        if (max !== undefined && numVal > max) numVal = max;
        onChange(numVal);
      } else {
        try {
          const d = new Decimal(inputVal);
          let numVal = d.toNumber();
          if (min !== undefined && numVal < min) numVal = min;
          if (max !== undefined && numVal > max) numVal = max;
          onChange(numVal);
        } catch {
          // ignore invalid partial inputs
        }
      }
    };

    const handleIncrement = () => {
      if (disabled) return;
      const current = new Decimal(value || 0);
      let next = current.plus(computedStep).toNumber();
      if (isIntegerOnly) next = Math.round(next);
      if (max !== undefined && next > max) next = max;
      onChange(next);
    };

    const handleDecrement = () => {
      if (disabled) return;
      const current = new Decimal(value || 0);
      let next = current.minus(computedStep).toNumber();
      if (isIntegerOnly) next = Math.round(next);
      if (min !== undefined && next < min) next = min;
      onChange(next);
    };

    return (
      <div className="relative inline-flex flex-col">
        <div className="relative inline-flex items-center">
          {showStepButtons && (
            <button
              type="button"
              onClick={handleDecrement}
              disabled={disabled || (min !== undefined && Number(value || 0) <= min)}
              className="h-8 w-8 rounded-l-lg border border-r-0 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="relative">
            <input
              ref={ref}
              type="number"
              step={isIntegerOnly ? '1' : '0.01'}
              min={min}
              max={max}
              value={value ?? ''}
              onChange={handleChange}
              disabled={disabled}
              className={`
                w-24 border bg-white dark:bg-slate-900 px-2.5 py-1.5 text-sm text-center font-mono text-slate-900 dark:text-slate-100
                transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-950
                ${showStepButtons ? 'rounded-none' : 'rounded-lg'}
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

            {trackIndividually && (
              <span
                className="absolute -top-2 -right-2 bg-indigo-600 text-white rounded-full p-0.5 shadow-sm"
                title={tooltipText || 'Tracked individually: each piece gets its own unique barcode (whole numbers only)'}
              >
                <Info className="w-2.5 h-2.5" />
              </span>
            )}
          </div>

          {showStepButtons && (
            <button
              type="button"
              onClick={handleIncrement}
              disabled={disabled || (max !== undefined && Number(value || 0) >= max)}
              className="h-8 w-8 rounded-r-lg border border-l-0 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {trackIndividually && (
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 leading-tight">
            1 barcode / unit
          </span>
        )}
      </div>
    );
  },
);

QuantityInput.displayName = 'QuantityInput';
