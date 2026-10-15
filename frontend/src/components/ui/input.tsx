import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isError?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', isError = false, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={`
            w-full rounded-lg border bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-950
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${
              isError
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-400/30'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus:border-emerald-500 focus:ring-emerald-400/30'
            }
            disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-400
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-slate-500">
            {rightIcon}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
