import React from 'react';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  isError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', isError = false, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`
          w-full rounded-lg border bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-950
          ${
            isError
              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-400/30'
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-500 focus:ring-indigo-400/30'
          }
          disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-400
          ${className}
        `}
        {...props}
      />
    );
  },
);

Textarea.displayName = 'Textarea';
