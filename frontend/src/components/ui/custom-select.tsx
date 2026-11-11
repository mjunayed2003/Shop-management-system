'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: string;
}

export interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  align?: 'left' | 'right';
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  label,
  size = 'sm',
  className = '',
  triggerClassName = '',
  dropdownClassName = '',
  align = 'left',
  disabled = false,
  icon: TriggerIcon,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      const currentIndex = options.findIndex((opt) => opt.value === value);
      const nextIndex = (currentIndex + 1) % options.length;
      onChange(options[nextIndex].value);
    } else if (e.key === 'ArrowUp' && isOpen) {
      e.preventDefault();
      const currentIndex = options.findIndex((opt) => opt.value === value);
      const prevIndex = (currentIndex - 1 + options.length) % options.length;
      onChange(options[prevIndex].value);
    }
  };

  // Size styling maps
  const sizeClasses = {
    xs: 'h-7 px-2.5 text-[11px] rounded-lg gap-1.5',
    sm: 'h-8 px-3 text-xs rounded-xl gap-2',
    md: 'h-9 px-3.5 text-xs sm:text-sm rounded-xl gap-2.5',
  };

  const SelectedIcon = selectedOption?.icon || TriggerIcon;

  return (
    <div
      className={`relative inline-block select-none ${className}`}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
          {label}
        </span>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between font-bold border transition-all cursor-pointer shadow-2xs
          bg-white dark:bg-slate-900 
          text-slate-800 dark:text-slate-200
          border-slate-200 dark:border-slate-700
          hover:border-[#3b7987] dark:hover:border-[#52a7b7] hover:bg-slate-50 dark:hover:bg-slate-800/80
          focus:outline-none focus:ring-2 focus:ring-[#3b7987]/30 focus:border-[#3b7987]
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeClasses[size]}
          ${isOpen ? 'border-[#3b7987] ring-2 ring-[#3b7987]/20' : ''}
          ${triggerClassName}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5 truncate">
          {SelectedIcon && (
            <SelectedIcon className="w-3.5 h-3.5 text-[#3b7987] dark:text-[#52a7b7] shrink-0" />
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#3b7987] dark:text-[#52a7b7]' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={`
            absolute z-50 mt-1.5 min-w-[140px] max-h-64 overflow-y-auto p-1.5 rounded-xl
            bg-white/95 dark:bg-slate-900/95 backdrop-blur-md
            border border-slate-200/90 dark:border-slate-800
            shadow-xl shadow-slate-900/10 space-y-0.5 animate-in fade-in zoom-in-95 duration-100
            ${align === 'right' ? 'right-0' : 'left-0'}
            ${dropdownClassName}
          `}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            const ItemIcon = opt.icon;

            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold
                  transition-colors text-left cursor-pointer
                  ${
                    isSelected
                      ? 'bg-[#c2d4d4] dark:bg-[#2c4246] text-slate-900 dark:text-slate-50 font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }
                `}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  {ItemIcon && (
                    <ItemIcon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected
                          ? 'text-slate-900 dark:text-slate-50'
                          : 'text-slate-400 group-hover:text-slate-700'
                      }`}
                    />
                  )}
                  <div className="truncate">
                    <p className="truncate leading-tight">{opt.label}</p>
                    {opt.description && (
                      <p className="text-[10px] text-slate-400 font-normal truncate">
                        {opt.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                  {opt.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                      {opt.badge}
                    </span>
                  )}
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-slate-900 dark:text-slate-50 shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

