'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormFieldWrapperProps {
  id?: string;
  label?: string;
  required?: boolean;
  error?: string | { message?: string };
  serverError?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormFieldWrapper: React.FC<FormFieldWrapperProps> = ({
  id,
  label,
  required,
  error,
  serverError,
  hint,
  children,
  className = '',
}) => {
  const errorMessage =
    (typeof error === 'string' ? error : error?.message) || serverError;

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
        >
          {label}
          {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
        </label>
      )}

      <div>{children}</div>

      {errorMessage && (
        <p className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-medium mt-1 animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}

      {!errorMessage && hint && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>
      )}
    </div>
  );
};
